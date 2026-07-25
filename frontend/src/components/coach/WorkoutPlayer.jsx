import { useState, useRef } from "react";
import ExerciseCard from "./ExerciseCard.jsx";
import RestTimer from "./RestTimer.jsx";
import ProgressBar from "./ProgressBar.jsx";
import WorkoutControls from "./WorkoutControls.jsx";
import WorkoutSummary from "./WorkoutSummary.jsx";

const REST_DURATION_OPTIONS = [30, 45, 60, 90, 120];

/**
 * WorkoutPlayer.jsx
 * ------------------
 * Full-screen guided workout session for one day's exercises. Handles:
 * setup (choosing a rest duration), stepping through exercises and sets,
 * rest periods between them, pause/resume, previous/next navigation,
 * ending early, and the final completion summary.
 */
export default function WorkoutPlayer({ day, onExit }) {
  const exercises = day?.exercises || [];

  const [phase, setPhase] = useState("setup"); // setup | exercising | resting | summary
  const [restDuration, setRestDuration] = useState(60);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [completedSets, setCompletedSets] = useState({}); // { exerciseIndex: count }
  const [isConfirmingEnd, setIsConfirmingEnd] = useState(false);

  const pendingAfterRestRef = useRef("nextSet"); // "nextSet" | "nextExercise"
  const startTimeRef = useRef(null);
  const endTimeRef = useRef(null);

  const currentExercise = exercises[currentExerciseIndex];
  const isLastExercise = currentExerciseIndex === exercises.length - 1;

  function beginWorkout() {
    startTimeRef.current = Date.now();
    setIsPaused(false);
    setPhase("exercising");
  }

  function recordSetCompleted(exerciseIndex) {
    setCompletedSets((prev) => ({
      ...prev,
      [exerciseIndex]: (prev[exerciseIndex] || 0) + 1,
    }));
  }

  function handleCompleteSet() {
    recordSetCompleted(currentExerciseIndex);

    const finishedAllSets = currentSet >= currentExercise.sets;

    if (!finishedAllSets) {
      pendingAfterRestRef.current = "nextSet";
      setPhase("resting");
      return;
    }

    if (isLastExercise) {
      finishWorkout();
      return;
    }

    pendingAfterRestRef.current = "nextExercise";
    setPhase("resting");
  }

  function handleRestComplete() {
    if (pendingAfterRestRef.current === "nextSet") {
      setCurrentSet((prev) => prev + 1);
    } else {
      setCurrentExerciseIndex((prev) => prev + 1);
      setCurrentSet(1);
    }
    // Always start the next set/exercise fresh - a pause from the
    // previous screen should never carry over and silently freeze this one.
    setIsPaused(false);
    setPhase("exercising");
  }

  function handlePrevious() {
    if (currentExerciseIndex === 0) return;
    setCurrentExerciseIndex((prev) => prev - 1);
    setCurrentSet(1);
    setIsPaused(false);
    setPhase("exercising");
  }

  function finishWorkout() {
    endTimeRef.current = Date.now();
    setPhase("summary");
  }

  function computeStats() {
    const end = endTimeRef.current || Date.now();
    const start = startTimeRef.current || end;
    const durationSeconds = Math.max(0, Math.round((end - start) / 1000));

    const totalSets = exercises.reduce((sum, ex) => sum + ex.sets, 0);
    const setsCompleted = Object.values(completedSets).reduce((sum, n) => sum + n, 0);

    const exercisesCompleted = exercises.filter(
      (ex, i) => (completedSets[i] || 0) >= ex.sets
    ).length;

    const caloriesBurned = exercises.reduce((sum, ex, i) => {
      const done = completedSets[i] || 0;
      const share = ex.sets > 0 ? done / ex.sets : 0;
      return sum + (ex.calories_estimate || 0) * share;
    }, 0);

    const completionPercent = totalSets > 0
      ? Math.min(100, Math.round((setsCompleted / totalSets) * 100))
      : 0;

    return { durationSeconds, setsCompleted, exercisesCompleted, caloriesBurned, completionPercent };
  }

  function handleRepeat() {
    setCompletedSets({});
    setCurrentExerciseIndex(0);
    setCurrentSet(1);
    setIsPaused(false);
    startTimeRef.current = Date.now();
    endTimeRef.current = null;
    setPhase("exercising");
  }

  if (!exercises.length) {
    return (
      <div className="coach-overlay">
        <div className="coach-overlay__inner">
          <p>This day doesn't have any exercises to start.</p>
          <button type="button" className="cta-button" onClick={onExit}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="coach-overlay" role="dialog" aria-label="Workout Coach Mode">
      <div className="coach-overlay__inner">
        <button type="button" className="coach-overlay__close" onClick={onExit} aria-label="Close workout coach">
          ✕
        </button>

        {phase === "setup" && (
          <div className="coach-setup">
            <h2>{day.day_name} - {day.focus}</h2>
            <p className="coach-setup__subtitle">
              {exercises.length} exercises · choose your preferred rest duration to get started
            </p>

            <div className="coach-setup__rest-options">
              {REST_DURATION_OPTIONS.map((seconds) => (
                <button
                  type="button"
                  key={seconds}
                  className={`option-card ${restDuration === seconds ? "is-active" : ""}`}
                  onClick={() => setRestDuration(seconds)}
                >
                  <span className="option-card__label">{seconds}s</span>
                </button>
              ))}
            </div>

            <button type="button" className="cta-button coach-setup__begin" onClick={beginWorkout}>
              ▶ Start Workout
            </button>
          </div>
        )}

        {phase === "exercising" && currentExercise && (
          <>
            <ProgressBar current={currentExerciseIndex + 1} total={exercises.length} />
            <ExerciseCard
              exercise={currentExercise}
              currentSet={currentSet}
              isPaused={isPaused}
              onCompleteSet={handleCompleteSet}
            />
            <WorkoutControls
              onPrevious={handlePrevious}
              onPauseResume={() => setIsPaused((p) => !p)}
              isPaused={isPaused}
              showPause={currentExercise.is_time_based}
              onEnd={() => setIsConfirmingEnd(true)}
              canGoPrevious={currentExerciseIndex > 0}
            />
          </>
        )}

        {phase === "resting" && (
          <>
            <ProgressBar current={currentExerciseIndex + 1} total={exercises.length} />
            <RestTimer
              restSeconds={restDuration}
              onComplete={handleRestComplete}
              nextExerciseName={
                pendingAfterRestRef.current === "nextExercise"
                  ? exercises[currentExerciseIndex + 1]?.name
                  : currentExercise.name
              }
            />
          </>
        )}

        {phase === "summary" && (
          <WorkoutSummary
            stats={computeStats()}
            onReturnToDashboard={onExit}
            onRepeatWorkout={handleRepeat}
          />
        )}

        {isConfirmingEnd && (
          <div className="coach-confirm">
            <div className="coach-confirm__box">
              <p>End this workout now?</p>
              <p className="coach-confirm__subtitle">Your progress so far will still be saved to your summary.</p>
              <div className="coach-confirm__actions">
                <button
                  type="button"
                  className="cta-button cta-button--small"
                  onClick={() => {
                    setIsConfirmingEnd(false);
                    finishWorkout();
                  }}
                >
                  End Workout
                </button>
                <button type="button" className="ghost-button" onClick={() => setIsConfirmingEnd(false)}>
                  Keep Going
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
