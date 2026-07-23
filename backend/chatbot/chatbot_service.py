"""
chatbot_service.py
-------------------
The "brain" of the FitMacros Fitness Coach chatbot. It combines two
sources of answers:

  1. Personalized answers - when the user asks about "my" numbers (e.g.
     "explain my protein"), built from their own calculated nutrition and
     workout results, passed in as `context`.
  2. General fitness education - pulled from the JSON knowledge base and
     matched using keyword_matcher.py.

No AI models, embeddings, or external APIs are used anywhere in this file
- every response is built from plain Python logic and the knowledge base.
"""

from chatbot.keyword_matcher import load_knowledge_base, find_best_match

# Load the knowledge base once when this module is first imported, rather
# than re-reading every JSON file on every single chat request.
_KNOWLEDGE_BASE = load_knowledge_base()

# Phrases that signal the user is asking about their OWN calculated
# results ("my protein", "why am I eating this many calories") rather
# than asking a general fitness question ("what is protein").
PERSONAL_PHRASES = ["my ", "i am eating", "im eating", "why am i"]

# Action/how-to verbs that signal a general educational question even if
# the phrasing includes "my" (e.g. "how can I increase my water intake"
# or "improve my workout recovery" are how-to questions, not requests to
# explain an already-calculated personal number). If any of these appear,
# we skip personalization and let the general knowledge base answer it.
HOW_TO_ACTION_VERBS = [
    "increase", "improve", "boost", "build", "raise", "grow",
    "reduce", "lower", "avoid", "prevent", "get more", "how to",
]

# Maps a metric keyword found in the message to an internal metric name.
# Longer, more specific phrases are listed first so they're matched before
# a shorter, more generic keyword could steal the match.
METRIC_KEYWORDS = [
    ("healthy weight", "weight_range"),
    ("weight range", "weight_range"),
    ("workout plan", "workout"),
    ("carbohydrate", "carbs"),
    ("calories", "calories"),
    ("calorie", "calories"),
    ("protein", "protein"),
    ("workout", "workout"),
    ("hydration", "water"),
    ("water", "water"),
    ("macros", "macros"),
    ("macro", "macros"),
    ("carbs", "carbs"),
    ("carb", "carbs"),
    ("bmi", "bmi"),
    ("fat", "fat"),
]

# Keywords that suggest a medical question the chatbot should redirect to
# a healthcare professional rather than attempt to answer itself.
MEDICAL_DISCLAIMER_KEYWORDS = [
    "diagnosed", "medical condition", "medication", "prescription",
    "doctor said", "pregnant", "pregnancy", "surgery", "cancer",
    "diabetes", "thyroid", "blood pressure", "heart condition",
    "chronic illness", "disease",
]

FALLBACK_REPLY = (
    "I'm still learning that topic! Try asking me about nutrition, "
    "workouts, hydration, recovery, muscle gain, fat loss, sleep, or "
    "healthy eating - I've got plenty to share on those. 💪"
)

MEDICAL_DISCLAIMER_REPLY = (
    "That sounds like something worth discussing with a doctor or "
    "healthcare professional rather than me - they can look at your full "
    "medical history and give you safe, personalized advice. 🩺\n\n"
    "I'm happy to help with general fitness and nutrition education in "
    "the meantime, though - just let me know what you'd like to explore!"
)

EMPTY_MESSAGE_REPLY = (
    "Looks like your message came through empty! Type a question about "
    "nutrition, workouts, recovery, or anything fitness-related and I'll "
    "do my best to help. 🙂"
)

NO_PLAN_YET_REPLY = (
    "I don't see a calculated plan for you yet! Head over to the "
    "nutrition calculator, fill in your details, and hit \"Calculate "
    "Nutrition\" - then come back and ask me again and I'll break down "
    "your personal numbers. 📊"
)

GOAL_LABELS = {
    "cut": "fat loss",
    "maintenance": "maintenance",
    "lean_bulk": "lean bulk",
    "bulk": "bulk",
}


def handle_message(message: str, context: dict = None) -> dict:
    """
    Main entry point for the chatbot. Returns a dict shaped like
    {"reply": str, "topic": str}.
    """
    if not message or not message.strip():
        return {"reply": EMPTY_MESSAGE_REPLY, "topic": "General"}

    normalized = message.lower().strip()

    # 1. Medical questions always get redirected to a professional.
    if any(keyword in normalized for keyword in MEDICAL_DISCLAIMER_KEYWORDS):
        return {"reply": MEDICAL_DISCLAIMER_REPLY, "topic": "Medical Disclaimer"}

    # 2. Personalized "my numbers" questions, answered from the user's own
    # calculated results when available.
    personal_reply = _try_personalized_reply(normalized, context)
    if personal_reply:
        return personal_reply

    # 3. General fitness education from the knowledge base.
    topic = find_best_match(message, _KNOWLEDGE_BASE)
    if topic:
        return {"reply": _format_topic_reply(topic), "topic": topic["category"]}

    # 4. Nothing matched at all.
    return {"reply": FALLBACK_REPLY, "topic": "Unknown"}


def _try_personalized_reply(normalized_message: str, context: dict):
    """
    Detects questions like "explain my protein" or "why am I eating this
    many calories" and answers using the user's own calculated numbers.
    Returns None if the message doesn't look like a personalized question.
    """
    is_personal_question = any(phrase in normalized_message for phrase in PERSONAL_PHRASES)
    is_how_to_question = any(verb in normalized_message for verb in HOW_TO_ACTION_VERBS)
    if not is_personal_question or is_how_to_question:
        return None

    matched_metric = None
    for keyword, metric in METRIC_KEYWORDS:
        if keyword in normalized_message:
            matched_metric = metric
            break

    if not matched_metric:
        return None

    if not context:
        return {"reply": NO_PLAN_YET_REPLY, "topic": "General"}

    return _build_personalized_reply(matched_metric, context)


def _build_personalized_reply(metric: str, context: dict) -> dict:
    """Builds a reply that references the user's actual calculated numbers."""
    goal_label = GOAL_LABELS.get(context.get("goal"), context.get("goal") or "your goal")

    if metric == "protein":
        reply = (
            f"Your plan targets **{context.get('protein_g')}g of protein per day**. "
            f"That's calculated from your body weight ({context.get('weight_kg')}kg) "
            f"and your goal ({goal_label}) - protein needs go up during a calorie "
            f"deficit to help protect your muscle, and stay high during a bulk to "
            f"support new muscle growth.\n\n"
            f"💡 Tip: Spread this across 3-4 meals rather than one big serving - "
            f"your body uses protein more efficiently that way."
        )
        return {"reply": reply, "topic": "Protein"}

    if metric == "calories":
        reply = (
            f"You're set at **{context.get('goal_calories')} kcal/day**. Here's the "
            f"logic: your estimated maintenance level (TDEE) is about "
            f"{context.get('tdee')} kcal, and since your goal is {goal_label}, we've "
            f"adjusted from there - lower for fat loss, higher for a bulk, or "
            f"roughly the same for maintenance.\n\n"
            f"💡 Tip: These numbers are a smart starting point, not a rigid law - "
            f"track your results over 2-3 weeks and adjust if your weight isn't "
            f"trending the way you expect."
        )
        return {"reply": reply, "topic": "Calories"}

    if metric == "carbs":
        reply = (
            f"Your plan includes **{context.get('carbs_g')}g of carbohydrates per "
            f"day**. Carbs are your body's preferred fuel for workouts, and this "
            f"amount is whatever's left in your calorie budget after protein and "
            f"fat are set.\n\n"
            f"💡 Tip: Try timing more of your carbs around your workouts - before "
            f"for energy, after for recovery."
        )
        return {"reply": reply, "topic": "Carbohydrates"}

    if metric == "fat":
        reply = (
            f"Your plan includes **{context.get('fat_g')}g of fat per day**, set "
            f"at about 25% of your total calories. Dietary fat is essential for "
            f"hormone production - don't be tempted to cut it too low even during "
            f"a fat-loss phase.\n\n"
            f"💡 Tip: Favor unsaturated fats - olive oil, nuts, avocado, and fatty "
            f"fish - over heavily processed fried foods."
        )
        return {"reply": reply, "topic": "Healthy Fats"}

    if metric == "bmi":
        bmi = context.get("bmi") or {}
        bmi_value = bmi.get("value") if isinstance(bmi, dict) else bmi
        bmi_category = bmi.get("category") if isinstance(bmi, dict) else None
        reply = (
            f"Your BMI is **{bmi_value}**, which falls in the **{bmi_category}** "
            f"range. BMI is a quick, simple screening tool based only on height "
            f"and weight - it doesn't account for muscle mass, so it's most "
            f"useful as a general reference point rather than a precise health "
            f"verdict.\n\n"
            f"💡 Tip: Track how your body composition and how your clothes fit "
            f"over time - that tells you more than BMI alone."
        )
        return {"reply": reply, "topic": "BMI"}

    if metric == "water":
        reply = (
            f"You're aiming for **{context.get('water_liters')}L of water per "
            f"day**, scaled to your body weight and activity level - more active "
            f"days mean more fluid lost through sweat, so the target adjusts "
            f"accordingly.\n\n"
            f"💡 Tip: Keep a bottle with you and sip steadily through the day "
            f"rather than chugging it all at once."
        )
        return {"reply": reply, "topic": "Hydration"}

    if metric == "weight_range":
        weight_range = context.get("healthy_weight_range") or {}
        reply = (
            f"Based on your height, a healthy weight range (BMI 18.5-24.9) is "
            f"about **{weight_range.get('min_kg')}kg to {weight_range.get('max_kg')}kg**. "
            f"This is a wide, general range - where exactly you should sit within "
            f"it depends on your build, muscle mass, and personal goals.\n\n"
            f"💡 Tip: Use this as a rough compass, not a strict target."
        )
        return {"reply": reply, "topic": "Healthy Weight"}

    if metric == "workout":
        workout_plan = context.get("workout_plan")
        if workout_plan:
            summary = workout_plan.get("summary", {})
            reply = (
                f"Your weekly plan is a **{summary.get('weekly_split')}**, with "
                f"{summary.get('total_workout_days')} training days and about "
                f"{summary.get('total_weekly_training_minutes')} total minutes of "
                f"training this week, plus {summary.get('recommended_rest_days')} "
                f"rest/recovery days built in.\n\n"
                f"💡 Tip: Consistency beats intensity - showing up for every "
                f"planned session matters more than any single \"perfect\" workout."
            )
            return {"reply": reply, "topic": "Workout Plan"}
        return {
            "reply": (
                "I don't see a workout plan generated for you yet! Head over to "
                "the workout planner section and build one - then come back and "
                "ask me about it. 🏋️"
            ),
            "topic": "General",
        }

    if metric == "macros":
        reply = (
            f"Your daily macro targets are **{context.get('protein_g')}g "
            f"protein, {context.get('carbs_g')}g carbs, and {context.get('fat_g')}g "
            f"fat**, built around your {context.get('goal_calories')} kcal target "
            f"for a {goal_label} goal.\n\n"
            f"💡 Tip: Hitting your protein target consistently matters more "
            f"day-to-day than being exact on carbs and fat."
        )
        return {"reply": reply, "topic": "Macros"}

    return None


def _format_topic_reply(topic: dict) -> str:
    """Turns one knowledge-base topic entry into a friendly chat reply."""
    parts = [f"**{topic['title']}**", "", topic["answer"]]

    tips = topic.get("tips", [])
    if tips:
        parts.append("")
        parts.append("💡 **Tips:**")
        parts.extend(f"• {tip}" for tip in tips)

    dos = topic.get("dos", [])
    if dos:
        parts.append("")
        parts.append("✅ **Do:**")
        parts.extend(f"• {item}" for item in dos)

    donts = topic.get("donts", [])
    if donts:
        parts.append("")
        parts.append("❌ **Avoid:**")
        parts.extend(f"• {item}" for item in donts)

    example = topic.get("example")
    if example:
        parts.append("")
        parts.append(f"📌 **Example:** {example}")

    return "\n".join(parts)
