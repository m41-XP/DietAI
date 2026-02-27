from django.urls import path
from .views import (
    UserProfileView, DailyStatsView,
    FavoriteMealListView, FavoriteMealDetailView,
    WeekMealPlanView, GenerateWeekPlanView, RegenerateMealSlotView,
    FoodLogView, FoodLogDetailView,
    WeightLogView,
    WeeklyCheckInView,
    ProgressView,
    MealImageView,
)

urlpatterns = [
    # Profile & stats
    path('profile/', UserProfileView.as_view(), name='planner_profile'),
    path('stats/', DailyStatsView.as_view(), name='planner_stats'),

    # Favorites
    path('favorites/', FavoriteMealListView.as_view(), name='planner_favorites'),
    path('favorites/<int:pk>/', FavoriteMealDetailView.as_view(), name='planner_favorite_detail'),

    # Weekly meal plan
    path('plan/week/', WeekMealPlanView.as_view(), name='planner_week'),
    path('plan/week/generate/', GenerateWeekPlanView.as_view(), name='planner_week_generate'),
    path('plan/<str:date_str>/slot/', RegenerateMealSlotView.as_view(), name='planner_slot_regen'),

    # Food log
    path('log/', FoodLogView.as_view(), name='planner_log'),
    path('log/<int:pk>/', FoodLogDetailView.as_view(), name='planner_log_detail'),

    # Weight log
    path('weight/', WeightLogView.as_view(), name='planner_weight'),

    # Weekly check-in
    path('checkin/', WeeklyCheckInView.as_view(), name='planner_checkin'),

    # Progress dashboard
    path('progress/', ProgressView.as_view(), name='planner_progress'),

    # Meal image proxy (Pexels)
    path('meal-image/', MealImageView.as_view(), name='planner_meal_image'),
]
