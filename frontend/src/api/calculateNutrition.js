/**
 * calculateNutrition.js
 * ----------------------
 * A single, focused function responsible for talking to the backend API.
 * Keeping API calls in their own file (instead of scattered inside
 * components) makes it easy to find, test, and update how the frontend
 * talks to the backend.
 */

// Vite exposes environment variables that start with VITE_ on
// import.meta.env. This value comes from your .env file locally, and
// from Vercel's project settings when deployed.
const API_URL = import.meta.env.VITE_API_URL;

/**
 * Sends the user's form data to the backend and returns the parsed
 * nutrition results.
 *
 * @param {object} formData - matches the backend's UserInput schema
 * @returns {Promise<object>} the calculated nutrition results
 * @throws {Error} with a friendly, readable message on failure
 */
export async function calculateNutrition(formData) {
  if (!API_URL) {
    throw new Error(
      "The API URL is not configured. Please set VITE_API_URL in your .env file."
    );
  }

  let response;
  try {
    response = await fetch(`${API_URL}/calculate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });
  } catch (networkError) {
    // fetch() throws when the network request itself fails
    // (e.g. server is down, no internet connection, CORS blocked).
    throw new Error(
      "Could not reach the FitMacros server. Please check your connection and try again."
    );
  }

  if (!response.ok) {
    // FastAPI returns validation errors as { detail: [...] }.
    // We convert that into one friendly, readable sentence.
    const errorBody = await response.json().catch(() => null);
    const friendlyMessage = extractFriendlyErrorMessage(errorBody);
    throw new Error(friendlyMessage);
  }

  return response.json();
}

/**
 * Turns FastAPI's validation error format into a single readable sentence
 * a beginner (or an end user) can actually understand.
 */
function extractFriendlyErrorMessage(errorBody) {
  if (!errorBody || !errorBody.detail) {
    return "Something went wrong while calculating your results. Please try again.";
  }

  // FastAPI validation errors come back as a list of { loc, msg } objects.
  if (Array.isArray(errorBody.detail)) {
    const messages = errorBody.detail.map((item) => {
      const field = item.loc?.[item.loc.length - 1] ?? "value";
      return `${field}: ${item.msg}`;
    });
    return messages.join(". ");
  }

  // Sometimes FastAPI sends a plain string in "detail".
  return String(errorBody.detail);
}
