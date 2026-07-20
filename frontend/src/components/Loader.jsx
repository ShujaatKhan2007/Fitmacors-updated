/**
 * Loader.jsx
 * ----------
 * Small animated indicator shown while we're waiting for the backend to
 * finish calculating. Built with pure CSS (see the .loader-ring rules in
 * App.css) so it stays lightweight - no extra libraries needed.
 */
export default function Loader({ message = "Crunching your numbers..." }) {
  return (
    <div className="loader" role="status" aria-live="polite">
      <span className="loader-ring" aria-hidden="true"></span>
      <p className="loader__message">{message}</p>
    </div>
  );
}
