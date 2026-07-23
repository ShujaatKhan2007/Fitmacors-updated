/**
 * MacroRing.jsx
 * -------------
 * The visual "signature" of the results dashboard: a single ring split
 * into three arcs (protein / carbs / fat), similar to an activity tracker
 * ring but built from the day's macro split instead of steps or exercise.
 *
 * It's drawn as pure SVG so it needs no charting library.
 */
export default function MacroRing({ proteinG, carbsG, fatG, calories }) {
  const proteinCals = proteinG * 4;
  const carbsCals = carbsG * 4;
  const fatCals = fatG * 9;
  const totalCals = proteinCals + carbsCals + fatCals || 1;

  const radius = 70;
  const circumference = 2 * Math.PI * radius;

  // Each macro's share of the ring, as a length along the circle.
  const proteinLength = (proteinCals / totalCals) * circumference;
  const carbsLength = (carbsCals / totalCals) * circumference;
  const fatLength = (fatCals / totalCals) * circumference;

  // Small gaps between segments so each arc reads as a distinct piece.
  const gap = 4;

  const segments = [
    { length: proteinLength, color: "var(--color-coral)", label: "Protein" },
    { length: carbsLength, color: "var(--color-sky)", label: "Carbs" },
    { length: fatLength, color: "var(--color-accent-dark)", label: "Fat" },
  ];

  let offsetSoFar = 0;

  return (
    <div className="macro-ring">
      <svg
        viewBox="0 0 180 180"
        className="macro-ring__svg"
        role="img"
        aria-label={`Macro split: ${proteinG} grams protein, ${carbsG} grams carbs, ${fatG} grams fat`}
      >
        <circle
          cx="90"
          cy="90"
          r={radius}
          className="macro-ring__track"
          fill="none"
          strokeWidth="16"
        />
        {segments.map((segment) => {
          const dashArray = `${Math.max(segment.length - gap, 0)} ${circumference}`;
          const dashOffset = -offsetSoFar;
          offsetSoFar += segment.length;
          return (
            <circle
              key={segment.label}
              cx="90"
              cy="90"
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 90 90)"
              className="macro-ring__segment"
            />
          );
        })}
      </svg>
      <div className="macro-ring__center">
        <span className="macro-ring__value">{Math.round(calories)}</span>
        <span className="macro-ring__unit">kcal / day</span>
      </div>
    </div>
  );
}
