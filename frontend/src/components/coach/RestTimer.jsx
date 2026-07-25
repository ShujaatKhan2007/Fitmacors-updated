import { useState } from "react";
import CountdownTimer from "./CountdownTimer.jsx";

/**
 * RestTimer.jsx
 * -------------
 * Shown between sets and between exercises. Counts down the user's
 * chosen rest duration, then automatically calls onComplete to move on.
 * The user can also skip the rest early or pause it.
 */
export default function RestTimer({ restSeconds, onComplete, nextExerciseName }) {
  const [isPaused, setIsPaused] = useState(false);

  return (
    <div className="rest-screen">
      <p className="rest-screen__headline">Great Job! 🙌</p>
      <p className="rest-screen__subtitle">Rest Time Remaining</p>

      <CountdownTimer seconds={restSeconds} isPaused={isPaused} onComplete={onComplete} />

      {nextExerciseName && (
        <p className="rest-screen__next">Up next: <strong>{nextExerciseName}</strong></p>
      )}

      <div className="rest-screen__actions">
        <button type="button" className="ghost-button" onClick={() => setIsPaused((p) => !p)}>
          {isPaused ? "Resume Timer" : "Pause Timer"}
        </button>
        <button type="button" className="cta-button cta-button--small" onClick={onComplete}>
          Skip Rest
        </button>
      </div>
    </div>
  );
}
