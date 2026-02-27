from django.urls import path
from .views import FoodScanView, ScanHistoryView, ScanFingerprintsView, ChefChatView, ChefGenerateView, ChefHistoryView

urlpatterns = [
    path('scan/', FoodScanView.as_view(), name='food_scan'),
    path('scans/', ScanHistoryView.as_view(), name='scan_history'),
    path('scans/<int:pk>/', ScanHistoryView.as_view(), name='scan_delete'),
    path('scan/fingerprints/', ScanFingerprintsView.as_view(), name='scan_fingerprints'),
    path('chef/', ChefChatView.as_view(), name='chef_chat'),
    path('chef/generate/', ChefGenerateView.as_view(), name='chef_generate'),
    path('chef/history/', ChefHistoryView.as_view(), name='chef_history'),
    path('chef/history/<int:pk>/', ChefHistoryView.as_view(), name='chef_history_detail'),
]
