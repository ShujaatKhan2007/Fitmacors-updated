"""
keyword_matcher.py
-------------------
Loads the fitness knowledge base (a set of JSON files) and finds the best
matching topic for a user's message using simple, transparent keyword
scoring. No AI models, embeddings, or external services are used here -
just plain text matching, so the logic is easy to read and extend.
"""

import json
import re
from pathlib import Path

# The knowledge_base folder sits right next to this file.
KNOWLEDGE_BASE_DIR = Path(__file__).parent / "knowledge_base"

# Maps each JSON filename (without extension) to the human-readable
# category name shown to the user as the response's "topic".
CATEGORY_LABELS = {
    "nutrition": "Nutrition",
    "workout": "Workout",
    "recovery": "Recovery",
    "hydration": "Hydration",
    "motivation": "Motivation",
    "sleep": "Sleep",
    "supplements": "Supplements",
    "injury_prevention": "Injury Prevention",
}


def load_knowledge_base() -> list:
    """
    Reads every JSON file in knowledge_base/ and returns one flat list of
    topic dictionaries, each tagged with its source category. Called once
    when the chatbot service module is imported.
    """
    topics = []
    for file_path in sorted(KNOWLEDGE_BASE_DIR.glob("*.json")):
        category = CATEGORY_LABELS.get(file_path.stem, file_path.stem.title())
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        for topic in data.get("topics", []):
            topic["category"] = category
            topics.append(topic)
    return topics


def _normalize(text: str) -> str:
    """Lowercases and strips punctuation so matching ignores case/punctuation."""
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _stem(word: str) -> str:
    """
    A tiny, dependency-free stemmer that just strips common plural/verb
    endings (mistakes -> mistake, beginners -> beginner, studies -> study).
    It's not linguistically perfect, but it's enough to stop simple plural
    or word-form mismatches from causing a missed match.
    """
    if len(word) > 4 and word.endswith("ies"):
        return word[:-3] + "y"
    if len(word) > 4 and word.endswith("es"):
        return word[:-2]
    if len(word) > 3 and word.endswith("s") and not word.endswith("ss"):
        return word[:-1]
    return word


def find_best_match(message: str, topics: list):
    """
    Scores every topic against the user's message and returns the
    highest-scoring topic dict, or None if nothing scores above zero.

    Two ways a keyword can match, so word order and plurals don't cause a
    missed match:

    1. Exact phrase match: the keyword appears as a contiguous substring
       of the message (e.g. keyword "how much protein" inside "how much
       protein do I need"). This is the strongest, most specific signal.
    2. Word-set match: every (stemmed) word in the keyword shows up
       somewhere in the message, in any order. This catches phrasing like
       "beginners make mistakes" for the keyword "beginner mistakes", or
       plural/singular differences like "workouts" vs "workout".
    """
    normalized_message = _normalize(message)
    if not normalized_message:
        return None

    message_words = normalized_message.split()
    message_word_set = {_stem(word) for word in message_words}

    best_topic = None
    best_score = 0

    for topic in topics:
        score = 0
        for keyword in topic.get("keywords", []):
            normalized_keyword = _normalize(keyword)
            if not normalized_keyword:
                continue

            keyword_words = normalized_keyword.split()
            word_count = len(keyword_words)

            if normalized_keyword in normalized_message:
                # Exact phrase match - the strongest possible signal.
                score += word_count * 3 if word_count > 1 else 2
                continue

            stemmed_keyword_words = {_stem(word) for word in keyword_words}
            if stemmed_keyword_words.issubset(message_word_set):
                # All the keyword's words are present, just reordered
                # and/or in a different plural/singular form.
                score += word_count * 2 if word_count > 1 else 1

        if score > best_score:
            best_score = score
            best_topic = topic

    return best_topic if best_score > 0 else None
