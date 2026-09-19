/**
 * WorkoutPrompt.jsx
 * -----------------
 * A small card shown right after the nutrition results, asking the user
 * whether they'd like a personalized weekly workout plan built too.
 */
export default function WorkoutPrompt({ onAccept, onDecline }) {
  return (
    <div className="workout-prompt">
      <span className="workout-prompt__icon" aria-hidden="true">🏋️</span>
      <div className="workout-prompt__text">
        <p className="workout-prompt__title">Want a personalized workout plan too?</p>
        <p className="workout-prompt__subtitle">
          We'll reuse your goal above to build a weekly training schedule.
        </p>
      </div>
      <div className="workout-prompt__actions">
        <button type="button" className="cta-button cta-button--small" onClick={onAccept}>
          Yes, build my plan
        </button>
        <button type="button" className="ghost-button" onClick={onDecline}>
          No thanks
        </button>
      </div>
    </div>
  );
}
