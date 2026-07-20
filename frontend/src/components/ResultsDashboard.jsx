import MacroRing from "./MacroRing.jsx";

/**
 * One stat card in the results grid.
 * Kept as a small local component since every card shares the same shape:
 * icon, title, big value, and a short supporting description.
 */
function ResultCard({ icon, title, value, unit, description, accent }) {
  return (
    <div className="result-card" style={{ "--card-accent": accent }}>
      <div className="result-card__icon" aria-hidden="true">{icon}</div>
      <h3 className="result-card__title">{title}</h3>
      <p className="result-card__value">
        {value}
        {unit && <span className="result-card__unit"> {unit}</span>}
      </p>
      <p className="result-card__description">{description}</p>
    </div>
  );
}

const MEAL_LABELS = {
  breakfast: { name: "Breakfast", icon: "🌅" },
  lunch: { name: "Lunch", icon: "🥗" },
  dinner: { name: "Dinner", icon: "🌙" },
  snacks: { name: "Snacks", icon: "🍎" },
};

export default function ResultsDashboard({ result }) {
  const {
    bmi,
    goal_calories: goalCalories,
    protein_g: proteinG,
    carbs_g: carbsG,
    fat_g: fatG,
    water_liters: waterLiters,
    healthy_weight_range: weightRange,
    meal_plan: mealPlan,
  } = result;

  return (
    <section className="dashboard" aria-live="polite">
      <div className="dashboard__intro">
        <h2>Your Results</h2>
        <p>Based on the Mifflin-St Jeor equation and standard activity multipliers.</p>
      </div>

      {/* ---- Signature element: the macro ring ---- */}
      <div className="ring-section">
        <MacroRing
          proteinG={proteinG}
          carbsG={carbsG}
          fatG={fatG}
          calories={goalCalories}
        />
        <ul className="ring-legend">
          <li>
            <span className="ring-legend__swatch" style={{ background: "var(--color-coral)" }} />
            Protein &mdash; {proteinG} g
          </li>
          <li>
            <span className="ring-legend__swatch" style={{ background: "var(--color-sky)" }} />
            Carbs &mdash; {carbsG} g
          </li>
          <li>
            <span className="ring-legend__swatch" style={{ background: "var(--color-accent-dark)" }} />
            Fat &mdash; {fatG} g
          </li>
        </ul>
      </div>

      {/* ---- Stat cards ---- */}
      <div className="result-grid">
        <ResultCard
          icon="📊"
          title="BMI"
          value={bmi.value}
          description={`Category: ${bmi.category}`}
          accent="var(--color-primary-light)"
        />
        <ResultCard
          icon="🔥"
          title="Daily Calories"
          value={Math.round(goalCalories)}
          unit="kcal"
          description="Adjusted for your selected goal"
          accent="var(--color-coral)"
        />
        <ResultCard
          icon="🥩"
          title="Protein"
          value={proteinG}
          unit="g / day"
          description="Supports muscle repair and growth"
          accent="var(--color-coral)"
        />
        <ResultCard
          icon="🍚"
          title="Carbohydrates"
          value={carbsG}
          unit="g / day"
          description="Your body's primary energy source"
          accent="var(--color-sky)"
        />
        <ResultCard
          icon="🥑"
          title="Fat"
          value={fatG}
          unit="g / day"
          description="Supports hormones and vitamin absorption"
          accent="var(--color-accent-dark)"
        />
        <ResultCard
          icon="💧"
          title="Water Intake"
          value={waterLiters}
          unit="L / day"
          description="Scaled to your body weight and activity"
          accent="var(--color-sky)"
        />
        <ResultCard
          icon="⚖️"
          title="Healthy Weight Range"
          value={`${weightRange.min_kg}–${weightRange.max_kg}`}
          unit="kg"
          description="Based on a normal BMI range (18.5–24.9)"
          accent="var(--color-primary-light)"
        />
      </div>

      {/* ---- Meal distribution ---- */}
      <div className="meal-section">
        <h3>🍽 Meal Distribution</h3>
        <p className="meal-section__subtitle">
          Your daily targets, split across four meals.
        </p>
        <div className="meal-grid">
          {Object.entries(mealPlan).map(([key, meal]) => (
            <div className="meal-card" key={key}>
              <div className="meal-card__header">
                <span aria-hidden="true">{MEAL_LABELS[key].icon}</span>
                <h4>{MEAL_LABELS[key].name}</h4>
              </div>
              <p className="meal-card__calories">{Math.round(meal.calories)} kcal</p>
              <dl className="meal-card__macros">
                <div>
                  <dt>Protein</dt>
                  <dd>{meal.protein_g} g</dd>
                </div>
                <div>
                  <dt>Carbs</dt>
                  <dd>{meal.carbs_g} g</dd>
                </div>
                <div>
                  <dt>Fat</dt>
                  <dd>{meal.fat_g} g</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
