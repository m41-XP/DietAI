from rest_framework import serializers


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
