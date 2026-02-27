from rest_framework import serializers
from .models import UserProfile, FavoriteMeal, MealPlan, FoodLog, WeightLog, WeeklyCheckIn


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = [
            'id', 'age', 'gender', 'height_cm', 'weight_kg',
            'goal', 'target_weight_kg', 'weekly_pace_kg',
            'activity_level', 'diet_type', 'nationality',
            'daily_calories', 'daily_protein_g', 'daily_carbs_g', 'daily_fat_g',
            'last_checkin_date', 'last_checkin_weight_kg',
            'updated_at',
        ]
        read_only_fields = [
            'daily_calories', 'daily_protein_g', 'daily_carbs_g', 'daily_fat_g', 'updated_at',
        ]


class FavoriteMealSerializer(serializers.ModelSerializer):
    class Meta:
        model = FavoriteMeal
        fields = [
            'id', 'name', 'calories', 'protein_g', 'carbs_g', 'fat_g',
            'preferred_meal_type', 'source', 'scan_result',
            'image_base64', 'notes', 'created_at',
        ]
        read_only_fields = ['created_at']


class MealPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = MealPlan
        fields = [
            'id', 'date', 'week_start_date',
            'breakfast', 'lunch', 'dinner', 'snacks',
            'total_calories', 'generated_at',
        ]
        read_only_fields = ['week_start_date', 'generated_at']


class FoodLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodLog
        fields = [
            'id', 'date', 'meal_type', 'dish_name', 'calories',
            'protein_g', 'carbs_g', 'fat_g',
            'scan_result', 'meal_plan', 'is_from_plan',
            'logged_at',
        ]
        read_only_fields = ['logged_at']


class WeightLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeightLog
        fields = ['id', 'date', 'weight_kg', 'note', 'created_at']
        read_only_fields = ['created_at']


class WeeklyCheckInSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeeklyCheckIn
        fields = [
            'id', 'week_start',
            'logged_weight_kg', 'start_weight_kg',
            'actual_change_kg', 'expected_change_kg',
            'adherence_pct', 'calorie_adjustment', 'new_daily_calories',
            'verdict', 'created_at',
        ]
        read_only_fields = [
            'start_weight_kg', 'actual_change_kg', 'expected_change_kg',
            'adherence_pct', 'calorie_adjustment', 'new_daily_calories',
            'verdict', 'created_at',
        ]
