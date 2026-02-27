"""
Gemini-powered meal plan generator.

How it works:
  1. ONE Gemini call  → full 7-day plan (dish names, calories, macros, ingredients,
                         Pexels photo keywords) — smart, practical, culturally aware
  2. PARALLEL Pexels  → images for all 28 meals fetched simultaneously (~1-2 s)
  3. Store in DB       → meal-detail screen reads directly from stored data (no lazy fetch)

Speed: ~5-8 s total vs 30-60 s with the old Edamam approach.
AI:    nationality is a preference, not a prison — Gemini mixes local + international dishes.
"""
import json
import re
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from google import genai as genai_sdk
from google.genai import types as genai_types
from django.conf import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Calorie split (used by views.py — do not rename)
# ---------------------------------------------------------------------------

MEAL_SPLITS = {
    'breakfast': 0.25,
    'lunch':     0.35,
    'dinner':    0.30,
    'snack':     0.10,
}

# ---------------------------------------------------------------------------
# Prompt
# ---------------------------------------------------------------------------

_PLAN_PROMPT = """\
You are a professional nutritionist building a practical, appetizing meal plan.

User profile:
- Cuisine background : {nationality}  (treat as a preference, not a rule)
- Daily calorie goal : {daily_calories} kcal
- Health goal        : {goal}
- Diet type          : {diet_type}

Target calories per meal slot:
  Breakfast ~{breakfast_cal} kcal | Lunch ~{lunch_cal} kcal | \
Dinner ~{dinner_cal} kcal | Snack ~{snack_cal} kcal

Rules:
1. Mix ~60% dishes inspired by {nationality} cuisine with ~40% universally popular dishes \
(pizza, pasta, burgers, sandwiches, salads, stir-fry, sushi, tacos, etc.).
2. ONLY suggest widely recognised dishes — something you'd find on a restaurant menu or \
in a mainstream cookbook. No obscure specialties nobody has heard of.
3. Calories for each meal should be close to the targets above.
4. List 5–8 realistic ingredients per meal.
5. "photo_query": 2–4 words that will reliably return a great food photo on Pexels \
(e.g. "moroccan chicken tagine", "margherita pizza slice", "greek salad bowl").

Return ONLY a valid JSON array with exactly {days} elements — no markdown, no commentary:
[
  {{
    "day": 1,
    "breakfast": {{"name": "...", "calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0,
                   "ingredients": ["..."], "photo_query": "..."}},
    "lunch":     {{"name": "...", "calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0,
                   "ingredients": ["..."], "photo_query": "..."}},
    "dinner":    {{"name": "...", "calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0,
                   "ingredients": ["..."], "photo_query": "..."}},
    "snack":     {{"name": "...", "calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0,
                   "ingredients": ["..."], "photo_query": "..."}}
  }}
]"""

_SINGLE_MEAL_PROMPT = """\
Suggest ONE {slot} meal for someone with {nationality} cuisine preference, \
targeting {calories} kcal, diet: {diet_type}.
Pick a common, widely recognised dish.
Return ONLY JSON (no markdown):
{{"name":"...","calories":{calories},"protein_g":0,"carbs_g":0,"fat_g":0,\
"ingredients":["..."],"photo_query":"2-4 word Pexels search term"}}"""

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _gemini_client():
    return genai_sdk.Client(api_key=settings.GEMINI_API_KEY)


def _call_gemini(prompt: str, max_tokens: int = 4096) -> str:
    client = _gemini_client()
    resp = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=prompt,
        config=genai_types.GenerateContentConfig(
            temperature=0.85,
            max_output_tokens=max_tokens,
            thinking_config=genai_types.ThinkingConfig(thinking_budget=0),
        ),
    )
    return resp.text


def _parse_json(text: str):
    """Strip markdown fences then parse JSON."""
    clean = re.sub(r'```(?:json)?\s*', '', text).strip().rstrip('`').strip()
    return json.loads(clean)


def _pexels_fetch(query: str, api_key: str) -> str:
    """Return one Pexels medium-size image URL, or '' on failure."""
    try:
        resp = requests.get(
            'https://api.pexels.com/v1/search',
            params={'query': f'{query} food', 'per_page': 1, 'orientation': 'landscape'},
            headers={'Authorization': api_key},
            timeout=6,
        )
        resp.raise_for_status()
        photos = resp.json().get('photos', [])
        return photos[0]['src']['medium'] if photos else ''
    except Exception as exc:
        logger.warning("Pexels fetch failed (%r): %s", query, exc)
        return ''


def _fetch_images_parallel(queries: list[str], api_key: str) -> dict[str, str]:
    """Fetch Pexels images for all queries simultaneously. Returns {query: url}."""
    if not api_key or not queries:
        return {}
    results: dict[str, str] = {}
    with ThreadPoolExecutor(max_workers=12) as pool:
        futures = {pool.submit(_pexels_fetch, q, api_key): q for q in queries}
        for future in as_completed(futures):
            q = futures[future]
            try:
                results[q] = future.result()
            except Exception:
                results[q] = ''
    return results


def _meal_dict(raw: dict, slot: str, nat_label: str, image_url: str, fallback_cal: int) -> dict:
    """Normalise a Gemini meal dict into the DB-compatible format."""
    return {
        'meal_id':        '',
        'name':           raw.get('name') or f'{slot.capitalize()} meal',
        'description':    nat_label,          # shown as cuisine badge in UI
        'source_url':     '',
        'calories':       int(raw.get('calories') or fallback_cal),
        'protein_g':      float(raw.get('protein_g') or 0),
        'carbs_g':        float(raw.get('carbs_g') or 0),
        'fat_g':          float(raw.get('fat_g') or 0),
        'image_url':      image_url,
        'ingredients':    raw.get('ingredients') or [],
        'total_time_mins': 0,
    }


def _fallback_plan(daily_calories: int, days: int) -> list[dict]:
    """Emergency fallback when Gemini fails entirely."""
    templates = [
        ('Oatmeal with Fruit',       'breakfast'),
        ('Grilled Chicken Salad',    'lunch'),
        ('Pasta with Tomato Sauce',  'dinner'),
        ('Greek Yogurt with Honey',  'snack'),
    ]
    day_template = {}
    for name, slot in templates:
        cal = round(daily_calories * MEAL_SPLITS[slot])
        entry = {
            'meal_id': '', 'name': name, 'description': 'International',
            'source_url': '', 'calories': cal,
            'protein_g': round(cal * 0.30 / 4),
            'carbs_g':   round(cal * 0.40 / 4),
            'fat_g':     round(cal * 0.30 / 9),
            'image_url': '', 'ingredients': [], 'total_time_mins': 0,
        }
        if slot == 'snack':
            day_template['snacks'] = [entry]
        else:
            day_template[slot] = entry
    return [day_template.copy() for _ in range(days)]


# ---------------------------------------------------------------------------
# Public API (function signatures unchanged — views.py works without changes)
# ---------------------------------------------------------------------------

def search_recipe(
    meal_type: str,
    target_calories: int,
    nationality: str = '',
    diet_type: str = 'normal',
    **kwargs,
) -> dict | None:
    """
    Gemini-powered single-meal search for RegenerateMealSlotView.
    Returns one meal dict or None on failure.
    """
    nat_label = (nationality or 'international').strip().capitalize()
    prompt = _SINGLE_MEAL_PROMPT.format(
        slot=meal_type,
        nationality=nat_label,
        calories=target_calories,
        diet_type=diet_type or 'normal',
    )
    try:
        raw_text = _call_gemini(prompt, max_tokens=256)
        raw = _parse_json(raw_text)
        if isinstance(raw, list):
            raw = raw[0]

        img_url = ''
        if settings.PEXELS_API_KEY and raw.get('photo_query'):
            img_url = _pexels_fetch(raw['photo_query'], settings.PEXELS_API_KEY)

        return _meal_dict(raw, meal_type, nat_label, img_url, target_calories)

    except Exception as exc:
        logger.error("Gemini single-meal search failed: %s", exc)
        return None


def generate_meal_plan_spoonacular(
    daily_calories: int,
    protein_g: int,
    carbs_g: int,
    fat_g: int,
    diet_type: str = 'normal',
    goal: str = '',
    nationality: str = '',
    favorites: list = None,
    days: int = 7,
    rating: str = '',
) -> list:
    """
    Generate a 7-day meal plan with Gemini AI.

    Speed  : 1 Gemini call + parallel Pexels → ~5-8 s total.
    Smart  : nationality is a preference, not a filter.
    Natural: dishes people actually recognise and want to eat.
    """
    nat_label = ('International' if rating == 'down' else (nationality or 'International')).strip().capitalize()

    prompt = _PLAN_PROMPT.format(
        nationality=nat_label,
        daily_calories=daily_calories,
        goal=goal or 'maintain a healthy weight',
        diet_type=diet_type or 'Normal',
        breakfast_cal=round(daily_calories * MEAL_SPLITS['breakfast']),
        lunch_cal=round(daily_calories * MEAL_SPLITS['lunch']),
        dinner_cal=round(daily_calories * MEAL_SPLITS['dinner']),
        snack_cal=round(daily_calories * MEAL_SPLITS['snack']),
        days=days,
    )

    try:
        raw_text = _call_gemini(prompt, max_tokens=4096)
        days_raw: list = _parse_json(raw_text)
    except Exception as exc:
        logger.error("Gemini plan generation failed: %s", exc)
        return _fallback_plan(daily_calories, days)

    # ── Collect every photo_query for a single parallel Pexels batch ─────────
    all_queries: list[str] = []
    for day in days_raw:
        for slot in ('breakfast', 'lunch', 'dinner', 'snack'):
            m = day.get(slot)
            if isinstance(m, dict) and m.get('photo_query'):
                all_queries.append(m['photo_query'])
    # deduplicate while preserving order
    seen: set[str] = set()
    unique_queries = [q for q in all_queries if not (q in seen or seen.add(q))]

    image_map = _fetch_images_parallel(unique_queries, settings.PEXELS_API_KEY)

    # ── Build output ──────────────────────────────────────────────────────────
    results: list[dict] = []
    for day in days_raw[:days]:
        day_data: dict = {}

        for slot in ('breakfast', 'lunch', 'dinner'):
            raw = day.get(slot) or {}
            if not isinstance(raw, dict):
                raw = {}
            query = raw.get('photo_query', '')
            fallback_cal = round(daily_calories * MEAL_SPLITS[slot])
            day_data[slot] = _meal_dict(raw, slot, nat_label, image_map.get(query, ''), fallback_cal)

        sn = day.get('snack') or {}
        if not isinstance(sn, dict):
            sn = {}
        snack_q = sn.get('photo_query', '')
        snack_cal = round(daily_calories * MEAL_SPLITS['snack'])
        day_data['snacks'] = [_meal_dict(sn, 'snack', nat_label, image_map.get(snack_q, ''), snack_cal)]

        results.append(day_data)

    # Pad if Gemini returned fewer than requested days
    while len(results) < days:
        results.extend(_fallback_plan(daily_calories, 1))

    return results
