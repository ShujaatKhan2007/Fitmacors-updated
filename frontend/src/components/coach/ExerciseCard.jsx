import ExerciseAnimation from "./ExerciseAnimation.jsx";
import CountdownTimer from "./CountdownTimer.jsx";

/**
 * ExerciseCard.jsx
 * -----------------
 * The main "doing the exercise" screen: animation, exercise info, set
 * tracking (rep-based "Complete Set" button, or a countdown timer for
 * time-based holds like Plank), instructions, and common mistakes.
 */
export default function ExerciseCard({ exercise, currentSet, isPaused, onCompleteSet }) {
  return (
    <div className="exercise-card">
      <ExerciseAnimation
        filename={exercise.animation_filename}
        muscleGroup={exercise.muscle_group}
        exerciseName={exercise.name}
      />

      <div className="exercise-card__header">
        <h2>{exercise.name}</h2>
        <span className="exercise-card__muscle-badge">{exercise.muscle_group}</span>
      </div>

      <p className="exercise-card__set-label">
        Set {currentSet} of {exercise.sets}
      </p>

      {exercise.is_time_based ? (
        <div className="exercise-card__timer-section">
          <CountdownTimer
            seconds={exercise.duration_seconds}
            isPaused={isPaused}
            onComplete={onCompleteSet}
          />
        </div>
      ) : (
        <div className="exercise-card__reps-section">
          <p className="exercise-card__reps">{exercise.reps} Repetitions</p>
          <button
            type="button"
            className="cta-button"
            onClick={onCompleteSet}
            disabled={isPaused}
          >
            ✓ Complete Set
          </button>
          <p className="exercise-card__auto-advance-hint">
            You'll move on automatically after this
          </p>
        </div>
      )}

      <p className="exercise-card__meta">
        Suggested rest between sets: {exercise.rest_seconds}s
        {exercise.calories_estimate ? ` · ~${exercise.calories_estimate} kcal` : ""}
      </p>

      <div className="exercise-card__details">
        <div className="exercise-card__detail-block">
          <h4>📋 Instructions</h4>
          <ul>
            {exercise.instructions.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </div>

        <div className="exercise-card__detail-block exercise-card__detail-block--mistakes">
          <h4>⚠️ Common Mistakes</h4>
          <ul>
            {exercise.common_mistakes.map((mistake) => (
              <li key={mistake}>{mistake}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
