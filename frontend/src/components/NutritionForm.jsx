import { useState } from "react";

// Static option data for the pill-style selectors below.
// Keeping these as data (instead of hardcoded JSX) makes the form easy to
// extend later without touching the rendering logic.
const ACTIVITY_OPTIONS = [
  { value: "sedentary", label: "Sedentary", hint: "Little or no exercise" },
  { value: "lightly_active", label: "Lightly Active", hint: "Exercise 1-3 days/week" },
  { value: "moderately_active", label: "Moderately Active", hint: "Exercise 3-5 days/week" },
  { value: "very_active", label: "Very Active", hint: "Exercise 6-7 days/week" },
  { value: "extremely_active", label: "Extremely Active", hint: "Hard training + physical job" },
];

const GOAL_OPTIONS = [
  { value: "cut", label: "Fat Loss", hint: "Calorie deficit" },
  { value: "maintenance", label: "Maintenance", hint: "Stay the same" },
  { value: "lean_bulk", label: "Lean Bulk", hint: "Slow, clean gain" },
  { value: "bulk", label: "Bulk", hint: "Faster weight gain" },
];

const FITNESS_LEVEL_OPTIONS = [
  { value: "beginner", label: "Beginner", hint: "New to structured training" },
  { value: "intermediate", label: "Intermediate", hint: "Training 6+ months" },
  { value: "advanced", label: "Advanced", hint: "Training 2+ years" },
];

const WORKOUT_LOCATION_OPTIONS = [
  { value: "home", label: "Home", hint: "Bodyweight or home equipment" },
  { value: "gym", label: "Gym", hint: "Full gym equipment" },
];

const AVAILABLE_DAYS_OPTIONS = [
  { value: 3, label: "3 Days", hint: "Full body split" },
  { value: 4, label: "4 Days", hint: "Upper / lower split" },
  { value: 5, label: "5 Days", hint: "Body part split" },
  { value: 6, label: "6 Days", hint: "Push / pull / legs" },
];

const WORKOUT_DURATION_OPTIONS = [
  { value: 30, label: "30 Minutes", hint: "Quick, focused session" },
  { value: 45, label: "45 Minutes", hint: "Balanced session" },
  { value: 60, label: "60 Minutes", hint: "Full session" },
  { value: 90, label: "90 Minutes", hint: "Extended session" },
];

const EQUIPMENT_OPTIONS = [
  { value: "no_equipment", label: "No Equipment", hint: "Bodyweight only" },
  { value: "resistance_bands", label: "Resistance Bands", hint: "Bands only" },
  { value: "dumbbells", label: "Dumbbells", hint: "Dumbbells at home" },
  { value: "pull_up_bar", label: "Pull-Up Bar", hint: "Pull-up bar at home" },
  { value: "full_home_gym", label: "Full Home Gym", hint: "Barbell, bench, machines" },
];

const INITIAL_FORM_STATE = {
  age: "",
  gender: "male",
  height_cm: "",
  weight_kg: "",
  activity_level: "moderately_active",
  goal: "maintenance",
  fitness_level: "beginner",
  workout_location: "home",
  available_days: 3,
  workout_duration: 30,
  equipment: "no_equipment",
};

/**
 * Validates the form on the client before we ever call the API.
 * This gives instant feedback and avoids an unnecessary network round-trip
 * for obvious mistakes. The backend still re-validates everything itself,
 * since client-side checks can always be bypassed.
 */
function validate(formData) {
  const errors = {};

  const age = Number(formData.age);
  if (!formData.age || Number.isNaN(age) || age <= 0 || age > 120) {
    errors.age = "Enter an age between 1 and 120.";
  }

  const height = Number(formData.height_cm);
  if (!formData.height_cm || Number.isNaN(height) || height <= 50 || height > 272) {
    errors.height_cm = "Enter a height between 50 and 272 cm.";
  }

  const weight = Number(formData.weight_kg);
  if (!formData.weight_kg || Number.isNaN(weight) || weight <= 20 || weight > 400) {
    errors.weight_kg = "Enter a weight between 20 and 400 kg.";
  }

  if (formData.workout_location === "home" && !formData.equipment) {
    errors.equipment = "Select the equipment you have available at home.";
  }

  return errors;
}

export default function NutritionForm({ onSubmit, isLoading }) {
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [fieldErrors, setFieldErrors] = useState({});

  function updateField(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear the error for a field as soon as the user starts fixing it.
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function handleSubmit(event) {
    event.preventDefault();

    const errors = validate(formData);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    onSubmit({
      age: Number(formData.age),
      gender: formData.gender,
      height_cm: Number(formData.height_cm),
      weight_kg: Number(formData.weight_kg),
      activity_level: formData.activity_level,
      goal: formData.goal,
      fitness_level: formData.fitness_level,
      workout_location: formData.workout_location,
      available_days: Number(formData.available_days),
      workout_duration: Number(formData.workout_duration),
      // Equipment only matters for home workouts - a gym is assumed to
      // have everything, so we don't send it at all in that case.
      equipment: formData.workout_location === "home" ? formData.equipment : null,
    });
  }

  return (
    <form className="panel" onSubmit={handleSubmit} noValidate>
      <div className="panel__header">
        <h2>Your Measurements</h2>
        <p className="panel__subtitle">All fields are required for an accurate result.</p>
      </div>

      {/* ---- Personal information ---- */}
      <div className="field-row">
        <div className="field">
          <label htmlFor="age">Age (years)</label>
          <input
            id="age"
            type="number"
            inputMode="numeric"
            placeholder="e.g. 25"
            value={formData.age}
            onChange={(e) => updateField("age", e.target.value)}
            aria-invalid={Boolean(fieldErrors.age)}
            aria-describedby={fieldErrors.age ? "age-error" : undefined}
          />
          {fieldErrors.age && (
            <span className="field-error" id="age-error">{fieldErrors.age}</span>
          )}
        </div>

        <div className="field">
          <span className="field__label">Gender</span>
          <div className="pill-toggle" role="radiogroup" aria-label="Gender">
            {["male", "female"].map((option) => (
              <button
                type="button"
                key={option}
                role="radio"
                aria-checked={formData.gender === option}
                className={`pill-toggle__option ${formData.gender === option ? "is-active" : ""}`}
                onClick={() => updateField("gender", option)}
              >
                {option === "male" ? "Male" : "Female"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ---- Body measurements ---- */}
      <div className="field-row">
        <div className="field">
          <label htmlFor="height">Height (cm)</label>
          <input
            id="height"
            type="number"
            inputMode="decimal"
            placeholder="e.g. 175"
            value={formData.height_cm}
            onChange={(e) => updateField("height_cm", e.target.value)}
            aria-invalid={Boolean(fieldErrors.height_cm)}
            aria-describedby={fieldErrors.height_cm ? "height-error" : undefined}
          />
          {fieldErrors.height_cm && (
            <span className="field-error" id="height-error">{fieldErrors.height_cm}</span>
          )}
        </div>

        <div className="field">
          <label htmlFor="weight">Weight (kg)</label>
          <input
            id="weight"
            type="number"
            inputMode="decimal"
            placeholder="e.g. 70"
            value={formData.weight_kg}
            onChange={(e) => updateField("weight_kg", e.target.value)}
            aria-invalid={Boolean(fieldErrors.weight_kg)}
            aria-describedby={fieldErrors.weight_kg ? "weight-error" : undefined}
          />
          {fieldErrors.weight_kg && (
            <span className="field-error" id="weight-error">{fieldErrors.weight_kg}</span>
          )}
        </div>
      </div>

      {/* ---- Activity level ---- */}
      <div className="field">
        <span className="field__label">Activity Level</span>
        <div className="option-grid" role="radiogroup" aria-label="Activity level">
          {ACTIVITY_OPTIONS.map((option) => (
            <button
              type="button"
              key={option.value}
              role="radio"
              aria-checked={formData.activity_level === option.value}
              className={`option-card ${formData.activity_level === option.value ? "is-active" : ""}`}
              onClick={() => updateField("activity_level", option.value)}
            >
              <span className="option-card__label">{option.label}</span>
              <span className="option-card__hint">{option.hint}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ---- Goal ---- */}
      <div className="field">
        <span className="field__label">Goal</span>
        <div className="option-grid option-grid--goals" role="radiogroup" aria-label="Goal">
          {GOAL_OPTIONS.map((option) => (
            <button
              type="button"
              key={option.value}
              role="radio"
              aria-checked={formData.goal === option.value}
              className={`option-card ${formData.goal === option.value ? "is-active" : ""}`}
              onClick={() => updateField("goal", option.value)}
            >
              <span className="option-card__label">{option.label}</span>
              <span className="option-card__hint">{option.hint}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ---- Workout Preferences ---- */}
      <div className="panel__divider" />
      <div className="panel__header">
        <h2>🏋️ Workout Preferences</h2>
        <p className="panel__subtitle">
          Your goal above ({GOAL_OPTIONS.find((g) => g.value === formData.goal)?.label}) is
          reused to build your workout plan.
        </p>
      </div>

      <div className="field">
        <span className="field__label">Fitness Level</span>
        <div className="option-grid option-grid--three" role="radiogroup" aria-label="Fitness level">
          {FITNESS_LEVEL_OPTIONS.map((option) => (
            <button
              type="button"
              key={option.value}
              role="radio"
              aria-checked={formData.fitness_level === option.value}
              className={`option-card ${formData.fitness_level === option.value ? "is-active" : ""}`}
              onClick={() => updateField("fitness_level", option.value)}
            >
              <span className="option-card__label">{option.label}</span>
              <span className="option-card__hint">{option.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="field__label">Workout Location</span>
        <div className="option-grid" role="radiogroup" aria-label="Workout location">
          {WORKOUT_LOCATION_OPTIONS.map((option) => (
            <button
              type="button"
              key={option.value}
              role="radio"
              aria-checked={formData.workout_location === option.value}
              className={`option-card ${formData.workout_location === option.value ? "is-active" : ""}`}
              onClick={() => updateField("workout_location", option.value)}
            >
              <span className="option-card__label">{option.label}</span>
              <span className="option-card__hint">{option.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="field__label">Available Days Per Week</span>
        <div className="option-grid" role="radiogroup" aria-label="Available days per week">
          {AVAILABLE_DAYS_OPTIONS.map((option) => (
            <button
              type="button"
              key={option.value}
              role="radio"
              aria-checked={formData.available_days === option.value}
              className={`option-card ${formData.available_days === option.value ? "is-active" : ""}`}
              onClick={() => updateField("available_days", option.value)}
            >
              <span className="option-card__label">{option.label}</span>
              <span className="option-card__hint">{option.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span className="field__label">Workout Duration</span>
        <div className="option-grid" role="radiogroup" aria-label="Workout duration">
          {WORKOUT_DURATION_OPTIONS.map((option) => (
            <button
              type="button"
              key={option.value}
              role="radio"
              aria-checked={formData.workout_duration === option.value}
              className={`option-card ${formData.workout_duration === option.value ? "is-active" : ""}`}
              onClick={() => updateField("workout_duration", option.value)}
            >
              <span className="option-card__label">{option.label}</span>
              <span className="option-card__hint">{option.hint}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Equipment only applies to home workouts - a gym is assumed to
          have everything, so this section is hidden for gym users. */}
      {formData.workout_location === "home" && (
        <div className="field">
          <span className="field__label">Equipment Available</span>
          <div className="option-grid" role="radiogroup" aria-label="Equipment available">
            {EQUIPMENT_OPTIONS.map((option) => (
              <button
                type="button"
                key={option.value}
                role="radio"
                aria-checked={formData.equipment === option.value}
                className={`option-card ${formData.equipment === option.value ? "is-active" : ""}`}
                onClick={() => updateField("equipment", option.value)}
              >
                <span className="option-card__label">{option.label}</span>
                <span className="option-card__hint">{option.hint}</span>
              </button>
            ))}
          </div>
          {fieldErrors.equipment && (
            <span className="field-error">{fieldErrors.equipment}</span>
          )}
        </div>
      )}

      <button type="submit" className="cta-button" disabled={isLoading}>
        {isLoading ? "Calculating..." : "Calculate Nutrition"}
      </button>
    </form>
  );
}
