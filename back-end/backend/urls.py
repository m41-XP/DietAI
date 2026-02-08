from django.contrib import admin
from django.urls import path, include
from users.views import RegisterView, LogoutView, GoogleAuthView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/register/', RegisterView.as_view(), name='register'),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/logout/', LogoutView.as_view(), name='logout'),
    path('api/auth/google/', GoogleAuthView.as_view(), name='google_auth'),
    path('api/', include('scanner.urls')),
]
