import { useState } from "react";
import Header from "./components/Header.jsx";
import NutritionForm from "./components/NutritionForm.jsx";
import ResultsDashboard from "./components/ResultsDashboard.jsx";
import WorkoutPlanDashboard from "./components/WorkoutPlanDashboard.jsx";
import Loader from "./components/Loader.jsx";
import { calculateNutrition } from "./api/calculateNutrition.js";
import "./App.css";

export default function App() {
  // `result` holds the last successful API response, or null before the
  // first calculation. `isLoading` and `error` track the request state.
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleFormSubmit(formData) {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await calculateNutrition(formData);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="app">
      <Header />

      <main className="app__main">
        <NutritionForm onSubmit={handleFormSubmit} isLoading={isLoading} />

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
              <WorkoutPlanDashboard workoutPlan={result.workout_plan} />
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
    </div>
  );
}
