"""
routes.py
---------
Defines the API endpoints (URLs) that the frontend can call.

We keep routing separate from the calculation logic (calculations.py) and
from the data shapes (schemas.py). This separation is a common professional
pattern: each file has ONE clear job.
"""

from fastapi import APIRouter

from app.schemas import (
    UserInput,
    NutritionResult,
    BMIResult,
)
from app import calculations
from app.workouts import generate_workout_plan

# APIRouter lets us define routes in this file and "plug them in" to the
# main FastAPI app inside main.py.
router = APIRouter()


@router.post("/calculate", response_model=NutritionResult)
def calculate_nutrition(user_input: UserInput) -> NutritionResult:
    """
    Takes the user's body measurements and returns a full nutrition
    breakdown: BMI, BMR, TDEE, goal calories, macros, water intake,
    healthy weight range, and a meal-by-meal plan.

    FastAPI + Pydantic already validated `user_input` before this function
    runs, so by the time we get here we know every field is present and
    within a sensible range.
    """

    # 1. BMI
    bmi_value, bmi_category = calculations.calculate_bmi(
        weight_kg=user_input.weight_kg,
        height_cm=user_input.height_cm,
    )

    # 2. BMR (Mifflin-St Jeor)
    bmr = calculations.calculate_bmr(
        weight_kg=user_input.weight_kg,
        height_cm=user_input.height_cm,
        age=user_input.age,
        gender=user_input.gender,
    )

    # 3. TDEE (maintenance calories)
    tdee = calculations.calculate_tdee(bmr=bmr, activity_level=user_input.activity_level)

    # 4. Goal calories (adjusted for cut / maintenance / lean bulk / bulk)
    goal_calories = calculations.calculate_goal_calories(tdee=tdee, goal=user_input.goal)

    # 5-7. Macros: protein, carbs, fat
    macros = calculations.calculate_macros(
        goal_calories=goal_calories,
        weight_kg=user_input.weight_kg,
        goal=user_input.goal,
    )

    # 8. Water intake
    water_liters = calculations.calculate_water_intake(
        weight_kg=user_input.weight_kg,
        activity_level=user_input.activity_level,
    )

    # 9. Healthy weight range
    healthy_weight_range = calculations.calculate_healthy_weight_range(
        height_cm=user_input.height_cm,
    )

    # 10. Meal-by-meal distribution
    meal_plan = calculations.calculate_meal_plan(
        goal_calories=goal_calories,
        protein_g=macros["protein_g"],
        carbs_g=macros["carbs_g"],
        fat_g=macros["fat_g"],
    )

    # 11. Weekly workout plan (reuses the same `goal` collected above -
    # the user is never asked for their fitness goal a second time).
    workout_plan = generate_workout_plan(
        goal=user_input.goal,
        fitness_level=user_input.fitness_level,
        workout_location=user_input.workout_location,
        available_days=user_input.available_days,
        workout_duration=user_input.workout_duration,
        equipment=user_input.equipment,
    )

    return NutritionResult(
        bmi=BMIResult(value=bmi_value, category=bmi_category),
        bmr=bmr,
        tdee=tdee,
        goal_calories=goal_calories,
        protein_g=macros["protein_g"],
        carbs_g=macros["carbs_g"],
        fat_g=macros["fat_g"],
        water_liters=water_liters,
        healthy_weight_range=healthy_weight_range,
        meal_plan=meal_plan,
        workout_plan=workout_plan,
    )
