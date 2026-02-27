import datetime
from django.db import models
from django.conf import settings


# ── Calculation helpers ────────────────────────────────────────────────────────

def compute_tdee(age, gender, height_cm, weight_kg, activity_level, goal, weekly_pace_kg):
    """Mifflin-St Jeor BMR → TDEE with activity factor and goal adjustment."""
    gender_lower = (gender or '').lower()
    if gender_lower == 'female':
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161
    else:
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5

    activity_map = {
        'sedentary': 1.2,
        'lightly active': 1.375,
        'very active': 1.725,
    }
    multiplier = activity_map.get((activity_level or '').lower(), 1.375)
    tdee = bmr * multiplier

    pace = float(weekly_pace_kg or 0.5)
    pace_cal = {0.25: 250, 0.5: 500, 1.0: 1000}.get(pace, 250)
    goal_lower = (goal or '').lower()
    if 'lose' in goal_lower:
        tdee -= pace_cal
    elif 'gain' in goal_lower:
        tdee += pace_cal

    return max(1200, round(tdee))


def compute_macros(daily_calories, diet_type):
    """Return (protein_g, carbs_g, fat_g) based on diet type."""
    diet = (diet_type or 'normal').lower()
    if diet == 'keto':
        p, c, f = 0.25, 0.05, 0.70
    elif diet == 'vegan':
        p, c, f = 0.20, 0.55, 0.25
    else:
        p, c, f = 0.30, 0.40, 0.30
    return (
        round(daily_calories * p / 4),
        round(daily_calories * c / 4),
        round(daily_calories * f / 9),
    )


# ── Models ─────────────────────────────────────────────────────────────────────

class UserProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile',
    )
    # Demographics
    age = models.IntegerField()
    gender = models.CharField(max_length=20)
    height_cm = models.FloatField()
    weight_kg = models.FloatField()
    # Goals
    goal = models.CharField(max_length=50)           # Lose Weight / Maintain / Gain Weight
    target_weight_kg = models.FloatField(null=True, blank=True)
    weekly_pace_kg = models.FloatField(default=0.5)  # 0.25 / 0.5 / 1.0
    # Lifestyle
    activity_level = models.CharField(max_length=50)
    diet_type = models.CharField(max_length=20, default='Normal')
    nationality = models.CharField(max_length=100, blank=True, default='')
    # Computed on save
    daily_calories = models.IntegerField(default=2000)
    daily_protein_g = models.IntegerField(default=150)
    daily_carbs_g = models.IntegerField(default=200)
    daily_fat_g = models.IntegerField(default=65)
    # Check-in tracking
    last_checkin_date = models.DateField(null=True, blank=True)
    last_checkin_weight_kg = models.FloatField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        self.daily_calories = compute_tdee(
            self.age, self.gender, self.height_cm, self.weight_kg,
            self.activity_level, self.goal, self.weekly_pace_kg,
        )
        self.daily_protein_g, self.daily_carbs_g, self.daily_fat_g = compute_macros(
            self.daily_calories, self.diet_type,
        )
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.email} — {self.daily_calories} kcal/day"


class FavoriteMeal(models.Model):
    SOURCE_CHOICES = [
        ('scan', 'Scan'),
        ('chef', 'Chef'),
        ('manual', 'Manual'),
    ]
    MEAL_TYPE_CHOICES = [
        ('breakfast', 'Breakfast'),
        ('lunch', 'Lunch'),
        ('dinner', 'Dinner'),
        ('snack', 'Snack'),
        ('any', 'Any'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='favorite_meals',
    )
    name = models.CharField(max_length=200)
    calories = models.IntegerField(default=0)
    protein_g = models.FloatField(default=0)
    carbs_g = models.FloatField(default=0)
    fat_g = models.FloatField(default=0)
    preferred_meal_type = models.CharField(max_length=20, choices=MEAL_TYPE_CHOICES, default='any')
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='manual')
    scan_result = models.ForeignKey(
        'scanner.ScanResult',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='favorites',
    )
    image_base64 = models.TextField(blank=True, default='')
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} ♥ {self.name}"


class MealPlan(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='meal_plans',
    )
    date = models.DateField()
    week_start_date = models.DateField(null=True, blank=True)  # Monday of the week
    breakfast = models.JSONField(default=dict)
    lunch = models.JSONField(default=dict)
    dinner = models.JSONField(default=dict)
    snacks = models.JSONField(default=list)
    total_calories = models.IntegerField(default=0)
    generated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'date')
        ordering = ['date']

    def save(self, *args, **kwargs):
        if not self.week_start_date:
            # Monday of the week this date belongs to
            self.week_start_date = self.date - datetime.timedelta(days=self.date.weekday())
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.email} — plan for {self.date}"


class FoodLog(models.Model):
    MEAL_TYPES = [
        ('breakfast', 'Breakfast'),
        ('lunch', 'Lunch'),
        ('dinner', 'Dinner'),
        ('snack', 'Snack'),
    ]
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='food_logs',
    )
    date = models.DateField()
    meal_type = models.CharField(max_length=20, choices=MEAL_TYPES)
    dish_name = models.CharField(max_length=200)
    calories = models.FloatField()
    protein_g = models.FloatField(null=True, blank=True)
    carbs_g = models.FloatField(null=True, blank=True)
    fat_g = models.FloatField(null=True, blank=True)
    scan_result = models.ForeignKey(
        'scanner.ScanResult',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='food_logs',
    )
    meal_plan = models.ForeignKey(
        MealPlan,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='logs',
    )
    is_from_plan = models.BooleanField(default=False)
    logged_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-logged_at']

    def __str__(self):
        return f"{self.user.email} — {self.dish_name} ({self.date})"


class WeightLog(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='weight_logs',
    )
    date = models.DateField()
    weight_kg = models.FloatField()
    note = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'date')
        ordering = ['-date']

    def __str__(self):
        return f"{self.user.email} — {self.weight_kg} kg on {self.date}"


class WeeklyCheckIn(models.Model):
    VERDICT_CHOICES = [
        ('on_track', 'On Track'),
        ('adjust_down', 'Adjust Down'),
        ('adjust_up', 'Adjust Up'),
        ('poor_adherence', 'Poor Adherence'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='checkins',
    )
    week_start = models.DateField()            # Monday of the reviewed week
    logged_weight_kg = models.FloatField()     # Weight at end of week
    start_weight_kg = models.FloatField()      # Weight at start (prev check-in baseline)
    actual_change_kg = models.FloatField()     # logged - start
    expected_change_kg = models.FloatField()   # from goal pace
    adherence_pct = models.FloatField()        # meals logged / expected * 100
    calorie_adjustment = models.IntegerField(default=0)   # +/- recommended
    new_daily_calories = models.IntegerField()            # adjusted target
    verdict = models.CharField(max_length=20, choices=VERDICT_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'week_start')
        ordering = ['-week_start']

    def __str__(self):
        return f"{self.user.email} — check-in {self.week_start} ({self.verdict})"
