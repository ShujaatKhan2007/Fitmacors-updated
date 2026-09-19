/**
 * poseRules.js
 * -------------
 * The "brain" of posture checking. Contains:
 *   1. Geometry helpers - turn raw pose landmarks into joint angles.
 *   2. A rules table - one entry per supported exercise, defining how to
 *      count a rep and what form errors to look for.
 *
 * Everything here is plain math and data, no AI service calls. The pose
 * landmarks themselves come from MediaPipe running entirely on-device -
 * video never leaves the user's browser.
 *
 * To add support for a new exercise, add one entry to EXERCISE_RULES.
 */

// MediaPipe Pose landmark indices we care about.
// Full list: https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker
export const LM = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
};

/**
 * Angle at point B formed by A-B-C, in degrees (0-180).
 * e.g. angleAt(hip, knee, ankle) gives the knee bend angle.
 */
export function angleAt(a, b, c) {
  if (!a || !b || !c) return null;
  const abX = a.x - b.x;
  const abY = a.y - b.y;
  const cbX = c.x - b.x;
  const cbY = c.y - b.y;

  const dot = abX * cbX + abY * cbY;
  const magAB = Math.hypot(abX, abY);
  const magCB = Math.hypot(cbX, cbY);
  if (magAB === 0 || magCB === 0) return null;

  const cosine = Math.min(1, Math.max(-1, dot / (magAB * magCB)));
  return (Math.acos(cosine) * 180) / Math.PI;
}

/**
 * How far a segment leans from vertical, in degrees.
 * 0 = perfectly upright, 90 = horizontal.
 */
export function leanFromVertical(top, bottom) {
  if (!top || !bottom) return null;
  const dx = top.x - bottom.x;
  const dy = top.y - bottom.y;
  return (Math.atan2(Math.abs(dx), Math.abs(dy)) * 180) / Math.PI;
}

/** Midpoint of two landmarks - useful for "center of hips/shoulders". */
export function midpoint(a, b) {
  if (!a || !b) return null;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, visibility: Math.min(a.visibility ?? 1, b.visibility ?? 1) };
}

/**
 * How far point B deviates from the straight line between A and C, signed.
 * Positive = B is below the line (in image coordinates, sagging down).
 * Negative = B is above the line (piking up).
 * Used to tell a sagging plank/push-up apart from a piked one, rather than
 * just detecting "not straight" without knowing which direction.
 */
export function signedDeviationFromLine(a, b, c) {
  if (!a || !b || !c) return null;
  if (a.x === c.x) return b.y - a.y; // degenerate case, avoid divide-by-zero
  const t = (b.x - a.x) / (c.x - a.x);
  const expectedY = a.y + t * (c.y - a.y);
  return b.y - expectedY;
}

/**
 * Picks whichever side (left/right) is more clearly visible to the camera.
 * In a side-view exercise like a squat, the near-side limbs track far more
 * reliably than the far-side ones, so we measure using the better side.
 */
export function pickBetterSide(landmarks) {
  const leftScore =
    (landmarks[LM.LEFT_HIP]?.visibility ?? 0) +
    (landmarks[LM.LEFT_KNEE]?.visibility ?? 0) +
    (landmarks[LM.LEFT_ANKLE]?.visibility ?? 0);
  const rightScore =
    (landmarks[LM.RIGHT_HIP]?.visibility ?? 0) +
    (landmarks[LM.RIGHT_KNEE]?.visibility ?? 0) +
    (landmarks[LM.RIGHT_ANKLE]?.visibility ?? 0);

  return rightScore > leftScore ? "right" : "left";
}

export function sideLandmarks(landmarks, side) {
  const suffix = side === "right" ? "RIGHT" : "LEFT";
  return {
    shoulder: landmarks[LM[`${suffix}_SHOULDER`]],
    elbow: landmarks[LM[`${suffix}_ELBOW`]],
    wrist: landmarks[LM[`${suffix}_WRIST`]],
    hip: landmarks[LM[`${suffix}_HIP`]],
    knee: landmarks[LM[`${suffix}_KNEE`]],
    ankle: landmarks[LM[`${suffix}_ANKLE`]],
  };
}

// ---------------------------------------------------------------------------
// Camera framing checks.
// Bad framing is the single biggest cause of wrong feedback, so we verify
// it BEFORE giving any form advice - better to say "I can't see you
// properly" than to confidently give wrong instructions.
// ---------------------------------------------------------------------------

const MIN_VISIBILITY = 0.6;

/**
 * Returns { ok: true } or { ok: false, message } describing what the user
 * needs to fix about their camera setup.
 */
export function checkFraming(landmarks, requiredView) {
  if (!landmarks || landmarks.length === 0) {
    return { ok: false, message: "Step into view - I can't see you yet." };
  }

  const side = pickBetterSide(landmarks);
  const pts = sideLandmarks(landmarks, side);

  // Every joint we need must be reasonably visible.
  const needed = requiredView === "front"
    ? [pts.shoulder, pts.hip, pts.knee, pts.ankle]
    : [pts.shoulder, pts.hip, pts.knee, pts.ankle];

  if (needed.some((p) => !p || (p.visibility ?? 0) < MIN_VISIBILITY)) {
    return { ok: false, message: "Step back so your whole body is in frame." };
  }

  // Is the full body vertically inside the frame? y is normalized 0-1.
  const topY = Math.min(pts.shoulder.y, landmarks[LM.NOSE]?.y ?? 1);
  const bottomY = pts.ankle.y;
  if (topY < 0.02 || bottomY > 0.98) {
    return { ok: false, message: "Move back a bit - head and feet should both be visible." };
  }

  // Side vs front view check. Viewed from the side, the two shoulders
  // overlap so the horizontal gap between them is small compared to the
  // torso height. From the front, that gap is wide.
  const ls = landmarks[LM.LEFT_SHOULDER];
  const rs = landmarks[LM.RIGHT_SHOULDER];
  const hipCenter = midpoint(landmarks[LM.LEFT_HIP], landmarks[LM.RIGHT_HIP]);
  const shoulderCenter = midpoint(ls, rs);

  if (ls && rs && hipCenter && shoulderCenter) {
    const shoulderGap = Math.abs(ls.x - rs.x);
    const torsoHeight = Math.abs(shoulderCenter.y - hipCenter.y) || 0.001;
    const ratio = shoulderGap / torsoHeight;

    if (requiredView === "side" && ratio > 0.95) {
      return { ok: false, message: "Turn sideways to the camera so I can see your knees and hips from the side." };
    }
    if (requiredView === "front" && ratio < 0.5) {
      return { ok: false, message: "Face the camera directly for this exercise." };
    }
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Per-exercise rules.
//
// Each entry defines:
//   requiredView   - "side" or "front" camera placement
//   setupHint      - shown during camera setup
//   getMetrics     - turns landmarks into the numbers this exercise cares about
//   repState       - classifies the current position ("up" | "down" | "middle")
//   checkForm      - returns a list of {id, priority, message} problems,
//                    evaluated at the BOTTOM of the rep
// ---------------------------------------------------------------------------

/** Shared rule for all push-up variants - the joint-angle math doesn't
 * change based on hand position or incline, only the setup instructions do. */
function pushUpRule(setupHint) {
  return {
    requiredView: "side",
    setupHint,
    getMetrics(landmarks) {
      const side = pickBetterSide(landmarks);
      const p = sideLandmarks(landmarks, side);
      return {
        elbowAngle: angleAt(p.shoulder, p.elbow, p.wrist),
        bodyLine: angleAt(p.shoulder, p.hip, p.ankle),
      };
    },
    repState({ elbowAngle }) {
      if (elbowAngle == null) return "unknown";
      if (elbowAngle > 150) return "up";
      if (elbowAngle < 100) return "down";
      return "middle";
    },
    checkForm({ elbowAngle, bodyLine }) {
      const problems = [];
      if (elbowAngle != null && elbowAngle > 100) {
        problems.push({ id: "depth", priority: 1, message: "Lower your chest closer to the floor." });
      }
      if (bodyLine != null && bodyLine < 160) {
        problems.push({ id: "hips", priority: 2, message: "Keep your body straight. Don't let your hips sag or pike up." });
      }
      return problems;
    },
  };
}

export const EXERCISE_RULES = {
  "Bodyweight Squats": {
    requiredView: "side",
    setupHint: "Stand sideways to the camera, about 2 metres (6 ft) back, with the camera at hip height.",
    getMetrics(landmarks) {
      const side = pickBetterSide(landmarks);
      const p = sideLandmarks(landmarks, side);
      return {
        kneeAngle: angleAt(p.hip, p.knee, p.ankle),
        torsoLean: leanFromVertical(p.shoulder, p.hip),
        kneeOverToe: p.knee && p.ankle ? Math.abs(p.knee.x - p.ankle.x) : null,
        hipHeight: p.hip?.y ?? null,
      };
    },
    repState({ kneeAngle }) {
      if (kneeAngle == null) return "unknown";
      if (kneeAngle > 155) return "up";
      if (kneeAngle < 110) return "down";
      return "middle";
    },
    checkForm({ kneeAngle, torsoLean, kneeOverToe }) {
      const problems = [];
      if (kneeAngle != null && kneeAngle > 100) {
        problems.push({ id: "depth", priority: 1, message: "Go deeper. Aim to get your thighs parallel to the floor." });
      }
      if (kneeOverToe != null && kneeOverToe > 0.09) {
        problems.push({ id: "knees", priority: 2, message: "Your knees are travelling too far forward. Push your hips back and keep your weight in your heels." });
      }
      if (torsoLean != null && torsoLean > 50) {
        problems.push({ id: "torso", priority: 3, message: "Chest up. Try not to lean so far forward." });
      }
      return problems;
    },
  },

  "Push-Ups": pushUpRule("Place the camera at floor level, to your side, about 2 metres (6 ft) away."),
  "Diamond Push-Ups": pushUpRule("Place the camera at floor level, to your side, about 2 metres (6 ft) away."),
  "Incline Push-Ups": pushUpRule("Place the camera at floor level, to your side, with your elevated surface visible."),

  "Glute Bridges": {
    requiredView: "side",
    setupHint: "Lie down with the camera to your side at floor level, about 2 metres (6 ft) away.",
    getMetrics(landmarks) {
      const side = pickBetterSide(landmarks);
      const p = sideLandmarks(landmarks, side);
      return { hipAngle: angleAt(p.shoulder, p.hip, p.knee) };
    },
    repState({ hipAngle }) {
      if (hipAngle == null) return "unknown";
      if (hipAngle > 160) return "down"; // "down" = bridged up (hips extended)
      if (hipAngle < 130) return "up";   // resting on the floor
      return "middle";
    },
    checkForm({ hipAngle }) {
      const problems = [];
      if (hipAngle != null && hipAngle < 165) {
        problems.push({ id: "extension", priority: 1, message: "Lift your hips higher and squeeze your glutes at the top." });
      }
      return problems;
    },
  },

  "Walking Lunges": {
    requiredView: "side",
    setupHint: "Stand sideways to the camera, about 3 metres (10 ft) back so you stay in frame as you step.",
    getMetrics(landmarks) {
      const side = pickBetterSide(landmarks);
      const p = sideLandmarks(landmarks, side);
      return {
        kneeAngle: angleAt(p.hip, p.knee, p.ankle),
        torsoLean: leanFromVertical(p.shoulder, p.hip),
      };
    },
    repState({ kneeAngle }) {
      if (kneeAngle == null) return "unknown";
      if (kneeAngle > 155) return "up";
      if (kneeAngle < 115) return "down";
      return "middle";
    },
    checkForm({ kneeAngle, torsoLean }) {
      const problems = [];
      if (kneeAngle != null && kneeAngle > 110) {
        problems.push({ id: "depth", priority: 1, message: "Drop a little lower. Aim for about ninety degrees in your front knee." });
      }
      if (torsoLean != null && torsoLean > 25) {
        problems.push({ id: "torso", priority: 2, message: "Keep your torso upright." });
      }
      return problems;
    },
  },

  "Jumping Jacks": {
    requiredView: "front",
    setupHint: "Face the camera, about 2.5 metres (8 ft) back, with the camera at chest height.",
    getMetrics(landmarks) {
      const lw = landmarks[LM.LEFT_WRIST];
      const rw = landmarks[LM.RIGHT_WRIST];
      const ls = landmarks[LM.LEFT_SHOULDER];
      const la = landmarks[LM.LEFT_ANKLE];
      const ra = landmarks[LM.RIGHT_ANKLE];
      return {
        handsAboveHead: lw && rw && ls ? lw.y < ls.y && rw.y < ls.y : null,
        feetGap: la && ra ? Math.abs(la.x - ra.x) : null,
      };
    },
    repState({ handsAboveHead }) {
      if (handsAboveHead == null) return "unknown";
      return handsAboveHead ? "down" : "up"; // "down" = the open/star position
    },
    checkForm({ feetGap }) {
      const problems = [];
      if (feetGap != null && feetGap < 0.12) {
        problems.push({ id: "feet", priority: 1, message: "Jump your feet wider apart." });
      }
      return problems;
    },
  },

  // -------------------------------------------------------------------
  // HOLD-mode exercises: judged continuously over a duration rather than
  // counted as reps. See mode: "hold" below.
  // -------------------------------------------------------------------

  "Wall Sit": {
    mode: "hold",
    requiredView: "side",
    setupHint: "Stand sideways to the camera with your back against a wall, about 2 metres (6 ft) back.",
    getMetrics(landmarks) {
      const side = pickBetterSide(landmarks);
      const p = sideLandmarks(landmarks, side);
      return {
        kneeAngle: angleAt(p.hip, p.knee, p.ankle),
        torsoLean: leanFromVertical(p.shoulder, p.hip),
      };
    },
    checkForm({ kneeAngle, torsoLean }) {
      const problems = [];
      if (kneeAngle != null && (kneeAngle < 75 || kneeAngle > 105)) {
        problems.push({
          id: "knee-angle",
          priority: 1,
          message: kneeAngle > 105
            ? "Slide down a little further - aim for about ninety degrees at the knee."
            : "You've gone a bit too low - come up slightly to about ninety degrees.",
        });
      }
      if (torsoLean != null && torsoLean > 20) {
        problems.push({ id: "back", priority: 2, message: "Keep your back flat against the wall." });
      }
      return problems;
    },
  },

  "Plank": {
    mode: "hold",
    requiredView: "side",
    setupHint: "Place the camera at floor level, to your side, about 2 metres (6 ft) away.",
    getMetrics(landmarks) {
      const side = pickBetterSide(landmarks);
      const p = sideLandmarks(landmarks, side);
      return {
        bodyLine: angleAt(p.shoulder, p.hip, p.ankle),
        hipDeviation: signedDeviationFromLine(p.shoulder, p.hip, p.ankle),
      };
    },
    checkForm({ bodyLine, hipDeviation }) {
      const problems = [];
      if (bodyLine != null && bodyLine < 162) {
        if (hipDeviation != null && hipDeviation > 0.02) {
          problems.push({ id: "sag", priority: 1, message: "Lift your hips - you're sagging in the middle." });
        } else {
          problems.push({ id: "pike", priority: 1, message: "Lower your hips slightly - you're piking up too high." });
        }
      }
      return problems;
    },
  },

  // -------------------------------------------------------------------
  // Medium confidence: alternating-limb movements. The camera sees one
  // side clearly at a time, so these track the visible side's cycle.
  // -------------------------------------------------------------------

  "Mountain Climbers": {
    requiredView: "side",
    setupHint: "Place the camera at floor level, to your side, about 2 metres (6 ft) away.",
    getMetrics(landmarks) {
      const side = pickBetterSide(landmarks);
      const p = sideLandmarks(landmarks, side);
      return {
        bodyLine: angleAt(p.shoulder, p.hip, p.ankle),
        kneeToChest: p.knee && p.shoulder ? Math.hypot(p.knee.x - p.shoulder.x, p.knee.y - p.shoulder.y) : null,
      };
    },
    repState({ kneeToChest }) {
      if (kneeToChest == null) return "unknown";
      if (kneeToChest < 0.22) return "down"; // knee driven in toward chest
      if (kneeToChest > 0.38) return "up";   // leg extended back
      return "middle";
    },
    checkForm({ bodyLine }) {
      const problems = [];
      if (bodyLine != null && bodyLine < 155) {
        problems.push({ id: "hips", priority: 1, message: "Keep your hips level - don't let them ride up." });
      }
      return problems;
    },
  },

  "High Knees": {
    requiredView: "front",
    setupHint: "Face the camera, about 2.5 metres (8 ft) back, with the camera at chest height.",
    getMetrics(landmarks) {
      const lHip = landmarks[LM.LEFT_HIP];
      const rHip = landmarks[LM.RIGHT_HIP];
      const lKnee = landmarks[LM.LEFT_KNEE];
      const rKnee = landmarks[LM.RIGHT_KNEE];
      const hipY = lHip && rHip ? (lHip.y + rHip.y) / 2 : null;
      const leftLift = hipY != null && lKnee ? hipY - lKnee.y : null;
      const rightLift = hipY != null && rKnee ? hipY - rKnee.y : null;
      const maxLift = [leftLift, rightLift].filter((v) => v != null);
      return { maxLift: maxLift.length ? Math.max(...maxLift) : null };
    },
    repState({ maxLift }) {
      if (maxLift == null) return "unknown";
      if (maxLift > 0.02) return "down"; // a knee is raised to/above hip height
      if (maxLift < -0.08) return "up";  // both knees low
      return "middle";
    },
    checkForm({ maxLift }) {
      const problems = [];
      if (maxLift != null && maxLift < -0.02) {
        problems.push({ id: "height", priority: 1, message: "Drive your knees higher, up toward hip height." });
      }
      return problems;
    },
  },

  // -------------------------------------------------------------------
  // BETA - lower confidence. These movements are harder for a single 2D
  // camera to judge precisely (lying-flat foreshortening, or rotation
  // around the vertical axis, which 2D pose estimation can't directly
  // see). Rep counting still works reasonably; form feedback is a
  // best-effort approximation, flagged as Beta in the UI.
  // -------------------------------------------------------------------

  "Bicycle Crunches": {
    beta: true,
    requiredView: "side",
    setupHint: "Lie on your back with the camera to your side, about 2 metres (6 ft) away, low to the floor.",
    getMetrics(landmarks) {
      const le = landmarks[LM.LEFT_ELBOW];
      const re = landmarks[LM.RIGHT_ELBOW];
      const lk = landmarks[LM.LEFT_KNEE];
      const rk = landmarks[LM.RIGHT_KNEE];
      const crossA = le && rk ? Math.hypot(le.x - rk.x, le.y - rk.y) : null;
      const crossB = re && lk ? Math.hypot(re.x - lk.x, re.y - lk.y) : null;
      const values = [crossA, crossB].filter((v) => v != null);
      return { crossDistance: values.length ? Math.min(...values) : null };
    },
    repState({ crossDistance }) {
      if (crossDistance == null) return "unknown";
      if (crossDistance < 0.16) return "down"; // elbow near opposite knee
      if (crossDistance > 0.28) return "up";
      return "middle";
    },
    checkForm({ crossDistance }) {
      const problems = [];
      if (crossDistance != null && crossDistance > 0.1) {
        problems.push({ id: "contraction", priority: 1, message: "Bring your elbow closer to your opposite knee for a fuller contraction." });
      }
      return problems;
    },
  },

  "Russian Twists": {
    beta: true,
    requiredView: "front",
    setupHint: "Sit facing the camera, about 2 metres (6 ft) back, so both hands are clearly visible as you twist.",
    getMetrics(landmarks) {
      const lw = landmarks[LM.LEFT_WRIST];
      const rw = landmarks[LM.RIGHT_WRIST];
      const lh = landmarks[LM.LEFT_HIP];
      const rh = landmarks[LM.RIGHT_HIP];
      const wristMid = midpoint(lw, rw);
      const hipMid = midpoint(lh, rh);
      return {
        lateralOffset: wristMid && hipMid ? wristMid.x - hipMid.x : null,
      };
    },
    repState({ lateralOffset }) {
      if (lateralOffset == null) return "unknown";
      if (Math.abs(lateralOffset) > 0.14) return "down"; // twisted out to one side
      if (Math.abs(lateralOffset) < 0.05) return "up";   // back near center
      return "middle";
    },
    checkForm({ lateralOffset }) {
      const problems = [];
      if (lateralOffset != null && Math.abs(lateralOffset) < 0.2) {
        problems.push({ id: "rotation", priority: 1, message: "Twist a little further to each side." });
      }
      return problems;
    },
  },
};

/** Which exercises currently support posture checking. */
export function isPostureCheckSupported(exerciseName) {
  return Boolean(EXERCISE_RULES[exerciseName]);
}

/** Whether an exercise is a continuous hold (Wall Sit, Plank) rather than reps. */
export function isHoldModeExercise(exerciseName) {
  return EXERCISE_RULES[exerciseName]?.mode === "hold";
}

/** Whether an exercise's detection is best-effort/lower-confidence. */
export function isBetaExercise(exerciseName) {
  return Boolean(EXERCISE_RULES[exerciseName]?.beta);
}
