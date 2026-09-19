/**
 * ProgressBar.jsx
 * ----------------
 * Shows "Exercise X of N" plus a visual progress bar, so the user always
 * knows how far through the workout they are.
 */
export default function ProgressBar({ current, total }) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="workout-progress">
      <div className="workout-progress__label">
        <span>Exercise {current} of {total}</span>
        <span>{percent}%</span>
      </div>
      <div className="workout-progress__track">
        <div className="workout-progress__fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
