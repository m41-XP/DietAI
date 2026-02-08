import json
import logging

import google.generativeai as genai
from django.conf import settings

logger = logging.getLogger(__name__)

genai.configure(api_key=settings.GEMINI_API_KEY)

ANALYSIS_PROMPT = """You are a professional nutritionist AI. Analyze the food in this image and provide nutritional estimates.

IMPORTANT RULES:
1. If the image does NOT contain food, respond ONLY with this exact JSON:
   {"error": "no_food_detected", "message": "No food detected in the image. Please take a photo of a meal or food item."}

2. If the image DOES contain food, respond ONLY with valid JSON in this exact format:
   {
     "dish_name": "Name of the dish or food item",
     "calories": <total estimated calories as a number in kcal>,
     "kilojoules": <total estimated energy as a number in kJ>,
     "confidence": "low" | "medium" | "high",
     "ingredients": [
       {"name": "ingredient name", "calories": <estimated calories for this ingredient as a number>}
     ]
   }

GUIDELINES:
- Estimate portion sizes based on visual cues in the image.
- "confidence" should be "high" if the food is clearly identifiable, "medium" if somewhat ambiguous, "low" if very unclear.
- The "calories" field at the top level is the TOTAL for the entire dish/plate.
- Each ingredient's calories should sum approximately to the total.
- Use common serving sizes when in doubt.
- Return ONLY the JSON object. No markdown, no code fences, no extra text."""


def analyze_food_image(image_base64: str, mime_type: str = "image/jpeg") -> dict:
    model = genai.GenerativeModel("gemini-3-flash-preview")

    response = model.generate_content(
        [
            ANALYSIS_PROMPT,
            {
                "mime_type": mime_type,
                "data": image_base64,
            },
        ],
        generation_config=genai.GenerationConfig(
            temperature=0.1,
            max_output_tokens=1024,
        ),
    )

    raw_text = response.text.strip()

    # Strip markdown code fences if Gemini wraps them
    if raw_text.startswith("```"):
        first_newline = raw_text.index("\n")
        raw_text = raw_text[first_newline + 1:]
    if raw_text.endswith("```"):
        raw_text = raw_text[:-3].strip()

    try:
        result = json.loads(raw_text)
    except json.JSONDecodeError as e:
        logger.error("Gemini returned non-JSON response: %s", raw_text[:500])
        raise ValueError(f"Failed to parse Gemini response as JSON: {e}")

    return result
