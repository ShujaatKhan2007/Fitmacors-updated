/**
 * Header.jsx
 * ----------
 * The top hero section of the page: a gradient banner with the product
 * name and a short line explaining what the tool does.
 */
export default function Header() {
  return (
    <header className="hero">
      <div className="hero__inner">
        <div className="hero__badge">SCIENCE-BASED · NO SIGN-UP · FREE</div>
        <h1 className="hero__title">
          Fit<span className="hero__title-accent">Macros</span>
        </h1>
        <p className="hero__subtitle">
          Enter your body measurements once and get a full nutrition
          readout&nbsp;&mdash; BMI, calories, macros, water and a
          meal-by-meal plan&nbsp;&mdash; built on the same formulas
          dietitians use.
        </p>
      </div>
      {/* Decorative ring, echoes the macro-ring signature element used
          later in the results dashboard. Purely visual, hidden from
          screen readers. */}
      <svg
        className="hero__ring"
        viewBox="0 0 200 200"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="100" cy="100" r="86" className="hero__ring-track" />
        <circle
          cx="100"
          cy="100"
          r="86"
          className="hero__ring-progress"
        />
      </svg>
    </header>
  );
}
