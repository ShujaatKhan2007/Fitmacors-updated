"""
schemas.py
----------
This file defines the "shape" of the data that flows in and out of our API.

We use Pydantic models for this. Pydantic automatically validates incoming
JSON data against these rules, and returns a clear error message if
something doesn't match (e.g. age is negative, or gender is not "male").

Think of this file as a contract between the frontend and the backend.
"""

from enum import Enum
from typing import Any, Dict, Literal, Optional
from pydantic import BaseModel, Field, model_validator


# ---------------------------------------------------------------------------
# Enums restrict a field to a fixed set of valid choices.
# If the frontend sends anything outside of these values, FastAPI will
# automatically reject the request with a helpful error message.
# ---------------------------------------------------------------------------

class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"


class ActivityLevel(str, Enum):
    SEDENTARY = "sedentary"
    LIGHTLY_ACTIVE = "lightly_active"
    MODERATELY_ACTIVE = "moderately_active"
    VERY_ACTIVE = "very_active"
    EXTREMELY_ACTIVE = "extremely_active"


class Goal(str, Enum):
    CUT = "cut"
    MAINTENANCE = "maintenance"
    LEAN_BULK = "lean_bulk"
    BULK = "bulk"


class FitnessLevel(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class WorkoutLocation(str, Enum):
    HOME = "home"
    GYM = "gym"


class Equipment(str, Enum):
    NO_EQUIPMENT = "no_equipment"
    RESISTANCE_BANDS = "resistance_bands"
    DUMBBELLS = "dumbbells"
    PULL_UP_BAR = "pull_up_bar"
    FULL_HOME_GYM = "full_home_gym"


# ---------------------------------------------------------------------------
# Request model: what the frontend must send us in the POST body.
# ---------------------------------------------------------------------------

class UserInput(BaseModel):
    # Field(...) means the value is required.
    # gt / ge / le enforce sensible real-world limits so the math never
    # produces nonsense results (e.g. negative calories).
    age: int = Field(..., gt=0, le=120, description="Age in years (1-120)")
    gender: Gender = Field(..., description="Biological sex used for the BMR formula")
    height_cm: float = Field(..., gt=50, le=272, description="Height in centimetres")
    weight_kg: float = Field(..., gt=20, le=400, description="Weight in kilograms")
    activity_level: ActivityLevel = Field(..., description="Weekly activity level")
    goal: Goal = Field(..., description="Fitness goal")

    # ---- Workout preferences ----
    # `goal` above is reused for the workout plan too, so we don't ask for
    # it twice - these fields only cover things unique to the workout.
    fitness_level: FitnessLevel = Field(..., description="Training experience level")
    workout_location: WorkoutLocation = Field(..., description="Where the workouts will happen")
    available_days: Literal[3, 4, 5, 6] = Field(..., description="Workout days per week")
    workout_duration: Literal[30, 45, 60, 90] = Field(..., description="Minutes available per workout")
    equipment: Optional[Equipment] = Field(
        None, description="Equipment available at home (required only when workout_location is 'home')"
    )

    @model_validator(mode="after")
    def validate_equipment_for_home_workouts(self):
        """
        Equipment is only meaningful when working out at home - a gym is
        assumed to have everything. We enforce that here so the frontend
        gets one clear error message instead of a confusing default.
        """
        if self.workout_location == WorkoutLocation.HOME and self.equipment is None:
            raise ValueError(
                "Please select the equipment you have available for home workouts."
            )
        return self

    class Config:
        json_schema_extra = {
            "example": {
                "age": 25,
                "gender": "male",
                "height_cm": 178,
                "weight_kg": 75,
                "activity_level": "moderately_active",
                "goal": "maintenance",
                "fitness_level": "intermediate",
                "workout_location": "home",
                "available_days": 4,
                "workout_duration": 45,
                "equipment": "dumbbells",
            }
        }


# ---------------------------------------------------------------------------
# Response sub-models: these describe each "card" of the results dashboard.
# Splitting the response into small models keeps main.py easy to read.
# ---------------------------------------------------------------------------

class BMIResult(BaseModel):
    value: float
    category: str


class MacroGrams(BaseModel):
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float


class MealPlan(BaseModel):
    breakfast: MacroGrams
    lunch: MacroGrams
    dinner: MacroGrams
    snacks: MacroGrams


class WeightRange(BaseModel):
    min_kg: float
    max_kg: float


class NutritionResult(BaseModel):
    bmi: BMIResult
    bmr: float
    tdee: float
    goal_calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    water_liters: float
    healthy_weight_range: WeightRange
    meal_plan: MealPlan
    workout_plan: "WorkoutPlan"


# ---------------------------------------------------------------------------
# Workout plan response models.
# ---------------------------------------------------------------------------

class Exercise(BaseModel):
    name: str
    sets: int
    reps: str
    rest_seconds: int
    muscle_group: str


class WorkoutDay(BaseModel):
    day_name: str
    is_rest_day: bool
    focus: str
    exercises: list[Exercise]
    estimated_duration_minutes: int


class WorkoutSummary(BaseModel):
    weekly_split: str
    total_workout_days: int
    total_weekly_training_minutes: int
    recommended_rest_days: int


class WorkoutPlan(BaseModel):
    summary: WorkoutSummary
    days: list[WorkoutDay]


# NutritionResult references WorkoutPlan before it's defined above, so we
# rebuild the model here once every class in this file exists. This is the
# standard Pydantic v2 pattern for forward references.
NutritionResult.model_rebuild()


# ---------------------------------------------------------------------------
# Chatbot request/response models.
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    message: str = Field(..., description="The user's chat message")
    # Optional snapshot of the user's already-calculated nutrition/workout
    # results, sent by the frontend so the chatbot can give personalized
    # answers (e.g. "explain my protein"). Left out entirely - or left as
    # null - if the user hasn't calculated a plan yet.
    context: Optional[Dict[str, Any]] = Field(
        None, description="The user's calculated nutrition/workout results, if available"
    )

    class Config:
        json_schema_extra = {
            "example": {"message": "Best breakfast for muscle gain"}
        }


class ChatResponse(BaseModel):
    reply: str
    topic: str
