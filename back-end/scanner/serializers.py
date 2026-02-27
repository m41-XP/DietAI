from rest_framework import serializers
from .models import ScanResult, GeneratedDish


class ScanRequestSerializer(serializers.Serializer):
    image_base64 = serializers.CharField(required=True)
    mime_type = serializers.ChoiceField(
        choices=['image/jpeg', 'image/png', 'image/webp'],
        default='image/jpeg',
    )


class IngredientSerializer(serializers.Serializer):
    name = serializers.CharField()
    calories = serializers.FloatField()


class ScanResponseSerializer(serializers.Serializer):
    dish_name = serializers.CharField()
    calories = serializers.FloatField()
    kilojoules = serializers.FloatField()
    confidence = serializers.CharField()
    ingredients = IngredientSerializer(many=True)


class ScanHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ScanResult
        fields = ['id', 'dish_name', 'calories', 'kilojoules', 'confidence', 'ingredients', 'scanned_image', 'scanned_at']


class ScanFingerprintSerializer(serializers.ModelSerializer):
    """Lightweight serializer for duplicate detection — no heavy image data."""
    class Meta:
        model = ScanResult
        fields = ['id', 'dish_name', 'image_fingerprint']


class GeneratedDishSerializer(serializers.ModelSerializer):
    class Meta:
        model = GeneratedDish
        fields = ['id', 'dish_name', 'description', 'calories', 'kilojoules',
                  'ingredients', 'generated_image', 'mime_type', 'generated_at']
