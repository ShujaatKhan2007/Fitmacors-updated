"""
workouts.py
-----------
Generates a full 7-day workout schedule using plain, editable Python data
tables - no AI models or external APIs involved. Everything the planner
can produce is fully determined by the tables below, which makes it easy
to read, test, and extend.

To add a new exercise: add one line to EXERCISE_LIBRARY.
To change how a fitness level trains: edit SETS_BY_LEVEL / BASE_REST_SECONDS_BY_LEVEL.
To change how a goal affects rep ranges: edit REP_RANGE_BY_GOAL.
To change the weekly split itself: edit SPLIT_TEMPLATES.
"""

from app.schemas import (
    Goal,
    FitnessLevel,
    WorkoutLocation,
    Equipment,
    Exercise,
    WorkoutDay,
    WorkoutSummary,
    WorkoutPlan,
)

# ---------------------------------------------------------------------------
# Equipment access: what each equipment selection unlocks at home.
# "bodyweight" exercises are always available no matter what.
# A gym is assumed to have everything.
# ---------------------------------------------------------------------------
HOME_EQUIPMENT_ACCESS = {
    Equipment.NO_EQUIPMENT: {"bodyweight"},
    Equipment.RESISTANCE_BANDS: {"bodyweight", "bands"},
    Equipment.DUMBBELLS: {"bodyweight", "dumbbells"},
    Equipment.PULL_UP_BAR: {"bodyweight", "pull_up_bar"},
    Equipment.FULL_HOME_GYM: {"bodyweight", "dumbbells", "bands", "pull_up_bar", "barbell", "machine"},
}
GYM_EQUIPMENT_ACCESS = {"bodyweight", "dumbbells", "barbell", "machine", "cable", "pull_up_bar"}

# ---------------------------------------------------------------------------
# Exercise library, grouped by primary muscle group.
# Each exercise lists the equipment tags it needs. An empty list means
# "bodyweight only" - always available regardless of the user's setup.
# ---------------------------------------------------------------------------
EXERCISE_LIBRARY = {
    "Chest": [
        {"name": "Push-Ups", "equipment": []},
        {"name": "Incline Push-Ups", "equipment": []},
        {"name": "Resistance Band Chest Press", "equipment": ["bands"]},
        {"name": "Dumbbell Chest Press", "equipment": ["dumbbells"]},
        {"name": "Dumbbell Flyes", "equipment": ["dumbbells"]},
        {"name": "Barbell Bench Press", "equipment": ["barbell"]},
        {"name": "Incline Barbell Press", "equipment": ["barbell"]},
        {"name": "Chest Press Machine", "equipment": ["machine"]},
        {"name": "Cable Crossover", "equipment": ["cable"]},
    ],
    "Back": [
        {"name": "Superman Hold", "equipment": []},
        {"name": "Resistance Band Rows", "equipment": ["bands"]},
        {"name": "Pull-Ups", "equipment": ["pull_up_bar"]},
        {"name": "Chin-Ups", "equipment": ["pull_up_bar"]},
        {"name": "Dumbbell Bent-Over Rows", "equipment": ["dumbbells"]},
        {"name": "Barbell Bent-Over Rows", "equipment": ["barbell"]},
        {"name": "Lat Pulldown Machine", "equipment": ["machine"]},
        {"name": "Seated Cable Row", "equipment": ["cable"]},
    ],
    "Shoulders": [
        {"name": "Pike Push-Ups", "equipment": []},
        {"name": "Resistance Band Lateral Raises", "equipment": ["bands"]},
        {"name": "Dumbbell Shoulder Press", "equipment": ["dumbbells"]},
        {"name": "Dumbbell Lateral Raises", "equipment": ["dumbbells"]},
        {"name": "Barbell Overhead Press", "equipment": ["barbell"]},
        {"name": "Shoulder Press Machine", "equipment": ["machine"]},
    ],
    "Biceps": [
        {"name": "Resistance Band Curls", "equipment": ["bands"]},
        {"name": "Dumbbell Bicep Curls", "equipment": ["dumbbells"]},
        {"name": "Chin-Ups (Bicep Focus)", "equipment": ["pull_up_bar"]},
        {"name": "Barbell Bicep Curls", "equipment": ["barbell"]},
        {"name": "Cable Bicep Curls", "equipment": ["cable"]},
    ],
    "Triceps": [
        {"name": "Tricep Dips (Chair)", "equipment": []},
        {"name": "Diamond Push-Ups", "equipment": []},
        {"name": "Resistance Band Tricep Extensions", "equipment": ["bands"]},
        {"name": "Dumbbell Tricep Extensions", "equipment": ["dumbbells"]},
        {"name": "Cable Tricep Pushdown", "equipment": ["cable"]},
        {"name": "Close-Grip Barbell Press", "equipment": ["barbell"]},
    ],
    "Legs": [
        {"name": "Bodyweight Squats", "equipment": []},
        {"name": "Walking Lunges", "equipment": []},
        {"name": "Glute Bridges", "equipment": []},
        {"name": "Resistance Band Squats", "equipment": ["bands"]},
        {"name": "Dumbbell Goblet Squats", "equipment": ["dumbbells"]},
        {"name": "Dumbbell Lunges", "equipment": ["dumbbells"]},
        {"name": "Barbell Back Squats", "equipment": ["barbell"]},
        {"name": "Barbell Romanian Deadlifts", "equipment": ["barbell"]},
        {"name": "Leg Press Machine", "equipment": ["machine"]},
        {"name": "Leg Curl Machine", "equipment": ["machine"]},
    ],
    "Core": [
        {"name": "Plank", "equipment": []},
        {"name": "Bicycle Crunches", "equipment": []},
        {"name": "Mountain Climbers", "equipment": []},
        {"name": "Russian Twists", "equipment": []},
        {"name": "Hanging Leg Raises", "equipment": ["pull_up_bar"]},
        {"name": "Cable Woodchoppers", "equipment": ["cable"]},
    ],
    "Cardio": [
        {"name": "Jumping Jacks", "equipment": []},
        {"name": "High Knees", "equipment": []},
        {"name": "Burpees", "equipment": []},
        {"name": "Jump Rope", "equipment": []},
        {"name": "Treadmill Intervals", "equipment": ["machine"]},
        {"name": "Rowing Machine Intervals", "equipment": ["machine"]},
    ],
}

# ---------------------------------------------------------------------------
# Weekly split templates: the focus for each *training* day, based on how
# many days per week the user is available.
# ---------------------------------------------------------------------------
SPLIT_TEMPLATES = {
    3: {
        "name": "Full Body (3-Day Split)",
        "focuses": ["Full Body", "Full Body", "Full Body"],
    },
    4: {
        "name": "Upper / Lower (4-Day Split)",
        "focuses": ["Upper Body", "Lower Body", "Upper Body", "Lower Body"],
    },
    5: {
        "name": "Body Part Split (5-Day Split)",
        "focuses": ["Chest & Triceps", "Back & Biceps", "Legs", "Shoulders & Core", "Cardio & Core"],
    },
    6: {
        "name": "Push / Pull / Legs (6-Day Split)",
        "focuses": ["Push", "Pull", "Legs", "Push", "Pull", "Legs"],
    },
}

# Which muscle groups make up each focus label used above.
FOCUS_MUSCLE_GROUPS = {
    "Full Body": ["Legs", "Chest", "Back", "Shoulders", "Core"],
    "Upper Body": ["Chest", "Back", "Shoulders", "Biceps", "Triceps"],
    "Lower Body": ["Legs", "Core"],
    "Push": ["Chest", "Shoulders", "Triceps"],
    "Pull": ["Back", "Biceps"],
    "Legs": ["Legs", "Core"],
    "Chest & Triceps": ["Chest", "Triceps"],
    "Back & Biceps": ["Back", "Biceps"],
    "Shoulders & Core": ["Shoulders", "Core"],
    "Cardio & Core": ["Cardio", "Core"],
}

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

# Which weekday (0=Monday) is a training day, per days-per-week choice.
# Spreads training out and keeps rest days sensibly placed.
TRAINING_DAY_INDEXES = {
    3: [0, 2, 4],           # Mon, Wed, Fri
    4: [0, 1, 3, 4],         # Mon, Tue, Thu, Fri
    5: [0, 1, 2, 3, 4],      # Mon - Fri
    6: [0, 1, 2, 3, 4, 5],   # Mon - Sat
}

SETS_BY_LEVEL = {
    FitnessLevel.BEGINNER: 3,
    FitnessLevel.INTERMEDIATE: 4,
    FitnessLevel.ADVANCED: 5,
}

BASE_REST_SECONDS_BY_LEVEL = {
    FitnessLevel.BEGINNER: 60,
    FitnessLevel.INTERMEDIATE: 75,
    FitnessLevel.ADVANCED: 90,
}

# Rep ranges tuned to each nutrition goal (reused from the nutrition form -
# we never ask the user for their goal twice).
REP_RANGE_BY_GOAL = {
    Goal.CUT: "12-15",           # higher reps, shorter rest - metabolic focus
    Goal.MAINTENANCE: "10-12",   # standard hypertrophy range
    Goal.LEAN_BULK: "8-10",      # moderate-heavy, muscle-building focus
    Goal.BULK: "6-8",            # heavier, strength-building focus
}

# How many exercises fit in a session, scaled by available time.
EXERCISE_COUNT_BY_DURATION = {
    30: 3,
    45: 4,
    60: 5,
    90: 7,
}


def _available_equipment_tags(location: WorkoutLocation, equipment: Equipment | None) -> set[str]:
    """Returns the set of equipment tags the user can actually train with."""
    if location == WorkoutLocation.GYM:
        return GYM_EQUIPMENT_ACCESS
    return HOME_EQUIPMENT_ACCESS.get(equipment, {"bodyweight"})


def _exercises_for_muscle_group(muscle_group: str, available_tags: set[str]) -> list[dict]:
    """Every exercise for a muscle group that the user's equipment supports."""
    pool = EXERCISE_LIBRARY.get(muscle_group, [])
    matches = [
        exercise for exercise in pool
        if not exercise["equipment"] or set(exercise["equipment"]).issubset(available_tags)
    ]
    # Guarantee every muscle group always has at least one valid exercise,
    # even for "No Equipment" at home, by falling back to bodyweight moves.
    if not matches:
        matches = [exercise for exercise in pool if not exercise["equipment"]]
    return matches


def _build_exercise_list(
    focus: str,
    available_tags: set[str],
    exercise_count: int,
    sets: int,
    reps: str,
    rest_seconds: int,
) -> list[Exercise]:
    """
    Cycles through the focus's muscle groups, picking one supported
    exercise from each in turn, until the session has `exercise_count`
    exercises. Deterministic (no randomness), so the same inputs always
    produce the same plan.
    """
    muscle_groups = FOCUS_MUSCLE_GROUPS.get(focus, ["Full Body"])
    exercises: list[Exercise] = []
    used_names: set[str] = set()
    group_index = 0
    max_attempts = exercise_count * len(muscle_groups) * 3 + 10
    attempts = 0

    while len(exercises) < exercise_count and attempts < max_attempts:
        muscle_group = muscle_groups[group_index % len(muscle_groups)]
        candidates = _exercises_for_muscle_group(muscle_group, available_tags)

        if candidates:
            already_picked = sum(1 for e in exercises if e.muscle_group == muscle_group)
            unused = [c for c in candidates if c["name"] not in used_names]
            pool = unused if unused else candidates
            chosen = pool[already_picked % len(pool)]

            exercises.append(
                Exercise(
                    name=chosen["name"],
                    sets=sets,
                    reps=reps,
                    rest_seconds=rest_seconds,
                    muscle_group=muscle_group,
                )
            )
            used_names.add(chosen["name"])

        group_index += 1
        attempts += 1

    return exercises[:exercise_count]


def generate_workout_plan(
    goal: Goal,
    fitness_level: FitnessLevel,
    workout_location: WorkoutLocation,
    available_days: int,
    workout_duration: int,
    equipment: Equipment | None,
) -> WorkoutPlan:
    """Builds a full 7-day schedule from the user's workout preferences."""

    template = SPLIT_TEMPLATES[available_days]
    training_indexes = TRAINING_DAY_INDEXES[available_days]
    available_tags = _available_equipment_tags(workout_location, equipment)

    sets = SETS_BY_LEVEL[fitness_level]
    reps = REP_RANGE_BY_GOAL[goal]
    rest_seconds = BASE_REST_SECONDS_BY_LEVEL[fitness_level]

    # Cut goals favor shorter rest (more metabolic conditioning); bulk
    # goals favor slightly longer rest (more focus on heavier lifting).
    if goal == Goal.CUT:
        rest_seconds = max(30, rest_seconds - 15)
    elif goal == Goal.BULK:
        rest_seconds += 15

    exercise_count = EXERCISE_COUNT_BY_DURATION[workout_duration]

    days: list[WorkoutDay] = []
    active_recovery_assigned = False

    for day_index, day_name in enumerate(DAY_NAMES):
        if day_index in training_indexes:
            focus = template["focuses"][training_indexes.index(day_index)]
            exercises = _build_exercise_list(
                focus, available_tags, exercise_count, sets, reps, rest_seconds
            )
            days.append(
                WorkoutDay(
                    day_name=day_name,
                    is_rest_day=False,
                    focus=focus,
                    exercises=exercises,
                    estimated_duration_minutes=workout_duration,
                )
            )
        elif not active_recovery_assigned:
            # The first non-training day of the week becomes a light
            # "Active Recovery" day rather than a full rest day.
            days.append(
                WorkoutDay(
                    day_name=day_name,
                    is_rest_day=True,
                    focus="Active Recovery",
                    exercises=[
                        Exercise(
                            name="Light Walk or Stretching",
                            sets=1,
                            reps="20-30 minutes",
                            rest_seconds=0,
                            muscle_group="Full Body",
                        )
                    ],
                    estimated_duration_minutes=20,
                )
            )
            active_recovery_assigned = True
        else:
            days.append(
                WorkoutDay(
                    day_name=day_name,
                    is_rest_day=True,
                    focus="Rest Day",
                    exercises=[],
                    estimated_duration_minutes=0,
                )
            )

    total_weekly_training_minutes = sum(
        day.estimated_duration_minutes for day in days if not day.is_rest_day
    )
    recommended_rest_days = sum(1 for day in days if day.is_rest_day)

    summary = WorkoutSummary(
        weekly_split=template["name"],
        total_workout_days=available_days,
        total_weekly_training_minutes=total_weekly_training_minutes,
        recommended_rest_days=recommended_rest_days,
    )

    return WorkoutPlan(summary=summary, days=days)
