import { useEffect, useRef, useState } from "react";

/**
 * CountdownTimer.jsx
 * -------------------
 * A reusable countdown timer. Ticks down from `seconds`, calls
 * `onComplete` exactly once when it reaches zero, and pauses cleanly
 * whenever `isPaused` is true (used by both the time-based exercise hold
 * and the rest timer).
 */
export default function CountdownTimer({ seconds, isPaused, onComplete, label }) {
  const [remaining, setRemaining] = useState(seconds);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Reset the timer whenever the target duration changes (e.g. moving to
  // a new exercise or a newly chosen rest length).
  useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    if (isPaused || remaining <= 0) return undefined;

    const intervalId = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalId);
          // Defer to avoid updating state of a parent mid-render.
          setTimeout(() => onCompleteRef.current?.(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isPaused, remaining <= 0]);

  const minutes = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const formatted = `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  const progressPercent = seconds > 0 ? ((seconds - remaining) / seconds) * 100 : 100;

  return (
    <div className="countdown-timer">
      {label && <p className="countdown-timer__label">{label}</p>}
      <div className="countdown-timer__ring">
        <svg viewBox="0 0 120 120" className="countdown-timer__svg">
          <circle cx="60" cy="60" r="52" className="countdown-timer__track" />
          <circle
            cx="60"
            cy="60"
            r="52"
            className="countdown-timer__progress"
            style={{
              strokeDasharray: 2 * Math.PI * 52,
              strokeDashoffset: 2 * Math.PI * 52 * (1 - progressPercent / 100),
            }}
          />
        </svg>
        <span className="countdown-timer__value">{formatted}</span>
      </div>
      {isPaused && <p className="countdown-timer__paused">Paused</p>}
    </div>
  );
}
