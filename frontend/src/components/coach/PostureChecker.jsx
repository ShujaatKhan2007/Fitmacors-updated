import { useEffect, useRef, useState } from "react";
import { EXERCISE_RULES, checkFraming, isBetaExercise } from "../../utils/poseRules.js";
import { createSpeechCoach } from "../../utils/speechCoach.js";

// MediaPipe's pose model is fetched from Google's CDN the first time this
// runs, then cached by the browser. Video itself NEVER leaves the device -
// all detection happens locally in the browser.
const WASM_PATH = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

// Skeleton connections to draw, as landmark index pairs.
const SKELETON = [
  [11, 12], [11, 23], [12, 24], [23, 24],
  [11, 13], [13, 15], [12, 14], [14, 16],
  [23, 25], [25, 27], [24, 26], [26, 28],
];

const MIN_USABLE_FPS = 12;
const HOLD_CHECK_INTERVAL_MS = 1500; // how often to judge form during a hold

/**
 * PostureChecker.jsx
 * --------------------
 * Two modes, driven by each exercise's rules.mode in poseRules.js:
 *
 *   "reps" (default) - counts good-form repetitions (squats, push-ups,
 *   lunges, etc). A rep only counts if no form problems were found at
 *   the bottom of the movement.
 *
 *   "hold" - for static holds (Wall Sit, Plank). Instead of counting
 *   reps, runs its own countdown timer and periodically checks form
 *   throughout the hold, speaking up if something drifts.
 *
 * @param {number} targetReps - for rep mode: reps needed to auto-complete
 * @param {number} durationSeconds - for hold mode: how long to hold
 * @param {function} onComplete - called when the target is reached
 */
export default function PostureChecker({ exercise, targetReps, durationSeconds, onClose, onComplete }) {
  const rules = EXERCISE_RULES[exercise.name];
  const mode = rules.mode === "hold" ? "hold" : "reps";
  const isBeta = isBetaExercise(exercise.name);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const landmarkerRef = useRef(null);
  const rafRef = useRef(null);
  const coachRef = useRef(null);

  // Rep-tracking state lives in refs so the animation loop can read the
  // latest values without being re-created on every frame.
  const phaseRef = useRef("up");
  const worstProblemsRef = useRef([]);
  const fpsRef = useRef({ frames: 0, lastCheck: Date.now(), value: 30 });
  const holdRemainingRef = useRef(durationSeconds || 30);
  const holdTickAccumulatorRef = useRef(0);
  const lastFrameTimeRef = useRef(null);
  const isFramedRef = useRef(false);
  const completedRef = useRef(false);

  const [status, setStatus] = useState("loading"); // loading | setup | tracking | error
  const [framingMessage, setFramingMessage] = useState(null);
  const [goodReps, setGoodReps] = useState(0);
  const [holdRemaining, setHoldRemaining] = useState(durationSeconds || 30);
  const [lastFeedback, setLastFeedback] = useState(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [lowPerformance, setLowPerformance] = useState(false);

  // ---- Setup: load model + start camera ----
  useEffect(() => {
    let cancelled = false;
    coachRef.current = createSpeechCoach({ enabled: true });

    async function setup() {
      try {
        const { PoseLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
        const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numPoses: 1,
        });
        if (cancelled) return;
        landmarkerRef.current = landmarker;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setStatus("setup");
        lastFrameTimeRef.current = performance.now();
        rafRef.current = requestAnimationFrame(detectLoop);
      } catch (err) {
        if (cancelled) return;
        setErrorMessage(
          err?.name === "NotAllowedError"
            ? "Camera access was blocked. Allow camera permission in your browser to use posture checking."
            : "Couldn't start posture checking on this device. You can still do the exercise and tap Complete Set manually."
        );
        setStatus("error");
      }
    }

    setup();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      coachRef.current?.reset();
      const stream = videoRef.current?.srcObject;
      stream?.getTracks?.().forEach((t) => t.stop());
      landmarkerRef.current?.close?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    coachRef.current?.setEnabled(voiceEnabled);
  }, [voiceEnabled]);

  function trackFps() {
    const f = fpsRef.current;
    f.frames += 1;
    const now = Date.now();
    if (now - f.lastCheck >= 1000) {
      f.value = f.frames;
      f.frames = 0;
      f.lastCheck = now;
      // Guard: stuttering video produces unreliable angles, so we'd
      // rather admit we can't judge than give confidently wrong advice.
      setLowPerformance(f.value < MIN_USABLE_FPS);
    }
  }

  function detectLoop() {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;
    const now = performance.now();
    const deltaMs = now - (lastFrameTimeRef.current ?? now);
    lastFrameTimeRef.current = now;

    if (!video || !landmarker || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(detectLoop);
      return;
    }

    trackFps();

    let result;
    try {
      result = landmarker.detectForVideo(video, now);
    } catch {
      rafRef.current = requestAnimationFrame(detectLoop);
      return;
    }

    const landmarks = result?.landmarks?.[0];
    drawOverlay(landmarks);

    if (landmarks) {
      const framing = checkFraming(landmarks, rules.requiredView);
      if (!framing.ok) {
        isFramedRef.current = false;
        setFramingMessage(framing.message);
        setStatus((s) => (s === "tracking" ? "tracking" : "setup"));
      } else {
        isFramedRef.current = true;
        setFramingMessage(null);
        setStatus("tracking");
        if (!lowPerformance) {
          if (mode === "hold") {
            processHold(landmarks, deltaMs);
          } else {
            processRep(landmarks);
          }
        }
      }
    } else {
      isFramedRef.current = false;
      setFramingMessage("Step into view - I can't see you yet.");
    }

    rafRef.current = requestAnimationFrame(detectLoop);
  }

  /**
   * Rep state machine (mode: "reps"). We only judge form at the BOTTOM of
   * the rep (the moment it actually matters), and only speak once per
   * completed rep - never continuously.
   */
  function processRep(landmarks) {
    const metrics = rules.getMetrics(landmarks);
    const state = rules.repState(metrics);
    if (state === "unknown") return;

    const phase = phaseRef.current;

    if (phase === "up" && state === "down") {
      phaseRef.current = "down";
      worstProblemsRef.current = rules.checkForm(metrics);
    } else if (phase === "down" && state === "down") {
      const problems = rules.checkForm(metrics);
      if (problems.length < worstProblemsRef.current.length) {
        worstProblemsRef.current = problems;
      }
    } else if (phase === "down" && state === "up") {
      phaseRef.current = "up";
      const problems = worstProblemsRef.current;
      const verdict = coachRef.current?.reviewRep(problems);

      if (verdict === "counted") {
        setGoodReps((prev) => {
          const next = prev + 1;
          if (targetReps && next >= targetReps && !completedRef.current) {
            completedRef.current = true;
            coachRef.current?.announce("Set complete. Great work!", { force: true });
            setTimeout(() => onComplete?.(), 900);
          }
          return next;
        });
        setLastFeedback({ good: true, text: "Good rep!" });
      } else {
        const top = [...problems].sort((a, b) => a.priority - b.priority)[0];
        setLastFeedback({ good: false, text: top?.message || "Not counted - check your form." });
      }
      worstProblemsRef.current = [];
    }
  }

  /**
   * Hold state machine (mode: "hold"). The countdown only ticks while
   * we're actually well-framed and tracking well - time spent fixing your
   * setup shouldn't count against the hold. Form is judged periodically
   * rather than every frame, both for performance and to keep voice cues
   * from stacking up (reviewHold applies its own cooldowns on top).
   */
  function processHold(landmarks, deltaMs) {
    if (completedRef.current) return;

    holdTickAccumulatorRef.current += deltaMs;

    // Countdown ticks in real time while properly framed.
    holdRemainingRef.current = Math.max(0, holdRemainingRef.current - deltaMs / 1000);
    setHoldRemaining(Math.ceil(holdRemainingRef.current));

    if (holdTickAccumulatorRef.current >= HOLD_CHECK_INTERVAL_MS) {
      holdTickAccumulatorRef.current = 0;
      const metrics = rules.getMetrics(landmarks);
      const problems = rules.checkForm(metrics);
      coachRef.current?.reviewHold(problems);
      setLastFeedback(
        problems.length
          ? { good: false, text: [...problems].sort((a, b) => a.priority - b.priority)[0].message }
          : { good: true, text: "Great hold - keep it there!" }
      );
    }

    if (holdRemainingRef.current <= 0) {
      completedRef.current = true;
      coachRef.current?.announce("Hold complete. Great work!", { force: true });
      setTimeout(() => onComplete?.(), 900);
    }
  }

  function drawOverlay(landmarks) {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!landmarks) return;

    const toPx = (p) => ({ x: p.x * canvas.width, y: p.y * canvas.height });

    ctx.strokeStyle = "#c6f135";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    SKELETON.forEach(([a, b]) => {
      const pa = landmarks[a];
      const pb = landmarks[b];
      if (!pa || !pb) return;
      if ((pa.visibility ?? 0) < 0.4 || (pb.visibility ?? 0) < 0.4) return;
      const A = toPx(pa);
      const B = toPx(pb);
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.lineTo(B.x, B.y);
      ctx.stroke();
    });

    ctx.fillStyle = "#ffffff";
    landmarks.forEach((p) => {
      if ((p.visibility ?? 0) < 0.4) return;
      const P = toPx(p);
      ctx.beginPath();
      ctx.arc(P.x, P.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  return (
    <div className="posture-overlay" role="dialog" aria-label="Posture checker">
      <div className="posture-panel">
        <div className="posture-panel__header">
          <div>
            <p className="posture-panel__title">
              📹 Posture Check {isBeta && <span className="posture-beta-badge">BETA</span>}
            </p>
            <p className="posture-panel__subtitle">{exercise.name}</p>
          </div>
          <button type="button" className="posture-panel__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="posture-stage">
          <video ref={videoRef} className="posture-video" playsInline muted />
          <canvas ref={canvasRef} className="posture-canvas" />

          {status === "loading" && (
            <div className="posture-status">
              <span className="loader-ring" aria-hidden="true"></span>
              <p>Starting camera and loading pose model...</p>
            </div>
          )}

          {status === "error" && (
            <div className="posture-status posture-status--error">
              <p>{errorMessage}</p>
            </div>
          )}

          {status !== "loading" && status !== "error" && mode === "reps" && (
            <div className="posture-counter">
              <span className="posture-counter__value">
                {goodReps}{targetReps ? ` / ${targetReps}` : ""}
              </span>
              <span className="posture-counter__label">good reps</span>
            </div>
          )}

          {status !== "loading" && status !== "error" && mode === "hold" && (
            <div className="posture-counter">
              <span className="posture-counter__value">{holdRemaining}s</span>
              <span className="posture-counter__label">
                {isFramedRef.current ? "holding" : "paused"}
              </span>
            </div>
          )}
        </div>

        <div className="posture-panel__body">
          {isBeta && (
            <div className="posture-beta-note">
              This exercise's movement is harder for a single camera to
              judge precisely. Rep counting works, but treat form feedback
              as a rough guide rather than a precise check.
            </div>
          )}

          {lowPerformance && (
            <div className="posture-warning">
              Your device is struggling to track smoothly, so I've paused form
              feedback rather than risk giving you wrong advice. Try closing
              other apps or tabs.
            </div>
          )}

          {framingMessage && !lowPerformance && (
            <div className="posture-framing">📐 {framingMessage}</div>
          )}

          {!framingMessage && status === "tracking" && lastFeedback && (
            <div className={`posture-feedback ${lastFeedback.good ? "is-good" : "is-bad"}`}>
              {lastFeedback.good ? "✅ " : "⚠️ "}
              {lastFeedback.text}
            </div>
          )}

          <p className="posture-hint">{rules.setupHint}</p>

          <div className="posture-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => setVoiceEnabled((v) => !v)}
            >
              {voiceEnabled ? "🔊 Voice On" : "🔇 Voice Off"}
            </button>
            <button type="button" className="cta-button cta-button--small" onClick={onClose}>
              Done
            </button>
          </div>

          <p className="posture-privacy">
            🔒 Everything runs on your device - your camera feed is never
            uploaded or stored anywhere.
          </p>
        </div>
      </div>
    </div>
  );
}
