"""
exercise_guidance.py
---------------------
Extra per-exercise information used by Workout Coach Mode: which animation
file to show, step-by-step instructions, common mistakes to avoid, whether
the exercise is timed (like a Plank) instead of rep-based, and a rough
calorie estimate.

IMPORTANT - about animations: this file only decides which *filename* an
exercise maps to (e.g. "Push-Ups" -> "pushup.gif"). It does not contain or
generate any actual image/GIF data - the frontend is responsible for
loading that file from its own `public/exercise-animations/` folder, and
shows a graceful fallback if the file isn't there yet. See that folder's
README for details.

To add guidance for a new exercise, add one entry to EXERCISE_GUIDANCE.
Anything not listed there automatically gets a sensible generic fallback,
so nothing ever breaks - it just won't have exercise-specific tips yet.
"""

import re

# ---------------------------------------------------------------------------
# Animation filenames.
# Most exercises get an automatically generated filename (a "slugified"
# version of their name). A few get an explicit override so the filename
# matches common naming conventions (e.g. "Push-Ups" -> "pushup.gif"
# instead of the auto-generated "push_ups.gif").
# ---------------------------------------------------------------------------
ANIMATION_FILENAME_OVERRIDES = {
    "Push-Ups": "pushup.gif",
    "Incline Push-Ups": "incline_pushup.gif",
    "Diamond Push-Ups": "diamond_pushup.gif",
    "Pike Push-Ups": "pike_pushup.gif",
    "Bodyweight Squats": "squat.gif",
    "Dumbbell Goblet Squats": "goblet_squat.gif",
    "Barbell Back Squats": "barbell_squat.gif",
    "Walking Lunges": "lunges.gif",
    "Dumbbell Lunges": "lunges.gif",
    "Jumping Jacks": "jumping_jacks.gif",
    "Dumbbell Shoulder Press": "shoulder_press.gif",
    "Barbell Overhead Press": "shoulder_press.gif",
    "Shoulder Press Machine": "shoulder_press.gif",
    "Plank": "plank.gif",
}


def get_animation_filename(exercise_name: str) -> str:
    """Returns the animation filename the frontend should look for."""
    if exercise_name in ANIMATION_FILENAME_OVERRIDES:
        return ANIMATION_FILENAME_OVERRIDES[exercise_name]

    # Auto-generate a simple, predictable filename from the exercise name:
    # lowercase, non-alphanumeric characters become underscores.
    slug = re.sub(r"[^a-z0-9]+", "_", exercise_name.lower()).strip("_")
    return f"{slug}.gif"


# ---------------------------------------------------------------------------
# Time-based exercises: held for a duration instead of counted in reps.
# Maps exercise name -> base hold duration (seconds) per fitness level.
# ---------------------------------------------------------------------------
TIME_BASED_EXERCISES = {
    "Plank": {"beginner": 20, "intermediate": 30, "advanced": 45},
    "Wall Sit": {"beginner": 20, "intermediate": 30, "advanced": 45},
    "Hollow Hold": {"beginner": 15, "intermediate": 25, "advanced": 35},
}


def is_time_based(exercise_name: str) -> bool:
    return exercise_name in TIME_BASED_EXERCISES


def get_duration_seconds(exercise_name: str, fitness_level_value: str) -> int:
    """Returns the hold duration for a time-based exercise, in seconds."""
    durations = TIME_BASED_EXERCISES.get(exercise_name)
    if not durations:
        return 30
    return durations.get(fitness_level_value, 30)


# ---------------------------------------------------------------------------
# Rough calorie-burn estimate per set, by muscle group category. This is a
# simple, transparent heuristic (not a medical or scientifically precise
# calculation) - just enough to give the user a ballpark number in the
# workout summary screen.
# ---------------------------------------------------------------------------
CALORIES_PER_SET_BY_GROUP = {
    "Cardio": 12,
    "Legs": 8,
    "Chest": 6,
    "Back": 6,
    "Shoulders": 5,
    "Biceps": 4,
    "Triceps": 4,
    "Core": 5,
    "Full Body": 9,
}


def estimate_calories(muscle_group: str, sets: int) -> float:
    """A rough per-exercise calorie estimate, scaled by number of sets."""
    rate = CALORIES_PER_SET_BY_GROUP.get(muscle_group, 6)
    return round(rate * sets, 1)


# ---------------------------------------------------------------------------
# Step-by-step instructions and common mistakes, per exercise. Exercises
# not listed here fall back to GENERIC_GUIDANCE, so every exercise always
# has something reasonable to show - just not hand-written tips yet.
# ---------------------------------------------------------------------------
GENERIC_GUIDANCE = {
    "instructions": [
        "Set up with good posture before starting the movement.",
        "Move through the full range of motion under control.",
        "Breathe steadily - exhale on the effort, inhale on the return.",
        "Keep the movement smooth rather than rushed or jerky.",
    ],
    "common_mistakes": [
        "Rushing through reps instead of controlling the movement.",
        "Using momentum instead of muscle control.",
        "Holding your breath throughout the set.",
    ],
}

EXERCISE_GUIDANCE = {
    "Push-Ups": {
        "instructions": [
            "Start in a plank position with hands slightly wider than shoulders.",
            "Keep your body in a straight line from head to heels.",
            "Lower until your chest is close to the floor.",
            "Push back up to the starting position with control.",
        ],
        "common_mistakes": [
            "Dropping the hips toward the floor.",
            "Only doing a partial range of motion.",
            "Flaring the elbows out to 90 degrees instead of a slight angle.",
        ],
    },
    "Incline Push-Ups": {
        "instructions": [
            "Place your hands on a stable elevated surface like a bench or step.",
            "Keep your body straight from head to heels.",
            "Lower your chest toward the surface, then push back up.",
        ],
        "common_mistakes": [
            "Using a surface that's unstable or too low for control.",
            "Letting the hips sag during the movement.",
        ],
    },
    "Diamond Push-Ups": {
        "instructions": [
            "Form a diamond shape with your thumbs and index fingers under your chest.",
            "Lower your chest toward your hands, keeping elbows close to your body.",
            "Push back up with control.",
        ],
        "common_mistakes": [
            "Flaring the elbows out wide, reducing triceps focus.",
            "Sagging hips or an arched lower back.",
        ],
    },
    "Pike Push-Ups": {
        "instructions": [
            "Start in a downward-dog-like position, hips high, hands on the floor.",
            "Lower your head toward the floor by bending your elbows.",
            "Push back up to the starting position.",
        ],
        "common_mistakes": [
            "Letting the hips drop, turning it into a regular push-up.",
            "Placing hands too close, limiting range of motion.",
        ],
    },
    "Tricep Dips (Chair)": {
        "instructions": [
            "Sit on the edge of a sturdy chair with hands beside your hips.",
            "Slide your hips off the chair, supporting your weight with your arms.",
            "Lower your body by bending your elbows, then push back up.",
        ],
        "common_mistakes": [
            "Letting the shoulders shrug up toward the ears.",
            "Going too low and straining the shoulder joints.",
        ],
    },
    "Bodyweight Squats": {
        "instructions": [
            "Stand with feet shoulder-width apart, toes slightly turned out.",
            "Push your hips back and bend your knees to lower down.",
            "Keep your chest up and knees tracking over your toes.",
            "Drive through your heels to stand back up.",
        ],
        "common_mistakes": [
            "Letting the knees cave inward.",
            "Rounding the lower back at the bottom of the squat.",
            "Rising onto the toes instead of staying grounded through the heels.",
        ],
    },
    "Dumbbell Goblet Squats": {
        "instructions": [
            "Hold a dumbbell vertically against your chest with both hands.",
            "Squat down by pushing your hips back and bending your knees.",
            "Keep your chest tall and elbows inside your knees at the bottom.",
            "Drive through your heels to return to standing.",
        ],
        "common_mistakes": [
            "Letting the dumbbell pull your torso forward.",
            "Not squatting deep enough to engage the glutes fully.",
        ],
    },
    "Barbell Back Squats": {
        "instructions": [
            "Position the bar across your upper back, not your neck.",
            "Stand with feet shoulder-width apart, brace your core.",
            "Squat down keeping your chest up and knees tracking your toes.",
            "Drive through your heels to stand back up.",
        ],
        "common_mistakes": [
            "Letting the knees collapse inward under load.",
            "Losing core brace and rounding the lower back.",
            "Not reaching adequate depth.",
        ],
    },
    "Walking Lunges": {
        "instructions": [
            "Step forward with one leg, lowering your hips until both knees are bent about 90 degrees.",
            "Keep your torso upright throughout the movement.",
            "Push off through the front heel to step into the next lunge.",
        ],
        "common_mistakes": [
            "Letting the front knee travel too far past the toes.",
            "Taking too short a step, limiting range of motion.",
        ],
    },
    "Dumbbell Lunges": {
        "instructions": [
            "Hold a dumbbell in each hand at your sides.",
            "Step forward into a lunge, lowering the back knee toward the floor.",
            "Push back to the starting position and repeat on the other side.",
        ],
        "common_mistakes": [
            "Leaning the torso too far forward.",
            "Letting the front knee cave inward.",
        ],
    },
    "Glute Bridges": {
        "instructions": [
            "Lie on your back with knees bent and feet flat on the floor.",
            "Squeeze your glutes and lift your hips toward the ceiling.",
            "Pause briefly at the top, then lower with control.",
        ],
        "common_mistakes": [
            "Overarching the lower back instead of squeezing the glutes.",
            "Not lifting the hips high enough to fully engage the glutes.",
        ],
    },
    "Plank": {
        "instructions": [
            "Support your body on your forearms and toes, elbows under shoulders.",
            "Keep your body in a straight line from head to heels.",
            "Engage your core and glutes throughout the hold.",
            "Breathe steadily - don't hold your breath.",
        ],
        "common_mistakes": [
            "Letting the hips sag toward the floor.",
            "Piking the hips up too high.",
            "Holding your breath during the hold.",
        ],
    },
    "Wall Sit": {
        "instructions": [
            "Lean your back against a wall and slide down until knees are at 90 degrees.",
            "Keep your feet flat and knees aligned over your ankles.",
            "Hold the position, keeping your core braced.",
        ],
        "common_mistakes": [
            "Letting the knees travel past the toes.",
            "Placing feet too close to the wall, straining the knees.",
        ],
    },
    "Hollow Hold": {
        "instructions": [
            "Lie on your back and press your lower back into the floor.",
            "Lift your shoulders and legs slightly off the ground.",
            "Reach your arms overhead or by your sides, keeping the core tight.",
        ],
        "common_mistakes": [
            "Letting the lower back arch off the floor.",
            "Lifting the legs too high, reducing core engagement.",
        ],
    },
    "Bicycle Crunches": {
        "instructions": [
            "Lie on your back with hands behind your head, knees bent.",
            "Bring one elbow toward the opposite knee while extending the other leg.",
            "Alternate sides in a smooth, controlled pedaling motion.",
        ],
        "common_mistakes": [
            "Pulling on the neck with your hands.",
            "Moving too fast and losing control of the motion.",
        ],
    },
    "Mountain Climbers": {
        "instructions": [
            "Start in a plank position with hands under shoulders.",
            "Drive one knee toward your chest, then quickly switch legs.",
            "Keep your hips low and core engaged throughout.",
        ],
        "common_mistakes": [
            "Letting the hips pike up too high.",
            "Losing plank alignment as fatigue sets in.",
        ],
    },
    "Russian Twists": {
        "instructions": [
            "Sit with knees bent, leaning back slightly to engage the core.",
            "Rotate your torso side to side, tapping the floor beside your hips.",
            "Keep your chest up rather than rounding forward.",
        ],
        "common_mistakes": [
            "Rounding the back excessively.",
            "Moving too fast at the expense of control.",
        ],
    },
    "Jumping Jacks": {
        "instructions": [
            "Start standing with feet together, arms at your sides.",
            "Jump your feet out while raising your arms overhead.",
            "Jump back to the starting position and repeat rhythmically.",
        ],
        "common_mistakes": [
            "Landing stiff-legged instead of with soft knees.",
            "Losing rhythm and control as fatigue builds.",
        ],
    },
    "High Knees": {
        "instructions": [
            "Jog in place, driving your knees up toward your chest.",
            "Keep your core engaged and land softly on the balls of your feet.",
            "Pump your arms in rhythm with your legs.",
        ],
        "common_mistakes": [
            "Leaning too far backward.",
            "Not driving the knees high enough to be effective.",
        ],
    },
    "Burpees": {
        "instructions": [
            "From standing, drop into a squat and place your hands on the floor.",
            "Kick your feet back into a plank position.",
            "Return your feet to your hands, then jump up explosively.",
        ],
        "common_mistakes": [
            "Letting the hips sag during the plank phase.",
            "Skipping the full range of motion to go faster.",
        ],
    },
    "Superman Hold": {
        "instructions": [
            "Lie face down with arms extended in front of you.",
            "Simultaneously lift your arms, chest, and legs off the floor.",
            "Hold briefly, then lower with control.",
        ],
        "common_mistakes": [
            "Jerking into the position instead of a controlled lift.",
            "Overextending the neck by looking up too far.",
        ],
    },
    "Pull-Ups": {
        "instructions": [
            "Hang from a bar with hands slightly wider than shoulder-width.",
            "Pull your body up until your chin clears the bar.",
            "Lower back down with control to a full hang.",
        ],
        "common_mistakes": [
            "Using momentum (kipping) instead of controlled strength.",
            "Not achieving a full range of motion at the bottom.",
        ],
    },
    "Chin-Ups": {
        "instructions": [
            "Hang from a bar with palms facing you, hands shoulder-width apart.",
            "Pull your body up until your chin clears the bar.",
            "Lower back down with control.",
        ],
        "common_mistakes": [
            "Swinging the body to generate momentum.",
            "Cutting the range of motion short at the top or bottom.",
        ],
    },
    "Dumbbell Chest Press": {
        "instructions": [
            "Lie on a bench holding dumbbells above your chest, arms extended.",
            "Lower the dumbbells with control until your elbows are about 90 degrees.",
            "Press back up to the starting position.",
        ],
        "common_mistakes": [
            "Flaring the elbows out to a full 90 degrees from the body.",
            "Bouncing the dumbbells at the bottom instead of controlling the descent.",
        ],
    },
    "Dumbbell Shoulder Press": {
        "instructions": [
            "Hold dumbbells at shoulder height, palms facing forward.",
            "Press the dumbbells overhead until your arms are extended.",
            "Lower back to shoulder height with control.",
        ],
        "common_mistakes": [
            "Arching the lower back excessively to press the weight up.",
            "Not fully extending the arms at the top.",
        ],
    },
    "Dumbbell Bicep Curls": {
        "instructions": [
            "Hold dumbbells at your sides with palms facing forward.",
            "Curl the weights up toward your shoulders, keeping elbows still.",
            "Lower back down with control.",
        ],
        "common_mistakes": [
            "Swinging the body to help lift the weight.",
            "Letting the elbows drift forward during the curl.",
        ],
    },
    "Dumbbell Bent-Over Rows": {
        "instructions": [
            "Hinge at the hips with a flat back, dumbbells hanging below your shoulders.",
            "Pull the dumbbells toward your hips, squeezing your shoulder blades.",
            "Lower back down with control.",
        ],
        "common_mistakes": [
            "Rounding the lower back during the hinge.",
            "Using momentum instead of controlled pulling strength.",
        ],
    },
    "Barbell Bench Press": {
        "instructions": [
            "Lie on a bench with the bar over your chest, hands slightly wider than shoulders.",
            "Lower the bar to your chest with control.",
            "Press the bar back up to full arm extension.",
        ],
        "common_mistakes": [
            "Bouncing the bar off the chest.",
            "Flaring the elbows out to a full 90 degrees.",
        ],
    },
    "Barbell Bent-Over Rows": {
        "instructions": [
            "Hinge at the hips with a flat back, barbell hanging below your shoulders.",
            "Pull the bar toward your lower ribcage, squeezing your shoulder blades.",
            "Lower back down with control.",
        ],
        "common_mistakes": [
            "Rounding the back under load.",
            "Standing too upright, reducing the row's effectiveness.",
        ],
    },
    "Barbell Overhead Press": {
        "instructions": [
            "Hold the bar at shoulder height, hands just outside shoulder-width.",
            "Press the bar overhead until your arms are fully extended.",
            "Lower back to shoulder height with control.",
        ],
        "common_mistakes": [
            "Arching the lower back excessively.",
            "Pressing the bar forward instead of straight overhead.",
        ],
    },
}


def get_guidance(exercise_name: str) -> dict:
    """Returns {"instructions": [...], "common_mistakes": [...]} for an exercise."""
    return EXERCISE_GUIDANCE.get(exercise_name, GENERIC_GUIDANCE)
