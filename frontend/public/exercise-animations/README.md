# Exercise Animations

This folder is where Workout Coach Mode looks for exercise animation
files. It's empty by default - the backend only ever sends a *filename*
(e.g. `pushup.gif`), never the actual image, so nothing here is required
for the app to work. Until you add real files, the app automatically
shows a clean animated placeholder instead (see `ExerciseAnimation.jsx`).

## How to add your own animations

1. Get a GIF (or short looping video converted to GIF) for an exercise.
   Make sure you have the rights to use it - your own recordings, or
   properly licensed stock/royalty-free fitness GIFs work well.
2. Name the file to match what the backend sends. You can see the exact
   filename FastAPI generates for any exercise by checking the
   `animation_filename` field in a `/calculate` response, or by looking
   at `backend/app/exercise_guidance.py`.
3. Drop the file directly in this folder: `frontend/public/exercise-animations/`.
4. That's it - no code changes needed. The next time that exercise comes
   up in a workout, its real animation will load automatically instead of
   the placeholder.

## Naming reference

A few examples of filenames the backend already generates:

| Exercise          | Filename            |
|--------------------|----------------------|
| Push-Ups           | `pushup.gif`         |
| Bodyweight Squats  | `squat.gif`          |
| Plank              | `plank.gif`          |
| Walking Lunges     | `lunges.gif`         |
| Jumping Jacks      | `jumping_jacks.gif`  |
| Dumbbell Shoulder Press | `shoulder_press.gif` |

Most other exercises get an automatically generated filename: the
exercise name, lowercased, with spaces and punctuation replaced by
underscores (e.g. "Dumbbell Bicep Curls" -> `dumbbell_bicep_curls.gif`).
See `get_animation_filename()` in `backend/app/exercise_guidance.py` for
the exact rule, and to add your own overrides.
