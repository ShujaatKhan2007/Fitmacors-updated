/**
 * chatApi.js
 * ----------
 * A small, focused function for talking to the chatbot's /chat endpoint.
 * Mirrors the pattern used in calculateNutrition.js.
 */

const API_URL = import.meta.env.VITE_API_URL;

/**
 * Sends a chat message (and optionally the user's calculated results as
 * context) to the backend and returns the bot's reply.
 *
 * @param {string} message - what the user typed
 * @param {object|null} context - the user's calculated nutrition/workout results, if any
 * @returns {Promise<{reply: string, topic: string}>}
 */
export async function sendChatMessage(message, context = null) {
  if (!API_URL) {
    throw new Error(
      "The API URL is not configured. Please set VITE_API_URL in your .env file."
    );
  }

  let response;
  try {
    response = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, context }),
    });
  } catch (networkError) {
    throw new Error(
      "Could not reach the FitMacros Fitness Coach. Please check your connection and try again."
    );
  }

  if (!response.ok) {
    throw new Error("Something went wrong while getting a response. Please try again.");
  }

  return response.json();
}
