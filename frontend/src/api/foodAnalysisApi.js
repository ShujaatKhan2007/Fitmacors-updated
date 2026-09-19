/**
 * foodAnalysisApi.js
 * -------------------
 * Sends a resized food photo to the backend for analysis.
 */

const API_URL = import.meta.env.VITE_API_URL;

/**
 * @param {string} base64 - raw base64 image data (no data: URL prefix)
 * @param {string} mimeType - e.g. "image/jpeg"
 * @returns {Promise<object>} the FoodAnalysisResult from the backend
 */
export async function analyzeFoodImage(base64, mimeType) {
  if (!API_URL) {
    throw new Error(
      "The API URL is not configured. Please set VITE_API_URL in your .env file."
    );
  }

  let response;
  try {
    response = await fetch(`${API_URL}/analyze-food`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_base64: base64, mime_type: mimeType }),
    });
  } catch (networkError) {
    throw new Error(
      "Could not reach the FitMacros server. Please check your connection and try again."
    );
  }

  if (!response.ok) {
    // The backend sends a friendly, specific message in "detail" for
    // known failure cases (e.g. AI not configured, or the call failed).
    const errorBody = await response.json().catch(() => null);
    throw new Error(
      errorBody?.detail || "Something went wrong while analyzing that photo. Please try again."
    );
  }

  return response.json();
}
