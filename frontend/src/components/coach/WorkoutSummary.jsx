const MOTIVATIONAL_MESSAGES = [
  "You showed up and put in the work - that's what builds real progress. 💪",
  "Another session in the bank. Consistency like this adds up fast!",
  "Strong effort today. Your future self is already thanking you.",
  "That's exactly the kind of consistency that gets real results.",
];

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

/**
 * WorkoutSummary.jsx
 * -------------------
 * The celebration screen shown after the last exercise (or after ending
 * the workout early). Summarizes what was actually completed.
 */
export default function WorkoutSummary({ stats, onReturnToDashboard, onRepeatWorkout }) {
  const message = MOTIVATIONAL_MESSAGES[stats.exercisesCompleted % MOTIVATIONAL_MESSAGES.length];

  return (
    <div className="workout-summary">
      <p className="workout-summary__emoji">🎉</p>
      <h2>Workout Complete!</h2>
      <p className="workout-summary__message">{message}</p>

      <div className="workout-summary__stats">
        <div className="workout-summary__stat">
          <span className="workout-summary__stat-value">{stats.exercisesCompleted}</span>
          <span className="workout-summary__stat-label">Exercises Completed</span>
        </div>
        <div className="workout-summary__stat">
          <span className="workout-summary__stat-value">{formatDuration(stats.durationSeconds)}</span>
          <span className="workout-summary__stat-label">Total Duration</span>
        </div>
        <div className="workout-summary__stat">
          <span className="workout-summary__stat-value">{stats.setsCompleted}</span>
          <span className="workout-summary__stat-label">Sets Completed</span>
        </div>
        <div className="workout-summary__stat">
          <span className="workout-summary__stat-value">{Math.round(stats.caloriesBurned)}</span>
          <span className="workout-summary__stat-label">Est. Calories Burned</span>
        </div>
      </div>

      <div className="workout-summary__completion">
        <div className="workout-summary__completion-track">
          <div
            className="workout-summary__completion-fill"
            style={{ width: `${stats.completionPercent}%` }}
          />
        </div>
        <span>{stats.completionPercent}% Complete</span>
      </div>

      <div className="workout-summary__actions">
        <button type="button" className="cta-button" onClick={onReturnToDashboard}>
          Return to Dashboard
        </button>
        <button type="button" className="ghost-button" onClick={onRepeatWorkout}>
          Repeat Workout
        </button>
      </div>
    </div>
  );
}
