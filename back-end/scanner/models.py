from django.db import models
from django.conf import settings


class ScanResult(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='scan_results',
    )
    dish_name = models.CharField(max_length=255)
    calories = models.FloatField()
    kilojoules = models.FloatField()
    confidence = models.CharField(max_length=10)
    ingredients = models.JSONField(default=list)
    scanned_image = models.TextField(blank=True, default='')
    image_fingerprint = models.CharField(max_length=600, blank=True, default='')
    scanned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-scanned_at']

    def __str__(self):
        return f'{self.user.email} — {self.dish_name} ({self.scanned_at:%Y-%m-%d})'


class GeneratedDish(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='generated_dishes',
    )
    dish_name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    calories = models.FloatField(default=0)
    kilojoules = models.FloatField(default=0)
    ingredients = models.JSONField(default=list)
    generated_image = models.TextField(blank=True, default='')
    mime_type = models.CharField(max_length=30, default='image/jpeg')
    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-generated_at']

    def __str__(self):
        return f'{self.user.email} — {self.dish_name} ({self.generated_at:%Y-%m-%d})'
