/**
 * WorkoutPlanDashboard.jsx
 * ------------------------
 * Renders the weekly workout plan returned by the backend: a summary row
 * (split name, workout days, weekly training time, rest days) followed by
 * a card for each day of the week.
 */

const FOCUS_ICONS = {
  "Active Recovery": "🚶",
  "Rest Day": "😴",
};

function focusIcon(focus) {
  return FOCUS_ICONS[focus] || "💪";
}

function formatRest(seconds) {
  if (seconds <= 0) return "—";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder === 0 ? `${minutes} min` : `${minutes}m ${remainder}s`;
}

function SummaryCard({ icon, title, value, description, accent }) {
  return (
    <div className="result-card" style={{ "--card-accent": accent }}>
      <div className="result-card__icon" aria-hidden="true">{icon}</div>
      <h3 className="result-card__title">{title}</h3>
      <p className="result-card__value">{value}</p>
      <p className="result-card__description">{description}</p>
    </div>
  );
}

function WorkoutDayCard({ day }) {
  return (
    <div className={`workout-day-card ${day.is_rest_day ? "is-rest" : ""}`}>
      <div className="workout-day-card__header">
        <span className="workout-day-card__icon" aria-hidden="true">
          {focusIcon(day.focus)}
        </span>
        <div>
          <h4>{day.day_name}</h4>
          <p className="workout-day-card__focus">{day.focus}</p>
        </div>
        <span className="workout-day-card__duration">
          {day.estimated_duration_minutes > 0 ? `${day.estimated_duration_minutes} min` : "Rest"}
        </span>
      </div>

      {day.exercises.length > 0 && (
        <ul className="workout-day-card__exercises">
          {day.exercises.map((exercise) => (
            <li key={exercise.name} className="exercise-row">
              <div className="exercise-row__info">
                <span className="exercise-row__name">{exercise.name}</span>
                <span className="exercise-row__muscle">{exercise.muscle_group}</span>
              </div>
              <div className="exercise-row__stats">
                <span>{exercise.sets} × {exercise.reps}</span>
                <span className="exercise-row__rest">Rest {formatRest(exercise.rest_seconds)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function WorkoutPlanDashboard({ workoutPlan }) {
  const { summary, days } = workoutPlan;

  return (
    <section className="dashboard" aria-live="polite">
      <div className="dashboard__intro">
        <h2>🏋️ Weekly Workout Plan</h2>
        <p>Built from a rule-based training template - no AI, fully reproducible.</p>
      </div>

      <div className="result-grid">
        <SummaryCard
          icon="🧭"
          title="Weekly Split"
          value={summary.weekly_split}
          description="Your training template for the week"
          accent="var(--color-primary-light)"
        />
        <SummaryCard
          icon="📅"
          title="Total Workout Days"
          value={summary.total_workout_days}
          description="Training sessions this week"
          accent="var(--color-coral)"
        />
        <SummaryCard
          icon="⏱"
          title="Weekly Training Time"
          value={`${summary.total_weekly_training_minutes} min`}
          description="Total time spent training"
          accent="var(--color-sky)"
        />
        <SummaryCard
          icon="🛌"
          title="Recommended Rest Days"
          value={summary.recommended_rest_days}
          description="Includes active recovery"
          accent="var(--color-accent-dark)"
        />
      </div>

      <div className="workout-grid">
        {days.map((day) => (
          <WorkoutDayCard day={day} key={day.day_name} />
        ))}
      </div>
    </section>
  );
}
