"""
ai_fallback.py
--------------
An OPTIONAL fallback for questions the free, rule-based knowledge base
(keyword_matcher.py + chatbot_service.py) couldn't answer. This is the
ONLY place in the chatbot that calls an external AI API, and it's only
ever reached after the free rule-based system has already tried and
failed to find a match - see the numbered steps in handle_message().

COST SAFETY - read this before adding your API key:
  - This uses Google's Gemini API free tier. As long as you never add a
    billing account to your Google Cloud project, it is not possible to
    be charged - requests just get blocked once the free daily quota is
    used up, not silently billed.
  - If GEMINI_API_KEY is not set (e.g. you never configure it, or you
    remove it later), this file does nothing and the chatbot silently
    falls back to the original free static message. Nothing breaks.
  - Every call has a short timeout and only fires for genuinely
    unmatched questions - most messages never reach this file at all.
"""

import os
import requests

# gemini-1.5-flash was retired (all 1.0/1.5 models are shut down).
# gemini-2.5-flash-lite is being phased out too - restricted to existing
# users only as of mid-2026, and fully shutting down October 2026.
# gemini-3.5-flash-lite is the current GA model open to new API keys:
# fast, low-cost, designed for exactly this kind of lightweight task.
#
# Google retires/restricts models often (we've hit two dead ends before
# landing on this one), so this tries a short list of models in order
# instead of just one - if the first becomes unavailable again in the
# future, it automatically falls through to the next before giving up.
# If ALL of these ever stop working, check
# https://ai.google.dev/gemini-api/docs/models for the current
# recommended model and update this list.
GEMINI_MODELS_TO_TRY = [
    "gemini-3.5-flash-lite",
    "gemini-flash-latest",  # always points to Google's current default model
]
GEMINI_API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

# Keeps the AI's personality consistent with the rest of the chatbot, and
# repeats the same safety rule the rule-based system already follows.
SYSTEM_INSTRUCTION = (
    "You are the FitMacros Fitness Coach - a friendly, encouraging, "
    "professional fitness and nutrition assistant. Answer the user's "
    "question in a practical, beginner-friendly, educational way, in "
    "under 120 words. Never provide a medical diagnosis - if the "
    "question is about a medical condition, recommend the user consult "
    "a healthcare professional instead of answering directly."
)


def get_ai_reply(message: str, context: dict = None) -> str:
    """
    Calls the Gemini API for a question the rule-based system couldn't
    answer. Returns the AI's reply as a string, or None if the API key
    isn't configured or every candidate model fails - callers should
    fall back to the static FALLBACK_REPLY in that case.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        # No key configured - this is the normal, expected state unless
        # you've deliberately opted in. Not an error.
        return None

    prompt = SYSTEM_INSTRUCTION + "\n\n"
    if context:
        # Give the AI the same personalized numbers the rule-based system
        # would have access to, so its answer can reference them too.
        prompt += f"The user's calculated nutrition/workout plan: {context}\n\n"
    prompt += f"User's question: {message}"

    for model_name in GEMINI_MODELS_TO_TRY:
        reply = _call_gemini_model(model_name, prompt, api_key)
        if reply:
            return reply

    return None


def _call_gemini_model(model_name: str, prompt: str, api_key: str) -> str:
    """Calls one specific Gemini model. Returns the reply, or None on any failure."""
    url = f"{GEMINI_API_BASE_URL}/{model_name}:generateContent"

    try:
        response = requests.post(
            f"{url}?key={api_key}",
            json={"contents": [{"parts": [{"text": prompt}]}]},
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except requests.exceptions.HTTPError as error:
        # Log enough detail to diagnose the problem (e.g. a deprecated
        # model name, an invalid key, or a quota limit) without ever
        # printing the API key itself. Check your hosting provider's
        # logs (e.g. Render's "Logs" tab) to see this if the AI fallback
        # ever silently stops working again.
        status = error.response.status_code if error.response is not None else "unknown"
        body = error.response.text[:300] if error.response is not None else ""
        print(f"[ai_fallback] Gemini API error for model '{model_name}' (status {status}): {body}")
        return None
    except Exception as error:
        print(f"[ai_fallback] Gemini API call failed for model '{model_name}': {type(error).__name__}: {error}")
        return None
