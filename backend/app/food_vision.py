"""
food_vision.py
---------------
Analyzes a photo of food using Gemini's vision capability and estimates
its nutrition breakdown - calories, protein, carbs, and fat, broken down
per visible ingredient (e.g. bun, patty, cheese, sauce for a burger).

This is the one feature in FitMacros that genuinely requires an AI
model - there is no rule-based way to recognize food in a photo, unlike
the chatbot (which is rule-based by default, with Gemini only as an
optional fallback). This feature REQUIRES GEMINI_API_KEY to be
configured - see backend/.env.example. Without it, this raises a clear,
friendly error instead of attempting a fake analysis.
"""

import json
import re

from app.gemini_client import call_gemini, get_api_key

# Instructs Gemini to look at the photo like a nutrition expert, break
# the meal down into its visible components, and reply with STRICT JSON
# so it can be parsed reliably (no markdown, no extra commentary).
ANALYSIS_PROMPT = """You are a nutrition expert analyzing a photo of food.

Identify every distinct food item or component visible in the photo -
for example, for a burger: the bun, the patty, cheese, lettuce, tomato,
and any visible sauce, each as separate items. For a plate with several
foods, list each food separately.

For each item, estimate a realistic portion size based on what's visible,
then estimate its calories, protein, carbohydrates, and fat using
standard nutrition data for that food and portion.

Respond with ONLY valid JSON, no markdown code fences, no extra text,
in exactly this shape:

{
  "food_summary": "short 3-6 word description of the overall meal",
  "items": [
    {
      "name": "item name",
      "estimated_portion": "e.g. '1 bun, approx 60g'",
      "calories": 150,
      "protein_g": 5,
      "carbs_g": 28,
      "fat_g": 2
    }
  ],
  "confidence_note": "one short sentence noting this is an AI estimate and actual values vary by preparation and exact portion size"
}

All numeric fields must be plain numbers, not strings or ranges. If you
genuinely cannot identify any food in the image, return an empty "items"
list and explain what you see instead in "food_summary"."""


def analyze_food_image(image_base64: str, mime_type: str) -> dict:
    """
    Returns a dict shaped like FoodAnalysisResult (see schemas.py).
    Raises ValueError with a friendly, user-facing message if analysis
    isn't possible right now (no API key configured, or the AI call
    failed) - the route layer turns this into a clean HTTP error.
    """
    if not get_api_key():
        raise ValueError(
            "Food photo analysis isn't set up yet - it needs a Gemini API "
            "key configured on the server. Ask the site owner to set "
            "GEMINI_API_KEY (see backend/.env.example for a free, "
            "no-credit-card-required signup link)."
        )

    parts = [
        {"text": ANALYSIS_PROMPT},
        {"inline_data": {"mime_type": mime_type, "data": image_base64}},
    ]

    raw_reply = call_gemini(parts, response_mime_type="application/json")
    if not raw_reply:
        raise ValueError(
            "We couldn't analyze that photo right now. Please try again "
            "in a moment."
        )

    parsed = _parse_json_reply(raw_reply)
    if parsed is None:
        raise ValueError(
            "We had trouble understanding the analysis result. Please "
            "try again, ideally with a clearer, well-lit photo."
        )

    items = parsed.get("items") or []
    # Guard against the AI omitting a numeric field - treat missing values
    # as 0 rather than letting the whole request crash.
    for item in items:
        for field in ("calories", "protein_g", "carbs_g", "fat_g"):
            item[field] = item.get(field) or 0

    return {
        "food_summary": parsed.get("food_summary") or "Unidentified meal",
        "items": items,
        "total_calories": round(sum(i["calories"] for i in items), 1),
        "total_protein_g": round(sum(i["protein_g"] for i in items), 1),
        "total_carbs_g": round(sum(i["carbs_g"] for i in items), 1),
        "total_fat_g": round(sum(i["fat_g"] for i in items), 1),
        "confidence_note": parsed.get("confidence_note") or (
            "This is an AI-generated estimate - actual values vary by "
            "preparation and portion size."
        ),
    }


def _parse_json_reply(raw_reply: str):
    """
    Gemini sometimes wraps JSON in markdown code fences even when asked
    not to - strip those before parsing so this doesn't fail on an
    otherwise-valid response.
    """
    cleaned = raw_reply.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return None
