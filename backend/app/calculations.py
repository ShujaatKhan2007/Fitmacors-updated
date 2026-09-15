"""
calculations.py
----------------
This file contains every formula used to turn raw body measurements into
useful nutrition numbers. Keeping all the "science" in one file (separate
from the API routing code in main.py) makes the project easier to read,
test, and extend.

Every function does exactly one job and returns plain numbers, so you can
copy/test each formula on its own if you want to learn how it works.
"""

from app.schemas import Gender, ActivityLevel, Goal, WeightRange, MacroGrams, MealPlan


# ---------------------------------------------------------------------------
# Activity multipliers used to turn BMR into TDEE (Total Daily Energy
# Expenditure). These are the standard, widely-used multipliers.
# ---------------------------------------------------------------------------
ACTIVITY_MULTIPLIERS = {
    ActivityLevel.SEDENTARY: 1.2,            # little to no exercise
    ActivityLevel.LIGHTLY_ACTIVE: 1.375,      # light exercise 1-3 days/week
    ActivityLevel.MODERATELY_ACTIVE: 1.55,    # moderate exercise 3-5 days/week
    ActivityLevel.VERY_ACTIVE: 1.725,         # hard exercise 6-7 days/week
    ActivityLevel.EXTREMELY_ACTIVE: 1.9,      # very hard exercise + physical job
}

# Extra water (in liters) recommended on top of the base amount, scaled by
# how active someone is (more activity = more fluid loss through sweat).
ACTIVITY_WATER_BONUS_LITERS = {
    ActivityLevel.SEDENTARY: 0.0,
    ActivityLevel.LIGHTLY_ACTIVE: 0.3,
    ActivityLevel.MODERATELY_ACTIVE: 0.5,
    ActivityLevel.VERY_ACTIVE: 0.7,
    ActivityLevel.EXTREMELY_ACTIVE: 0.9,
}

# How many calories to add/subtract from TDEE depending on the user's goal.
# Expressed as a multiplier of TDEE (e.g. 0.8 = a 20% calorie deficit).
GOAL_CALORIE_MULTIPLIERS = {
    Goal.CUT: 0.80,          # ~20% deficit for fat loss
    Goal.MAINTENANCE: 1.00,  # no change
    Goal.LEAN_BULK: 1.10,    # ~10% surplus for slow, clean muscle gain
    Goal.BULK: 1.20,         # ~20% surplus for faster weight/muscle gain
}

# Grams of protein per kilogram of bodyweight, based on goal.
# Protein is kept high during a cut to help preserve muscle mass.
GOAL_PROTEIN_PER_KG = {
    Goal.CUT: 2.2,
    Goal.MAINTENANCE: 1.8,
    Goal.LEAN_BULK: 2.0,
    Goal.BULK: 1.8,
}

# Percentage of total daily calories that should come from fat.
FAT_PERCENTAGE_OF_CALORIES = 0.25

# Meal distribution: how the day's calories/macros are split across meals.
MEAL_SPLIT = {
    "breakfast": 0.25,
    "lunch": 0.30,
    "dinner": 0.30,
    "snacks": 0.15,
}

# Safety floor so carbs never go negative for very low-calorie inputs.
MIN_CARBS_GRAMS = 50


def calculate_bmi(weight_kg: float, height_cm: float) -> tuple[float, str]:
    """Return (bmi_value, bmi_category)."""
    height_m = height_cm / 100
    bmi = weight_kg / (height_m ** 2)

    if bmi < 18.5:
        category = "Underweight"
    elif bmi < 25:
        category = "Normal"
    elif bmi < 30:
        category = "Overweight"
    else:
        category = "Obese"

    return round(bmi, 1), category


def calculate_bmr(weight_kg: float, height_cm: float, age: int, gender: Gender) -> float:
    """
    Mifflin-St Jeor Equation - considered the most accurate BMR formula
    for the general population.

    Men:   BMR = 10*weight + 6.25*height - 5*age + 5
    Women: BMR = 10*weight + 6.25*height - 5*age - 161
    """
    base = (10 * weight_kg) + (6.25 * height_cm) - (5 * age)
    bmr = base + 5 if gender == Gender.MALE else base - 161
    return round(bmr, 1)


def calculate_tdee(bmr: float, activity_level: ActivityLevel) -> float:
    """TDEE = BMR x activity multiplier."""
    multiplier = ACTIVITY_MULTIPLIERS[activity_level]
    return round(bmr * multiplier, 1)


def calculate_goal_calories(tdee: float, goal: Goal) -> float:
    """Adjust TDEE up or down depending on the user's goal."""
    return round(tdee * GOAL_CALORIE_MULTIPLIERS[goal], 1)


def calculate_macros(goal_calories: float, weight_kg: float, goal: Goal) -> dict:
    """
    Work out protein, fat and carbs (in grams) for the day.

    Order matters:
      1. Protein is set first, based on bodyweight and goal.
      2. Fat is set as a percentage of total calories.
      3. Carbs absorb whatever calories are left over.
    """
    # 1. Protein
    protein_per_kg = GOAL_PROTEIN_PER_KG[goal]
    protein_g = round(weight_kg * protein_per_kg, 1)
    protein_cals = protein_g * 4  # 4 calories per gram of protein

    # 2. Fat
    fat_cals = goal_calories * FAT_PERCENTAGE_OF_CALORIES
    fat_g = round(fat_cals / 9, 1)  # 9 calories per gram of fat

    # 3. Carbs get the remaining calories
    remaining_cals = goal_calories - protein_cals - fat_cals
    carbs_g = round(max(remaining_cals, MIN_CARBS_GRAMS * 4) / 4, 1)

    return {
        "protein_g": protein_g,
        "carbs_g": carbs_g,
        "fat_g": fat_g,
    }


def calculate_water_intake(weight_kg: float, activity_level: ActivityLevel) -> float:
    """
    Base recommendation: ~35ml per kg of bodyweight, plus a bonus
    depending on activity level (more sweat = more fluid needed).
    """
    base_liters = weight_kg * 0.035
    bonus_liters = ACTIVITY_WATER_BONUS_LITERS[activity_level]
    return round(base_liters + bonus_liters, 2)


def calculate_healthy_weight_range(height_cm: float) -> WeightRange:
    """Uses the 'Normal' BMI band (18.5 - 24.9) to find a healthy weight range."""
    height_m = height_cm / 100
    min_kg = round(18.5 * (height_m ** 2), 1)
    max_kg = round(24.9 * (height_m ** 2), 1)
    return WeightRange(min_kg=min_kg, max_kg=max_kg)


def calculate_meal_plan(goal_calories: float, protein_g: float, carbs_g: float, fat_g: float) -> MealPlan:
    """Split the day's totals across breakfast, lunch, dinner and snacks."""
    meals = {}
    for meal_name, portion in MEAL_SPLIT.items():
        meals[meal_name] = MacroGrams(
            calories=round(goal_calories * portion, 1),
            protein_g=round(protein_g * portion, 1),
            carbs_g=round(carbs_g * portion, 1),
            fat_g=round(fat_g * portion, 1),
        )

    return MealPlan(
        breakfast=meals["breakfast"],
        lunch=meals["lunch"],
        dinner=meals["dinner"],
        snacks=meals["snacks"],
    )
