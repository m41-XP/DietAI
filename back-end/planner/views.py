import datetime
import logging

import requests
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import UserProfile, FavoriteMeal, MealPlan, FoodLog, WeightLog, WeeklyCheckIn
from .serializers import (
    UserProfileSerializer, FavoriteMealSerializer,
    MealPlanSerializer, FoodLogSerializer,
    WeightLogSerializer, WeeklyCheckInSerializer,
)
from scanner.spoonacular_service import (
    generate_meal_plan_spoonacular,
    search_recipe,
    MEAL_SPLITS,
)

# Simple in-process image URL cache so repeated requests for the same meal
# name don't hit Pexels again (cache lives as long as the Django process).
_pexels_cache: dict = {}

logger = logging.getLogger(__name__)


# ── Profile ────────────────────────────────────────────────────────────────────

class UserProfileView(APIView):
    """GET/POST /api/planner/profile/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            profile = request.user.profile
            return Response(UserProfileSerializer(profile).data)
        except UserProfile.DoesNotExist:
            return Response({'detail': 'Profile not found.'}, status=404)

    def post(self, request):
        try:
            profile = request.user.profile
            serializer = UserProfileSerializer(profile, data=request.data, partial=True)
        except UserProfile.DoesNotExist:
            serializer = UserProfileSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data)
        return Response(serializer.errors, status=400)


# ── Stats ──────────────────────────────────────────────────────────────────────

class DailyStatsView(APIView):
    """GET /api/planner/stats/?date=YYYY-MM-DD"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        date_str = request.query_params.get('date')
        try:
            date = datetime.date.fromisoformat(date_str) if date_str else datetime.date.today()
        except ValueError:
            date = datetime.date.today()

        logs = FoodLog.objects.filter(user=request.user, date=date)
        consumed_calories = sum(l.calories for l in logs)
        consumed_protein = sum(l.protein_g or 0 for l in logs)
        consumed_carbs = sum(l.carbs_g or 0 for l in logs)
        consumed_fat = sum(l.fat_g or 0 for l in logs)

        try:
            profile = request.user.profile
            goal_calories = profile.daily_calories
            goal_protein = profile.daily_protein_g
            goal_carbs = profile.daily_carbs_g
            goal_fat = profile.daily_fat_g
        except UserProfile.DoesNotExist:
            goal_calories, goal_protein, goal_carbs, goal_fat = 2000, 150, 200, 65

        return Response({
            'date': date.isoformat(),
            'consumed_calories': round(consumed_calories),
            'remaining_calories': max(0, goal_calories - round(consumed_calories)),
            'goal_calories': goal_calories,
            'consumed_protein_g': round(consumed_protein, 1),
            'consumed_carbs_g': round(consumed_carbs, 1),
            'consumed_fat_g': round(consumed_fat, 1),
            'goal_protein_g': goal_protein,
            'goal_carbs_g': goal_carbs,
            'goal_fat_g': goal_fat,
        })


# ── Favorites ──────────────────────────────────────────────────────────────────

class FavoriteMealListView(APIView):
    """GET/POST /api/planner/favorites/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        meal_type = request.query_params.get('meal_type')
        qs = FavoriteMeal.objects.filter(user=request.user)
        if meal_type:
            qs = qs.filter(preferred_meal_type__in=[meal_type, 'any'])
        return Response(FavoriteMealSerializer(qs, many=True).data)

    def post(self, request):
        serializer = FavoriteMealSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)


class FavoriteMealDetailView(APIView):
    """DELETE /api/planner/favorites/<pk>/"""
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            fav = FavoriteMeal.objects.get(pk=pk, user=request.user)
            fav.delete()
            return Response(status=204)
        except FavoriteMeal.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)


# ── Meal Plan (weekly) ─────────────────────────────────────────────────────────

class WeekMealPlanView(APIView):
    """GET /api/planner/plan/week/?start=YYYY-MM-DD  (Monday of the week)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        start_str = request.query_params.get('start')
        try:
            week_start = datetime.date.fromisoformat(start_str) if start_str else _monday()
        except ValueError:
            week_start = _monday()

        plans = MealPlan.objects.filter(
            user=request.user,
            week_start_date=week_start,
        )
        return Response(MealPlanSerializer(plans, many=True).data)


class GenerateWeekPlanView(APIView):
    """POST /api/planner/plan/week/generate/  body: {start?: "YYYY-MM-DD"}"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            profile = request.user.profile
        except UserProfile.DoesNotExist:
            return Response({'detail': 'Complete your profile first.'}, status=400)

        start_str = request.data.get('start')
        try:
            week_start = datetime.date.fromisoformat(start_str) if start_str else _monday()
        except ValueError:
            week_start = _monday()

        rating = request.data.get('rating', '')  # 'up' | 'down' | ''

        # Fetch user favorites for context
        favorites = list(
            FavoriteMeal.objects.filter(user=request.user)
            .values('name', 'calories', 'preferred_meal_type')
        )

        try:
            days_data = generate_meal_plan_spoonacular(
                daily_calories=profile.daily_calories,
                protein_g=profile.daily_protein_g,
                carbs_g=profile.daily_carbs_g,
                fat_g=profile.daily_fat_g,
                diet_type=profile.diet_type,
                goal=profile.goal,
                nationality=profile.nationality,
                favorites=favorites,
                days=7,
                rating=rating,
            )
        except Exception as e:
            logger.error("Week plan generation failed: %s", e)
            return Response({'detail': 'Plan generation failed. Please try again.'}, status=503)

        created_plans = []
        for i, day_data in enumerate(days_data[:7]):
            day_date = week_start + datetime.timedelta(days=i)
            total = (
                day_data.get('breakfast', {}).get('calories', 0) +
                day_data.get('lunch', {}).get('calories', 0) +
                day_data.get('dinner', {}).get('calories', 0) +
                sum(s.get('calories', 0) for s in (day_data.get('snacks') or []))
            )
            plan, _ = MealPlan.objects.update_or_create(
                user=request.user,
                date=day_date,
                defaults={
                    'week_start_date': week_start,
                    'breakfast': day_data.get('breakfast', {}),
                    'lunch': day_data.get('lunch', {}),
                    'dinner': day_data.get('dinner', {}),
                    'snacks': day_data.get('snacks', []),
                    'total_calories': total,
                },
            )
            created_plans.append(plan)

        return Response(MealPlanSerializer(created_plans, many=True).data)


class RegenerateMealSlotView(APIView):
    """POST /api/planner/plan/<date>/slot/  body: {slot: "breakfast"|"lunch"|"dinner"|"snack"}"""
    permission_classes = [IsAuthenticated]

    def post(self, request, date_str):
        try:
            date = datetime.date.fromisoformat(date_str)
        except ValueError:
            return Response({'detail': 'Invalid date.'}, status=400)

        slot = request.data.get('slot', '').lower()
        if slot not in ('breakfast', 'lunch', 'dinner', 'snacks'):
            return Response({'detail': 'slot must be breakfast, lunch, dinner, or snacks.'}, status=400)

        try:
            profile = request.user.profile
        except UserProfile.DoesNotExist:
            return Response({'detail': 'Complete your profile first.'}, status=400)

        try:
            plan = MealPlan.objects.get(user=request.user, date=date)
        except MealPlan.DoesNotExist:
            return Response({'detail': 'No plan for this date.'}, status=404)

        # Fetch a single recipe for this slot from Spoonacular
        sp_slot = 'snack' if slot == 'snacks' else slot
        target_cal = round(profile.daily_calories * MEAL_SPLITS.get(sp_slot, 0.10))
        try:
            new_recipe = search_recipe(
                meal_type=sp_slot,
                target_calories=target_cal,
                nationality=profile.nationality,
                diet_type=profile.diet_type,
            )
            if new_recipe is None:
                new_recipe = search_recipe(meal_type=sp_slot, target_calories=target_cal)
            if new_recipe is None:
                return Response({'detail': 'No recipe found. Try again.'}, status=503)
        except Exception as e:
            logger.error("Slot regeneration failed: %s", e)
            return Response({'detail': 'Recipe search failed. Please try again.'}, status=503)

        new_slot_value = [new_recipe] if slot == 'snacks' else new_recipe
        setattr(plan, slot, new_slot_value)
        plan.total_calories = (
            plan.breakfast.get('calories', 0) +
            plan.lunch.get('calories', 0) +
            plan.dinner.get('calories', 0) +
            sum(s.get('calories', 0) for s in (plan.snacks or []))
        )
        plan.save()
        return Response(MealPlanSerializer(plan).data)


# ── Food Log ───────────────────────────────────────────────────────────────────

class FoodLogView(APIView):
    """GET/POST /api/planner/log/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        date_str = request.query_params.get('date')
        try:
            date = datetime.date.fromisoformat(date_str) if date_str else datetime.date.today()
        except ValueError:
            date = datetime.date.today()

        logs = FoodLog.objects.filter(user=request.user, date=date)
        return Response(FoodLogSerializer(logs, many=True).data)

    def post(self, request):
        data = request.data.copy()
        if 'date' not in data:
            data['date'] = datetime.date.today().isoformat()
        serializer = FoodLogSerializer(data=data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)


class FoodLogDetailView(APIView):
    """DELETE /api/planner/log/<pk>/"""
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            log = FoodLog.objects.get(pk=pk, user=request.user)
            log.delete()
            return Response(status=204)
        except FoodLog.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=404)


# ── Weight Log ─────────────────────────────────────────────────────────────────

class WeightLogView(APIView):
    """GET/POST /api/planner/weight/"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        logs = WeightLog.objects.filter(user=request.user)
        return Response(WeightLogSerializer(logs, many=True).data)

    def post(self, request):
        data = request.data.copy()
        if 'date' not in data:
            data['date'] = datetime.date.today().isoformat()

        # Upsert: update today's entry if it exists
        try:
            existing = WeightLog.objects.get(user=request.user, date=data['date'])
            serializer = WeightLogSerializer(existing, data=data, partial=True)
        except WeightLog.DoesNotExist:
            serializer = WeightLogSerializer(data=data)

        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)


# ── Weekly Check-in ────────────────────────────────────────────────────────────

class WeeklyCheckInView(APIView):
    """
    GET  /api/planner/checkin/latest/  — latest check-in
    POST /api/planner/checkin/         — submit check-in: {week_start, logged_weight_kg}
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            checkin = WeeklyCheckIn.objects.filter(user=request.user).latest('week_start')
            return Response(WeeklyCheckInSerializer(checkin).data)
        except WeeklyCheckIn.DoesNotExist:
            return Response({'detail': 'No check-ins yet.'}, status=404)

    def post(self, request):
        try:
            profile = request.user.profile
        except UserProfile.DoesNotExist:
            return Response({'detail': 'Complete your profile first.'}, status=400)

        week_start_str = request.data.get('week_start')
        logged_weight = request.data.get('logged_weight_kg')
        if not week_start_str or logged_weight is None:
            return Response({'detail': 'week_start and logged_weight_kg are required.'}, status=400)

        try:
            week_start = datetime.date.fromisoformat(week_start_str)
            logged_weight = float(logged_weight)
        except (ValueError, TypeError):
            return Response({'detail': 'Invalid data.'}, status=400)

        # Determine start weight: last check-in weight, or profile baseline
        try:
            prev = WeeklyCheckIn.objects.filter(
                user=request.user, week_start__lt=week_start
            ).latest('week_start')
            start_weight = prev.logged_weight_kg
        except WeeklyCheckIn.DoesNotExist:
            start_weight = profile.last_checkin_weight_kg or profile.weight_kg

        actual_change = round(logged_weight - start_weight, 2)

        # Expected change from goal/pace
        goal_lower = profile.goal.lower()
        pace = profile.weekly_pace_kg
        if 'lose' in goal_lower:
            expected_change = -pace
        elif 'gain' in goal_lower:
            expected_change = pace
        else:
            expected_change = 0.0

        # Verdict + calorie adjustment — based purely on weight change vs expected
        gap = actual_change - expected_change
        if 'maintain' in goal_lower:
            if gap < -0.2:
                verdict = 'adjust_down'
                adjustment = -100
            elif gap > 0.2:
                verdict = 'adjust_up'
                adjustment = 100
            else:
                verdict = 'on_track'
                adjustment = 0
        elif 'lose' in goal_lower:
            # For lose: expected < 0, actual should also be < 0
            if actual_change > expected_change + 0.15:  # not losing fast enough
                verdict = 'adjust_down'
                adjustment = -150
            elif actual_change < expected_change - 0.15:  # losing too fast
                verdict = 'adjust_up'
                adjustment = 100
            else:
                verdict = 'on_track'
                adjustment = 0
        else:  # gain
            if actual_change < expected_change - 0.15:
                verdict = 'adjust_up'
                adjustment = 150
            elif actual_change > expected_change + 0.15:
                verdict = 'adjust_down'
                adjustment = -100
            else:
                verdict = 'on_track'
                adjustment = 0

        # Cap adjustment at ±200 kcal
        adjustment = max(-200, min(200, adjustment))
        new_daily_calories = max(1200, profile.daily_calories + adjustment)

        checkin, _ = WeeklyCheckIn.objects.update_or_create(
            user=request.user,
            week_start=week_start,
            defaults={
                'logged_weight_kg': logged_weight,
                'start_weight_kg': start_weight,
                'actual_change_kg': actual_change,
                'expected_change_kg': expected_change,
                'adherence_pct': 0,
                'calorie_adjustment': adjustment,
                'new_daily_calories': new_daily_calories,
                'verdict': verdict,
            },
        )

        # Update profile baseline
        profile.last_checkin_date = week_start + datetime.timedelta(days=6)
        profile.last_checkin_weight_kg = logged_weight
        if adjustment != 0:
            profile.daily_calories = new_daily_calories
            # Recalculate macros from the new calorie target
            from .models import compute_macros
            profile.daily_protein_g, profile.daily_carbs_g, profile.daily_fat_g = (
                compute_macros(new_daily_calories, profile.diet_type)
            )
        profile.save(update_fields=[
            'last_checkin_date', 'last_checkin_weight_kg',
            'daily_calories', 'daily_protein_g', 'daily_carbs_g', 'daily_fat_g',
            'updated_at',
        ])

        return Response(WeeklyCheckInSerializer(checkin).data, status=201)


# ── Progress ───────────────────────────────────────────────────────────────────

class ProgressView(APIView):
    """GET /api/planner/progress/  — weight trend + adherence + goal projection"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            profile = request.user.profile
        except UserProfile.DoesNotExist:
            return Response({'detail': 'Profile not found.'}, status=404)

        weight_logs = list(
            WeightLog.objects.filter(user=request.user).order_by('date').values('date', 'weight_kg')
        )

        checkins = list(
            WeeklyCheckIn.objects.filter(user=request.user).order_by('-week_start')
            .values('week_start', 'verdict', 'adherence_pct', 'actual_change_kg', 'expected_change_kg')[:8]
        )

        # Project goal completion date
        projected_date = None
        if profile.target_weight_kg and weight_logs:
            current_weight = weight_logs[-1]['weight_kg']
            remaining_kg = abs(profile.target_weight_kg - current_weight)
            weekly_pace = profile.weekly_pace_kg or 0.5
            if weekly_pace > 0 and remaining_kg > 0:
                weeks_needed = remaining_kg / weekly_pace
                projected_date = (
                    datetime.date.today() + datetime.timedelta(weeks=weeks_needed)
                ).isoformat()

        return Response({
            'current_weight_kg': weight_logs[-1]['weight_kg'] if weight_logs else profile.weight_kg,
            'start_weight_kg': profile.weight_kg,
            'target_weight_kg': profile.target_weight_kg,
            'projected_goal_date': projected_date,
            'daily_calories': profile.daily_calories,
            'goal': profile.goal,
            'weight_history': [
                {'date': str(w['date']), 'weight_kg': w['weight_kg']} for w in weight_logs
            ],
            'recent_checkins': checkins,
            'checkin_due': _checkin_due(profile),
        })


# ── Meal Image (Pexels proxy) ──────────────────────────────────────────────────

class MealImageView(APIView):
    """GET /api/planner/meal-image/?q=Oatmeal+Bowl  → {url: "https://..."}"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        if not q:
            return Response({'url': None})

        if q in _pexels_cache:
            return Response({'url': _pexels_cache[q]})

        api_key = settings.PEXELS_API_KEY
        if not api_key:
            return Response({'url': None})

        try:
            resp = requests.get(
                'https://api.pexels.com/v1/search',
                params={'query': f'{q} food dish', 'per_page': 1, 'orientation': 'landscape'},
                headers={'Authorization': api_key},
                timeout=5,
            )
            resp.raise_for_status()
            photos = resp.json().get('photos', [])
            url = photos[0]['src']['medium'] if photos else None
            _pexels_cache[q] = url
            return Response({'url': url})
        except Exception as e:
            logger.error("Pexels image fetch failed for %r: %s", q, e)
            return Response({'url': None})


# ── Helpers ────────────────────────────────────────────────────────────────────

def _monday(of: datetime.date = None) -> datetime.date:
    """Return the Monday of the given date's week (default: today)."""
    d = of or datetime.date.today()
    return d - datetime.timedelta(days=d.weekday())


def _checkin_due(profile) -> bool:
    """True if the user hasn't done a check-in in the last 7 days."""
    if not profile.last_checkin_date:
        return False  # new user — let them build a week of data first
    days_since = (datetime.date.today() - profile.last_checkin_date).days
    return days_since >= 7
