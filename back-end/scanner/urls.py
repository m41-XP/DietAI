from django.urls import path
from .views import FoodScanView

urlpatterns = [
    path('scan/', FoodScanView.as_view(), name='food_scan'),
]
