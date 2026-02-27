import base64
import json
import logging

import requests
from google import genai as genai
from google.genai import types as genai_types
from django.conf import settings

logger = logging.getLogger(__name__)

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


CHEF_SYSTEM_PROMPT = """You are SmartPlate's AI Chef — a friendly, knowledgeable cooking assistant and nutritionist.

You help users with:
- Recipe suggestions and step-by-step cooking instructions
- Meal ideas based on available ingredients
- Nutritional advice and healthy eating tips
- Ingredient substitutions
- Cooking techniques and tips

Guidelines:
- Be conversational, warm, and encouraging
- Keep responses focused and practical
- Use simple formatting (short paragraphs, bullet points when listing steps or ingredients)
- If asked about calories or nutrition, give realistic estimates
- If asked something unrelated to food, cooking, or nutrition, politely redirect the conversation back to food topics"""


def chef_chat(message: str, history: list) -> str:
    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    # Build full conversation history as Content objects
    contents = []
    for turn in history:
        contents.append(genai_types.Content(
            role="user", parts=[genai_types.Part(text=turn["user"])]
        ))
        contents.append(genai_types.Content(
            role="model", parts=[genai_types.Part(text=turn["assistant"])]
        ))
    contents.append(genai_types.Content(
        role="user", parts=[genai_types.Part(text=message)]
    ))

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=contents,
        config=genai_types.GenerateContentConfig(
            system_instruction=CHEF_SYSTEM_PROMPT,
            temperature=0.7,
            max_output_tokens=1024,
            thinking_config=genai_types.ThinkingConfig(thinking_budget=0),
        ),
    )
    return response.text.strip()


def analyze_food_image(image_base64: str, mime_type: str = "image/jpeg") -> dict:
    # Use new google.genai SDK — the old google.generativeai silently truncates
    # output on thinking models (gemini-2.5-flash), cutting JSON mid-response.
    # thinking_budget=0 reserves all output tokens for the actual response.
    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    image_bytes = base64.b64decode(image_base64)

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            ANALYSIS_PROMPT,
            genai_types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
        ],
        config=genai_types.GenerateContentConfig(
            temperature=0.1,
            max_output_tokens=2048,
            thinking_config=genai_types.ThinkingConfig(thinking_budget=0),
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


def _parse_pipe_day(raw_text: str) -> dict:
    """
    Parse pipe-delimited 4-line meal plan format.
    Each line: SLOT|name|description|calories|protein_g|carbs_g|fat_g
    """
    slot_map = {
        'BREAKFAST': 'breakfast',
        'LUNCH': 'lunch',
        'DINNER': 'dinner',
        'SNACK': 'snacks',
    }
    result = {}
    for line in raw_text.strip().splitlines():
        line = line.strip()
        if not line:
            continue
        parts = [p.strip() for p in line.split('|')]
        if len(parts) < 7:
            continue
        slot_key = parts[0].upper()
        if slot_key not in slot_map:
            continue
        try:
            meal = {
                'name': parts[1],
                'description': parts[2],
                'calories': int(float(parts[3])),
                'protein_g': float(parts[4]),
                'carbs_g': float(parts[5]),
                'fat_g': float(parts[6]),
            }
        except (ValueError, IndexError):
            continue
        db_slot = slot_map[slot_key]
        if db_slot == 'snacks':
            result[db_slot] = [meal]
        else:
            result[db_slot] = meal

    # Fill any missing slots with safe defaults
    for slot in ('breakfast', 'lunch', 'dinner'):
        if slot not in result:
            result[slot] = {'name': 'TBD', 'description': '', 'calories': 0,
                            'protein_g': 0, 'carbs_g': 0, 'fat_g': 0}
    if 'snacks' not in result:
        result['snacks'] = []
    return result


def generate_meal_plan(daily_calories: int, protein_g: int, carbs_g: int, fat_g: int,
                       diet_type: str, goal: str, nationality: str = '',
                       favorites: list = None, days: int = 7,
                       rating: str = '') -> list:
    """
    Generate a meal plan for `days` days (default 7) in a SINGLE Gemini call.
    Uses pipe-delimited plain text to avoid truncation and stay under rate limits.
    7 days × 4 lines × ~50 chars ≈ 350 tokens → fits in max_output_tokens=512.
    """
    # Use the new google.genai SDK — the deprecated google.generativeai silently
    # truncates output regardless of max_output_tokens, causing TBD/0-kcal results.
    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    nationality_hint = ""
    if nationality and nationality.strip():
        nationality_hint = (
            f"User is {nationality.strip()}. PRIORITIZE traditional {nationality.strip()} dishes "
            f"(use authentic local names). Universal foods (omelette, grilled chicken, pasta, "
            f"yogurt) are also fine. Avoid dishes that clash with the diet type.\n"
        )

    favorites_hint = ""
    if favorites:
        fav_names = [f["name"] for f in favorites[:8]]
        favorites_hint = (
            f"User favourites — include at least 2-3 of these across the week "
            f"if they fit the targets: {', '.join(fav_names)}.\n"
        )

    rating_hint = ""
    if rating == 'up':
        rating_hint = (
            "The user LIKED last week's plan — keep a similar style, "
            "variety, and meal types. Small variations are fine.\n"
        )
    elif rating == 'down':
        rating_hint = (
            "The user did NOT enjoy last week's plan — try DIFFERENT "
            "dishes, cuisines, and meal styles this week. Avoid repeating "
            "the same meals.\n"
        )

    total_lines = days * 4
    prompt = (
        f"Nutritionist task: {days}-day meal plan.\n"
        f"Daily targets: {daily_calories} kcal | {protein_g}g protein | "
        f"{carbs_g}g carbs | {fat_g}g fat.\n"
        f"Diet: {diet_type}. Goal: {goal}.\n"
        f"{nationality_hint}"
        f"{favorites_hint}"
        f"{rating_hint}\n"
        f"Reply with EXACTLY {total_lines} lines, pipe-separated, NO other text.\n"
        f"Format per line: SLOT|meal name|short description|calories|protein_g|carbs_g|fat_g\n"
        f"Slots in order per day: BREAKFAST, LUNCH, DINNER, SNACK. Repeat for each day.\n"
        f"Example (day 1 only):\n"
        f"BREAKFAST|Oatmeal Bowl|Creamy oats with banana and honey.|420|18|70|8\n"
        f"LUNCH|Grilled Chicken Salad|Fresh greens with grilled chicken.|380|42|20|12\n"
        f"DINNER|Salmon with Roasted Veg|Baked salmon with seasonal vegetables.|580|55|30|32\n"
        f"SNACK|Greek Yogurt|Plain yogurt with mixed berries.|130|12|18|2\n"
        f"(continue for all {days} days)\n\n"
        f"Each day total ~{daily_calories} kcal. Numbers only (no units). No markdown."
    )

    # gemini-2.5-flash is a thinking model — disable thinking (thinking_budget=0)
    # so all output tokens go to the actual response, not internal reasoning.
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=genai_types.GenerateContentConfig(
            temperature=0.7,
            max_output_tokens=1024,
            thinking_config=genai_types.ThinkingConfig(thinking_budget=0),
        ),
    )

    try:
        raw = response.text
        logger.warning("Gemini meal plan raw output (%d chars): %s", len(raw), raw[:600])
        meal_lines = [l.strip() for l in raw.strip().splitlines() if l.strip()]
        logger.warning("Parsed %d meal lines (expected %d)", len(meal_lines), total_lines)
        results = []
        for day_idx in range(days):
            chunk = meal_lines[day_idx * 4 : (day_idx + 1) * 4]
            results.append(_parse_pipe_day('\n'.join(chunk)))
        return results
    except Exception as e:
        logger.error("Meal plan parse failed: %s | raw: %s", e, response.text[:400])
        raise ValueError(f"Failed to parse meal plan: {e}")


def generate_dish(ingredients: list, cuisine: str) -> dict:
    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    json_schema = (
        '{\n'
        '  "dish_name": "the dish name",\n'
        '  "description": "one sentence describing the dish",\n'
        '  "calories": <total estimated calories as a number in kcal>,\n'
        '  "kilojoules": <total estimated energy as a number in kJ>,\n'
        '  "ingredients": [\n'
        '    {"name": "ingredient name", "calories": <estimated calories as a number>}\n'
        '  ],\n'
        '  "image_prompt": "a 60-word food photography prompt describing the dish exact colors, textures, plating style, garnishes, background, lighting, and mood"\n'
        '}'
    )
    text_prompt = (
        f"You are a professional chef and nutritionist. "
        f"Suggest a traditional {cuisine} dish using these ingredients: {', '.join(ingredients)}.\n"
        f"Respond with ONLY valid JSON — no markdown, no code fences:\n"
        + json_schema
    )
    text_response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=text_prompt,
        config=genai_types.GenerateContentConfig(
            temperature=0.7,
            max_output_tokens=1024,
            thinking_config=genai_types.ThinkingConfig(thinking_budget=0),
        ),
    )

    raw = text_response.text.strip()
    if raw.startswith("```"):
        first_nl = raw.index("\n")
        raw = raw[first_nl + 1:]
    if raw.endswith("```"):
        raw = raw[:-3].strip()

    try:
        dish_data = json.loads(raw)
    except json.JSONDecodeError:
        logger.error("generate_dish: Gemini returned non-JSON: %s", raw[:300])
        dish_data = {}

    dish_name = dish_data.get("dish_name", "Chef's Special")
    description = dish_data.get("description", "")
    calories = dish_data.get("calories", 0)
    kilojoules = dish_data.get("kilojoules", 0)
    ingredients_nutrition = dish_data.get("ingredients", [])
    image_prompt = dish_data.get("image_prompt") or (
        f"Professional food photography of {dish_name}, {cuisine} cuisine. "
        f"Beautifully plated, garnished with fresh herbs, warm golden lighting, "
        f"shallow depth of field, rustic wooden table, restaurant-quality."
    )

    # Generate image via Hugging Face Inference API (FLUX.1-schnell, free)
    hf_response = requests.post(
        "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell",
        headers={"Authorization": f"Bearer {settings.HF_TOKEN}"},
        json={"inputs": image_prompt},
        timeout=120,
    )
    hf_response.raise_for_status()
    image_base64 = base64.b64encode(hf_response.content).decode("utf-8")
    mime_type = "image/jpeg"

    return {
        "dish_name": dish_name,
        "description": description,
        "calories": calories,
        "kilojoules": kilojoules,
        "ingredients": ingredients_nutrition,
        "image_base64": image_base64,
        "mime_type": mime_type,
    }
