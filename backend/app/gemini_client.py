"""
gemini_client.py
------------------
A small, shared helper for calling Google's Gemini API. Used by two
features:
  - The chatbot's optional AI fallback (chatbot/ai_fallback.py) - text only
  - Food photo analysis (app/food_vision.py) - text + image

Centralizing this in one place means the model list only needs to be
updated in one spot if Google retires or restricts a model again (this
has already happened twice - see the comments below).

COST SAFETY: this only ever runs if GEMINI_API_KEY is set. Google's free
tier cannot bill you unless you deliberately add a billing account to the
Google Cloud project - see backend/.env.example for details.
"""

import os
import requests

# gemini-1.5-flash was retired (all 1.0/1.5 models are shut down).
# gemini-2.5-flash-lite got restricted to existing users only, and is
# fully shutting down for everyone in October 2026.
# gemini-3.5-flash-lite is the current GA model open to new API keys.
# Google changes this often, so this tries a short list of models in
# order - if the first becomes unavailable again, it automatically falls
# through to the next before giving up. If ALL of these stop working,
# check https://ai.google.dev/gemini-api/docs/models for the current
# recommended model and update this list.
GEMINI_MODELS_TO_TRY = [
    "gemini-3.5-flash-lite",
    "gemini-flash-latest",  # always points to Google's current default model
]
GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"


def get_api_key():
    return os.getenv("GEMINI_API_KEY")


def call_gemini(parts: list, response_mime_type: str = None) -> str:
    """
    Calls Gemini with the given content `parts` (a list of Gemini "part"
    dicts - e.g. [{"text": "..."}] for text-only, or
    [{"text": "..."}, {"inline_data": {...}}] for text + image).

    Tries each model in GEMINI_MODELS_TO_TRY in order until one succeeds.
    Returns the reply text, or None if no API key is configured or every
    model fails - callers should handle that as "AI unavailable right
    now" rather than crashing.
    """
    api_key = get_api_key()
    if not api_key:
        return None

    body = {"contents": [{"parts": parts}]}
    if response_mime_type:
        body["generationConfig"] = {"response_mime_type": response_mime_type}

    for model_name in GEMINI_MODELS_TO_TRY:
        reply = _call_model(model_name, body, api_key)
        if reply:
            return reply

    return None


def _call_model(model_name: str, body: dict, api_key: str) -> str:
    """Calls one specific Gemini model. Returns the reply text, or None on failure."""
    url = f"{GEMINI_API_BASE_URL}/{model_name}:generateContent"

    try:
        response = requests.post(f"{url}?key={api_key}", json=body, timeout=25)
        response.raise_for_status()
        data = response.json()
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except requests.exceptions.HTTPError as error:
        # Logged (not silently swallowed) so failures are visible in your
        # hosting provider's logs (e.g. Render's "Logs" tab) - the API key
        # itself is never included in this output.
        status = error.response.status_code if error.response is not None else "unknown"
        body_text = error.response.text[:300] if error.response is not None else ""
        print(f"[gemini_client] error for model '{model_name}' (status {status}): {body_text}")
        return None
    except Exception as error:
        print(f"[gemini_client] call failed for model '{model_name}': {type(error).__name__}: {error}")
        return None
