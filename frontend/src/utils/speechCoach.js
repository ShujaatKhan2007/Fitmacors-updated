/**
 * speechCoach.js
 * ---------------
 * Speaks form feedback out loud using the browser's built-in
 * speechSynthesis API - free, no library, no network call.
 *
 * The important part here isn't the speaking, it's the THROTTLING. A
 * naive implementation checks form ~30x/second and talks constantly,
 * which is unusable. Four rules prevent that:
 *
 *   1. Only ONE error is spoken at a time - the highest priority.
 *   2. A global cooldown enforces silence between any two cues.
 *   3. The same error won't repeat until a longer window has passed,
 *      so it doesn't nag every single rep about the same thing.
 *   4. Occasional praise, so it isn't purely critical.
 */

const GLOBAL_COOLDOWN_MS = 3500;   // minimum silence between any two cues
const SAME_ERROR_COOLDOWN_MS = 9000; // don't repeat one specific error this often

const PRAISE_LINES = [
  "Nice depth!",
  "Good form, keep it up!",
  "That's it, well controlled.",
  "Looking strong!",
];

export function createSpeechCoach({ enabled = true } = {}) {
  let lastSpokenAt = 0;
  let lastErrorSpokenAt = {}; // { errorId: timestamp }
  let goodRepStreak = 0;
  let isEnabled = enabled;

  const supported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  function speak(text) {
    if (!isEnabled || !supported) return;
    // Cancel anything mid-sentence so cues never overlap or queue up.
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }

  return {
    setEnabled(value) {
      isEnabled = value;
      if (!value && supported) window.speechSynthesis.cancel();
    },

    isSupported: supported,

    /**
     * Called once per completed rep (good or bad), NOT every frame.
     *
     * @param {Array} problems - from the exercise's checkForm()
     * @returns {"counted"|"rejected"} whether the rep should count
     */
    reviewRep(problems) {
      const now = Date.now();

      if (!problems || problems.length === 0) {
        goodRepStreak += 1;
        // Praise every 3rd consecutive good rep, still respecting cooldown.
        if (goodRepStreak % 3 === 0 && now - lastSpokenAt > GLOBAL_COOLDOWN_MS) {
          speak(PRAISE_LINES[Math.floor(Math.random() * PRAISE_LINES.length)]);
          lastSpokenAt = now;
        }
        return "counted";
      }

      goodRepStreak = 0;

      // Rule 1: pick only the single most important problem.
      const topProblem = [...problems].sort((a, b) => a.priority - b.priority)[0];

      // Rule 2 + 3: respect both cooldowns before speaking.
      const globalOk = now - lastSpokenAt > GLOBAL_COOLDOWN_MS;
      const sameErrorOk =
        now - (lastErrorSpokenAt[topProblem.id] || 0) > SAME_ERROR_COOLDOWN_MS;

      if (globalOk && sameErrorOk) {
        speak(topProblem.message);
        lastSpokenAt = now;
        lastErrorSpokenAt[topProblem.id] = now;
      }

      return "rejected";
    },

    /** Announce something important immediately, bypassing rep review. */
    announce(text, { force = false } = {}) {
      const now = Date.now();
      if (!force && now - lastSpokenAt < GLOBAL_COOLDOWN_MS) return;
      speak(text);
      lastSpokenAt = now;
    },

    /**
     * Called periodically (e.g. every ~1.5s) during a HOLD-mode exercise
     * (Wall Sit, Plank) rather than once per rep. Same priority + cooldown
     * rules apply, so a held bad position doesn't get nagged about every
     * single tick - it corrects once, then waits before repeating.
     */
    reviewHold(problems) {
      const now = Date.now();

      if (!problems || problems.length === 0) {
        return;
      }

      const topProblem = [...problems].sort((a, b) => a.priority - b.priority)[0];
      const globalOk = now - lastSpokenAt > GLOBAL_COOLDOWN_MS;
      const sameErrorOk =
        now - (lastErrorSpokenAt[topProblem.id] || 0) > SAME_ERROR_COOLDOWN_MS;

      if (globalOk && sameErrorOk) {
        speak(topProblem.message);
        lastSpokenAt = now;
        lastErrorSpokenAt[topProblem.id] = now;
      }
    },

    reset() {
      lastSpokenAt = 0;
      lastErrorSpokenAt = {};
      goodRepStreak = 0;
      if (supported) window.speechSynthesis.cancel();
    },
  };
}
