import logging

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .gemini_service import analyze_food_image, chef_chat, generate_dish
from .models import ScanResult, GeneratedDish
from .serializers import (ScanRequestSerializer, ScanResponseSerializer, ScanHistorySerializer,
                           ScanFingerprintSerializer, GeneratedDishSerializer)
from .throttles import ScanAnonRateThrottle, ScanUserRateThrottle

logger = logging.getLogger(__name__)


class FoodScanView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ScanAnonRateThrottle, ScanUserRateThrottle]

    def post(self, request):
        serializer = ScanRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        image_base64 = serializer.validated_data['image_base64']
        mime_type = serializer.validated_data.get('mime_type', 'image/jpeg')

        # ── Duplicate check (server-side, most reliable) ────────────────────
        if request.user and request.user.is_authenticated:
            fingerprint = image_base64[:500]
            if fingerprint:
                existing = ScanResult.objects.filter(
                    user=request.user,
                    image_fingerprint=fingerprint,
                ).exclude(image_fingerprint='').first()
                if existing:
                    return Response({
                        'dish_name': existing.dish_name,
                        'calories': existing.calories,
                        'kilojoules': existing.kilojoules,
                        'confidence': existing.confidence,
                        'ingredients': existing.ingredients,
                        'from_cache': True,
                        'existing_id': existing.id,
                    }, status=status.HTTP_200_OK)

        try:
            result = analyze_food_image(image_base64, mime_type)
        except ValueError:
            return Response(
                {"detail": "Failed to analyze image. Please try a clearer photo."},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        except Exception:
            logger.exception("Gemini API call failed")
            return Response(
                {"detail": "AI service temporarily unavailable. Please try again later."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        if "error" in result:
            return Response(
                {
                    "detail": result.get("message", "No food detected in the image."),
                    "error_code": result.get("error", "no_food_detected"),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        response_serializer = ScanResponseSerializer(data=result)
        if not response_serializer.is_valid():
            logger.error("Gemini returned unexpected structure: %s errors=%s", result, response_serializer.errors)
            return Response(
                {"detail": "Failed to parse nutritional data. Please try again."},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        # Save to history if user is authenticated
        if request.user and request.user.is_authenticated:
            scanned_image = f"data:{mime_type};base64,{image_base64}"
            ScanResult.objects.create(
                user=request.user,
                dish_name=result['dish_name'],
                calories=result['calories'],
                kilojoules=result['kilojoules'],
                confidence=result['confidence'],
                ingredients=result.get('ingredients', []),
                scanned_image=scanned_image,
                image_fingerprint=image_base64[:500],
            )

        return Response(response_serializer.validated_data, status=status.HTTP_200_OK)


class ScanHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk=None):
        if pk is not None:
            scan = ScanResult.objects.filter(user=request.user, pk=pk).first()
            if not scan:
                return Response(status=status.HTTP_404_NOT_FOUND)
            return Response(ScanHistorySerializer(scan).data)
        scans = ScanResult.objects.filter(user=request.user)[:100]
        return Response(ScanHistorySerializer(scans, many=True).data)

    def delete(self, request, pk=None):
        if pk is not None:
            scan = ScanResult.objects.filter(user=request.user, pk=pk).first()
            if not scan:
                return Response(status=status.HTTP_404_NOT_FOUND)
            scan.delete()
        else:
            ScanResult.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ScanFingerprintsView(APIView):
    """Returns a lightweight list of scan fingerprints for duplicate detection."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        scans = ScanResult.objects.filter(user=request.user).only('id', 'dish_name', 'image_fingerprint')
        return Response(ScanFingerprintSerializer(scans, many=True).data)


class ChefChatView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        message = request.data.get('message', '').strip()
        history = request.data.get('history', [])

        if not message:
            return Response(
                {'detail': 'Message is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            reply = chef_chat(message, history)
        except Exception:
            logger.exception("Chef chat failed")
            return Response(
                {'detail': 'AI Chef is temporarily unavailable. Please try again.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response({'reply': reply})


class ChefGenerateView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        ingredients = request.data.get('ingredients', [])
        cuisine = request.data.get('cuisine', '').strip()

        if not ingredients or not cuisine:
            return Response(
                {'detail': 'Ingredients and cuisine are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(ingredients) > 20:
            return Response(
                {'detail': 'Too many ingredients. Please use up to 20.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            result = generate_dish(ingredients, cuisine)
        except Exception:
            logger.exception("Dish generation failed")
            return Response(
                {'detail': 'Failed to generate dish. Please try again.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        if request.user and request.user.is_authenticated:
            GeneratedDish.objects.create(
                user=request.user,
                dish_name=result['dish_name'],
                description=result.get('description', ''),
                calories=result.get('calories', 0),
                kilojoules=result.get('kilojoules', 0),
                ingredients=result.get('ingredients', []),
                generated_image=f"data:{result['mime_type']};base64,{result['image_base64']}",
                mime_type=result['mime_type'],
            )

        return Response(result)


class ChefHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk=None):
        if pk is not None:
            dish = GeneratedDish.objects.filter(user=request.user, pk=pk).first()
            if not dish:
                return Response(status=status.HTTP_404_NOT_FOUND)
            return Response(GeneratedDishSerializer(dish).data)
        dishes = GeneratedDish.objects.filter(user=request.user)[:100]
        return Response(GeneratedDishSerializer(dishes, many=True).data)

    def delete(self, request, pk=None):
        if pk is not None:
            dish = GeneratedDish.objects.filter(user=request.user, pk=pk).first()
            if not dish:
                return Response(status=status.HTTP_404_NOT_FOUND)
            dish.delete()
        else:
            GeneratedDish.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
