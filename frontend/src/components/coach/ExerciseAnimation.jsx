import { useEffect, useState } from "react";

// A simple emoji "icon" per muscle group, used for the animated
// placeholder shown whenever no real animation file is available.
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
 * Loads the real exercise animation for /exercise-animations/{name}, if
 * one exists. The backend only ever sends a ".gif" filename, but this
 * component tries a few real formats before giving up, in this order:
 *
 *   1. {name}.mp4  - preferred: smaller file size, smoother playback
 *   2. {name}.gif  - the exact filename the backend sent
 *   3. animated placeholder - shown if neither file exists yet
 *
 * This means you can drop in either an .mp4 or a .gif with the matching
 * base name (e.g. "pushup.mp4" or "pushup.gif") and it'll just be picked
 * up automatically - no code changes needed either way.
 */
export default function ExerciseAnimation({ filename, muscleGroup, exerciseName }) {
  const [mediaType, setMediaType] = useState("video"); // "video" | "gif" | "placeholder"
  const icon = MUSCLE_GROUP_ICONS[muscleGroup] || "🏋️";

  // Reset back to "try video first" whenever the exercise changes.
  useEffect(() => {
    setMediaType("video");
  }, [filename]);

  if (!filename || mediaType === "placeholder") {
    return (
      <div className="exercise-animation exercise-animation--placeholder" role="img" aria-label={exerciseName}>
        <span className="exercise-animation__icon">{icon}</span>
        <span className="exercise-animation__placeholder-label">{exerciseName}</span>
      </div>
    );
  }

  const baseName = filename.replace(/\.gif$/i, "");

  if (mediaType === "video") {
    return (
      <div className="exercise-animation">
        <video
          key={baseName}
          src={`/exercise-animations/${baseName}.mp4`}
          autoPlay
          loop
          muted
          playsInline
          onError={() => setMediaType("gif")}
        />
      </div>
    );
  }

  return (
    <div className="exercise-animation">
      <img
        src={`/exercise-animations/${filename}`}
        alt={exerciseName}
        onError={() => setMediaType("placeholder")}
        loading="eager"
      />
    </div>
  );
}
