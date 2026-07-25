# Exercise Animations

This folder is where Workout Coach Mode looks for exercise animation
files. It's empty by default - the backend only ever sends a *filename*
(e.g. `pushup.gif`), never the actual image, so nothing here is required
for the app to work. Until you add real files, the app automatically
shows a clean animated placeholder instead (see `ExerciseAnimation.jsx`).

## Video (.mp4) or GIF - both work

The frontend checks for a match in this order, for each exercise:

1. `{name}.mp4` - **preferred**: much smaller file size and smoother
   playback than a GIF for the same clip. Plays automatically, loops
   continuously, muted (so autoplay isn't blocked by the browser).
2. `{name}.gif` - used if no `.mp4` is found.
3. Animated placeholder - shown if neither file exists yet.

You only ever need ONE of the two per exercise - if you have an MP4,
you don't need a GIF too.

## How to add your own animations

1. Get a video or GIF for an exercise. Make sure you have the rights to
   use it - your own recordings, AI-generated clips you have rights to,
   or properly licensed stock/royalty-free fitness footage all work.
2. Name the file to match what the backend sends, using `.mp4` (or
   `.gif`) instead of whatever format you started with. You can see the
   exact filename FastAPI generates for any exercise by checking the
   `animation_filename` field in a `/calculate` response, or by looking
   at `backend/app/exercise_guidance.py`.
   - Example: the backend sends `pushup.gif` for Push-Ups, so an MP4
     version of that clip should be named `pushup.mp4`.
3. Drop the file directly in this folder: `frontend/public/exercise-animations/`.
4. That's it - no code changes needed. The next time that exercise comes
   up in a workout, your real animation loads automatically instead of
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
