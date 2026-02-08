import logging

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .gemini_service import analyze_food_image
from .serializers import ScanRequestSerializer, ScanResponseSerializer
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

        return Response(response_serializer.validated_data, status=status.HTTP_200_OK)
