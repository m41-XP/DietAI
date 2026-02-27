import random
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone
from datetime import timedelta


class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_email_verified', True)
        return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractUser):
    username = None  # Remove username field
    email = models.EmailField(unique=True)
    google_id = models.CharField(max_length=255, blank=True, null=True, unique=True)
    auth_provider = models.CharField(
        max_length=20,
        choices=[('email', 'Email'), ('google', 'Google')],
        default='email',
    )

    # Email verification
    is_email_verified = models.BooleanField(default=False)
    email_verification_code = models.CharField(max_length=6, blank=True, null=True)
    email_verification_expires = models.DateTimeField(blank=True, null=True)

    # Password reset
    password_reset_code = models.CharField(max_length=6, blank=True, null=True)
    password_reset_expires = models.DateTimeField(blank=True, null=True)

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    def generate_verification_code(self):
        self.email_verification_code = f'{random.randint(100000, 999999)}'
        self.email_verification_expires = timezone.now() + timedelta(minutes=10)
        self.save(update_fields=['email_verification_code', 'email_verification_expires'])
        return self.email_verification_code

    def is_verification_code_valid(self, code):
        if not self.email_verification_code or not self.email_verification_expires:
            return False
        if self.email_verification_expires < timezone.now():
            return False
        return self.email_verification_code == code

    def generate_password_reset_code(self):
        self.password_reset_code = f'{random.randint(100000, 999999)}'
        self.password_reset_expires = timezone.now() + timedelta(minutes=10)
        self.save(update_fields=['password_reset_code', 'password_reset_expires'])
        return self.password_reset_code

    def is_password_reset_code_valid(self, code):
        if not self.password_reset_code or not self.password_reset_expires:
            return False
        if self.password_reset_expires < timezone.now():
            return False
        return self.password_reset_code == code

    def __str__(self):
        return self.email
