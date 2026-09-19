"""
food_routes.py
---------------
Defines the food photo analysis endpoint: POST /analyze-food.

Kept in its own file, separate from routes.py (nutrition + workout) and
chat_routes.py (chatbot), so each feature stays cleanly isolated.
"""

from fastapi import APIRouter, HTTPException

from app.schemas import FoodImageRequest, FoodAnalysisResult
from app.food_vision import analyze_food_image

router = APIRouter()


@router.post("/analyze-food", response_model=FoodAnalysisResult)
def analyze_food(request: FoodImageRequest) -> FoodAnalysisResult:
    """
    Takes a base64-encoded photo of food and returns an estimated
    nutrition breakdown (calories, protein, carbs, fat) per visible
    ingredient, using Gemini's vision capability.

    Returns a 503 error with a friendly message if GEMINI_API_KEY isn't
    configured, or if the AI call fails for any reason - the frontend
    displays that message directly rather than a generic error screen.
    """
    try:
        result = analyze_food_image(request.image_base64, request.mime_type)
    except ValueError as error:
        raise HTTPException(status_code=503, detail=str(error))

    return FoodAnalysisResult(**result)
