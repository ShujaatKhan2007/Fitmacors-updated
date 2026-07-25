import { useState } from "react";

// A simple emoji "icon" per muscle group, used for the animated
// placeholder shown whenever a real animation file isn't available yet.
const MUSCLE_GROUP_ICONS = {
  Chest: "💪",
  Back: "🏋️",
  Shoulders: "🙆",
  Biceps: "💪",
  Triceps: "💪",
  Legs: "🦵",
  Core: "🔥",
  Cardio: "🏃",
  "Full Body": "🤸",
};

/**
 * ExerciseAnimation.jsx
 * ----------------------
 * Loads the real exercise animation from /exercise-animations/{filename}
 * if it exists. If the file is missing (which it will be, until real
 * GIFs are added to that folder - see its README), this falls back to a
 * clean, looping CSS-animated placeholder instead of a broken image.
 */
export default function ExerciseAnimation({ filename, muscleGroup, exerciseName }) {
  const [hasError, setHasError] = useState(false);
  const icon = MUSCLE_GROUP_ICONS[muscleGroup] || "🏋️";

  if (!filename || hasError) {
    return (
      <div className="exercise-animation exercise-animation--placeholder" role="img" aria-label={exerciseName}>
        <span className="exercise-animation__icon">{icon}</span>
        <span className="exercise-animation__placeholder-label">{exerciseName}</span>
      </div>
    );
  }

  return (
    <div className="exercise-animation">
      <img
        src={`/exercise-animations/${filename}`}
        alt={exerciseName}
        onError={() => setHasError(true)}
        loading="eager"
      />
    </div>
  );
}
