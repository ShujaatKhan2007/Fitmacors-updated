"""
ai_fallback.py
--------------
An OPTIONAL fallback for questions the free, rule-based knowledge base
(keyword_matcher.py + chatbot_service.py) couldn't answer. This is only
ever reached after the free rule-based system has already tried and
failed to find a match - see the numbered steps in chatbot_service.py's
handle_message().

The actual Gemini API call lives in app/gemini_client.py, shared with the
food photo analysis feature.

COST SAFETY:
  - If GEMINI_API_KEY is not set, this does nothing and the chatbot
    silently falls back to the original free static message. Nothing
    breaks.
  - As long as you never add a billing account to your Google Cloud
    project, the free tier cannot bill you - requests just get blocked
    once the free daily quota is used up.
"""

from app.gemini_client import call_gemini

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
    Calls Gemini for a question the rule-based system couldn't answer.
    Returns the AI's reply as a string, or None if the API key isn't
    configured or the call fails - callers should fall back to the
    static FALLBACK_REPLY in that case.
    """
    prompt = SYSTEM_INSTRUCTION + "\n\n"
    if context:
        # Give the AI the same personalized numbers the rule-based system
        # would have access to, so its answer can reference them too.
        prompt += f"The user's calculated nutrition/workout plan: {context}\n\n"
    prompt += f"User's question: {message}"

    return call_gemini([{"text": prompt}])
