import { useState } from "react";
import Header from "./components/Header.jsx";
import NutritionForm from "./components/NutritionForm.jsx";
import WorkoutPreferencesForm from "./components/WorkoutPreferencesForm.jsx";
import WorkoutPrompt from "./components/WorkoutPrompt.jsx";
import ResultsDashboard from "./components/ResultsDashboard.jsx";
import WorkoutPlanDashboard from "./components/WorkoutPlanDashboard.jsx";
import ChatWidget from "./components/ChatWidget.jsx";
import Loader from "./components/Loader.jsx";
import { calculateNutrition } from "./api/calculateNutrition.js";
import "./App.css";

// The backend's /calculate endpoint always expects workout preference
// fields, even though we ask for them in a separate step later. For the
// first (nutrition-only) request, we send these harmless placeholder
// values - "gym" is used so the "equipment" field is never required,
// which keeps this first call always valid. The user's real workout
// preferences are collected afterwards and sent in a second request.
const PLACEHOLDER_WORKOUT_FIELDS = {
  fitness_level: "beginner",
  workout_location: "gym",
  available_days: 3,
  workout_duration: 30,
  equipment: null,
};

export default function App() {
  // ---- Nutrition step state ----
  const [nutritionInput, setNutritionInput] = useState(null);
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // ---- Workout step state ----
  // workoutStage: "idle" | "prompt" | "form" | "declined" | "done"
  const [workoutStage, setWorkoutStage] = useState("idle");
  const [workoutPlan, setWorkoutPlan] = useState(null);
  const [workoutLoading, setWorkoutLoading] = useState(false);
  const [workoutError, setWorkoutError] = useState(null);

  async function handleNutritionSubmit(formData) {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setNutritionInput(formData);

    // Starting a new nutrition calculation resets any previous workout plan.
    setWorkoutStage("idle");
    setWorkoutPlan(null);
    setWorkoutError(null);

    try {
      const data = await calculateNutrition({ ...formData, ...PLACEHOLDER_WORKOUT_FIELDS });
      setResult(data);
      // Now that nutrition results are ready, ask if they'd like a workout plan.
      setWorkoutStage("prompt");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleWorkoutSubmit(workoutData) {
    setWorkoutLoading(true);
    setWorkoutError(null);

    try {
      // Reuse the same body measurements + goal already collected, and
      // combine them with the newly collected workout preferences.
      const data = await calculateNutrition({ ...nutritionInput, ...workoutData });
      setWorkoutPlan(data.workout_plan);
      setWorkoutStage("done");
    } catch (err) {
      setWorkoutError(err.message);
    } finally {
      setWorkoutLoading(false);
    }
  }

  // Give the chatbot access to the user's calculated results, if any, so
  // it can answer personalized questions like "explain my protein". This
  // stays null until the user has actually calculated a nutrition plan.
  const chatContext = result
    ? {
        bmi: result.bmi,
        tdee: result.tdee,
        goal_calories: result.goal_calories,
        protein_g: result.protein_g,
        carbs_g: result.carbs_g,
        fat_g: result.fat_g,
        water_liters: result.water_liters,
        healthy_weight_range: result.healthy_weight_range,
        weight_kg: nutritionInput?.weight_kg,
        goal: nutritionInput?.goal,
        activity_level: nutritionInput?.activity_level,
        // Only include a workout plan once the user has actually built one
        // through the workout preferences step - not the silent placeholder.
        workout_plan: workoutPlan || null,
      }
    : null;

  return (
    <div className="app">
      <Header />

      <main className="app__main">
        <NutritionForm onSubmit={handleNutritionSubmit} isLoading={isLoading} />

        <div className="app__results-column">
          {isLoading && <Loader />}

          {error && !isLoading && (
            <div className="error-banner" role="alert">
              <span className="error-banner__icon" aria-hidden="true">⚠️</span>
              <div>
                <p className="error-banner__title">We couldn't calculate your results</p>
                <p className="error-banner__message">{error}</p>
              </div>
            </div>
          )}

          {!isLoading && !error && !result && (
            <div className="empty-state">
              <span className="empty-state__icon" aria-hidden="true">🧭</span>
              <p className="empty-state__title">Your results will appear here</p>
              <p className="empty-state__text">
                Fill in the form and press "Calculate Nutrition" to get your
                personalized BMI, calorie and macro breakdown.
              </p>
            </div>
          )}

          {result && !isLoading && (
            <>
              <ResultsDashboard result={result} />

              {/* ---- Staged workout flow ---- */}
              {workoutStage === "prompt" && (
                <WorkoutPrompt
                  onAccept={() => setWorkoutStage("form")}
                  onDecline={() => setWorkoutStage("declined")}
                />
              )}

              {workoutStage === "declined" && (
                <button
                  type="button"
                  className="ghost-button ghost-button--full"
                  onClick={() => setWorkoutStage("prompt")}
                >
                  Want a workout plan too? Tap here.
                </button>
              )}

              {workoutStage === "form" && (
                <WorkoutPreferencesForm
                  goal={nutritionInput.goal}
                  onSubmit={handleWorkoutSubmit}
                  isLoading={workoutLoading}
                />
              )}

              {workoutLoading && <Loader message="Building your workout plan..." />}

              {workoutError && !workoutLoading && (
                <div className="error-banner" role="alert">
                  <span className="error-banner__icon" aria-hidden="true">⚠️</span>
                  <div>
                    <p className="error-banner__title">We couldn't build your workout plan</p>
                    <p className="error-banner__message">{workoutError}</p>
                  </div>
                </div>
              )}

              {workoutStage === "done" && workoutPlan && !workoutLoading && (
                <WorkoutPlanDashboard workoutPlan={workoutPlan} />
              )}
            </>
          )}
        </div>
      </main>

      <footer className="app__footer">
        <p>
          FitMacros calculations use the Mifflin&ndash;St Jeor equation and
          standard activity multipliers. This tool is for educational
          purposes and is not a substitute for medical advice.
        </p>
      </footer>

      <ChatWidget context={chatContext} />
    </div>
  );
}
