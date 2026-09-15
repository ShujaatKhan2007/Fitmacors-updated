/**
 * WorkoutControls.jsx
 * --------------------
 * The control row shown during Coach Mode. Forward progress is fully
 * automatic (Complete Set -> rest -> next set/exercise, or straight to
 * the summary after the last exercise), so there's no manual "Next"
 * button - it would just be a confusing, redundant control. "Previous"
 * stays available in case the user needs to go back and redo something.
 *
 * The Pause button only appears when there's actually a timer running to
 * pause (a time-based exercise like Plank) - for rep-based exercises,
 * nothing is counting down while waiting for "Complete Set", so a pause
 * button there would do nothing and just be confusing.
 */
export default function WorkoutControls({
  onPrevious,
  onPauseResume,
  isPaused,
  showPause,
  onEnd,
  canGoPrevious,
}) {
  return (
    <div className="workout-controls">
      <button
        type="button"
        className="workout-controls__button"
        onClick={onPrevious}
        disabled={!canGoPrevious}
      >
        ◀ Previous
      </button>
      {showPause && (
        <button type="button" className="workout-controls__button" onClick={onPauseResume}>
          {isPaused ? "▶ Resume" : "⏸ Pause"}
        </button>
      )}
      <button type="button" className="workout-controls__button workout-controls__button--end" onClick={onEnd}>
        End Workout
      </button>
    </div>
  );
}
