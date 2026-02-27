from django.contrib import admin
from django.urls import path, include
from users.views import (
    RegisterView, LoginView, LogoutView,
    GoogleAuthView, MeView,
    VerifyEmailView, ResendVerificationView,
    RequestPasswordResetView, ConfirmPasswordResetView,
)
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/register/', RegisterView.as_view(), name='register'),
    path('api/token/', LoginView.as_view(), name='login'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/logout/', LogoutView.as_view(), name='logout'),
    path('api/me/', MeView.as_view(), name='me'),
    path('api/verify-email/', VerifyEmailView.as_view(), name='verify_email'),
    path('api/resend-verification/', ResendVerificationView.as_view(), name='resend_verification'),
    path('api/password-reset/', RequestPasswordResetView.as_view(), name='password_reset'),
    path('api/password-reset/confirm/', ConfirmPasswordResetView.as_view(), name='password_reset_confirm'),
    path('api/auth/google/', GoogleAuthView.as_view(), name='google_auth'),
    path('api/', include('scanner.urls')),
    path('api/planner/', include('planner.urls')),
]
