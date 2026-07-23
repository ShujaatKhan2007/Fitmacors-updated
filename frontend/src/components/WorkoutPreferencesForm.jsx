import { useState } from "react";

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

const GOAL_LABELS = {
  cut: "Fat Loss",
  maintenance: "Maintenance",
  lean_bulk: "Lean Bulk",
  bulk: "Bulk",
};

const INITIAL_FORM_STATE = {
  fitness_level: "beginner",
  workout_location: "home",
  available_days: 3,
  workout_duration: 30,
  equipment: "no_equipment",
};

function validate(formData) {
  const errors = {};
  if (formData.workout_location === "home" && !formData.equipment) {
    errors.equipment = "Select the equipment you have available at home.";
  }
  return errors;
}

/**
 * WorkoutPreferencesForm.jsx
 * ---------------------------
 * Collects everything needed to build a weekly workout plan. This form is
 * only shown after the nutrition results are already on screen, and it
 * deliberately does NOT ask for a fitness goal again - the goal picked in
 * the nutrition form is reused automatically (see `goal` prop below).
 */
export default function WorkoutPreferencesForm({ goal, onSubmit, isLoading }) {
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [fieldErrors, setFieldErrors] = useState({});

  function updateField(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
      fitness_level: formData.fitness_level,
      workout_location: formData.workout_location,
      available_days: Number(formData.available_days),
      workout_duration: Number(formData.workout_duration),
      // Equipment only matters for home workouts - a gym is assumed to
      // have everything, so we don't send it at all in that case.
      equipment: formData.workout_location === "home" ? formData.equipment : null,
      // Reuse the goal already collected in the nutrition form.
      goal,
    });
  }

  return (
    <form className="panel" onSubmit={handleSubmit} noValidate>
      <div className="panel__header">
        <h2>🏋️ Workout Preferences</h2>
        <p className="panel__subtitle">
          Your goal from above ({GOAL_LABELS[goal] || goal}) will be reused to build this plan.
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
        {isLoading ? "Building Plan..." : "Generate Workout Plan"}
      </button>
    </form>
  );
}
