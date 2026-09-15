import { useRef, useState } from "react";
import { resizeImageForUpload } from "../utils/imageResize.js";
import { analyzeFoodImage } from "../api/foodAnalysisApi.js";

/**
 * FoodPhotoAnalyzer.jsx
 * ----------------------
 * A floating button (bottom-left, mirroring the chat widget on the
 * bottom-right) that opens a panel where the user can take or upload a
 * photo of their food and get an AI-estimated nutrition breakdown -
 * calories, protein, carbs, and fat, itemized per visible ingredient.
 */
export default function FoodPhotoAnalyzer() {
  const [isOpen, setIsOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [imageData, setImageData] = useState(null); // { base64, mimeType }
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const cameraInputRef = useRef(null);
  const uploadInputRef = useRef(null);

  async function handleFileSelected(event) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setError(null);
    setResult(null);

    try {
      const { base64, mimeType, previewUrl: preview } = await resizeImageForUpload(file);
      setImageData({ base64, mimeType });
      setPreviewUrl(preview);
    } catch (err) {
      setError(err.message || "Could not load that photo. Please try another one.");
    }
  }

  async function handleAnalyze() {
    if (!imageData) return;
    setIsAnalyzing(true);
    setError(null);

    try {
      const data = await analyzeFoodImage(imageData.base64, imageData.mimeType);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleReset() {
    setPreviewUrl(null);
    setImageData(null);
    setResult(null);
    setError(null);
  }

  function handleClose() {
    setIsOpen(false);
    handleReset();
  }

  return (
    <>
      <button
        type="button"
        className="food-fab"
        onClick={() => setIsOpen(true)}
        aria-label="Open food photo analyzer"
      >
        📸
      </button>

      {isOpen && (
        <div className="food-overlay" role="dialog" aria-label="Food Photo Analyzer">
          <div className="food-panel">
            <div className="food-panel__header">
              <div>
                <p className="food-panel__title">📸 Food Photo Analyzer</p>
                <p className="food-panel__subtitle">Snap or upload a photo to estimate its nutrition</p>
              </div>
              <button type="button" className="food-panel__close" onClick={handleClose} aria-label="Close">
                ✕
              </button>
            </div>

            <div className="food-panel__body">
              {!previewUrl && (
                <div className="food-upload-choices">
                  <button
                    type="button"
                    className="cta-button"
                    onClick={() => cameraInputRef.current?.click()}
                  >
                    📷 Take Photo
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => uploadInputRef.current?.click()}
                  >
                    🖼 Upload Photo
                  </button>

                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileSelected}
                    hidden
                  />
                  <input
                    ref={uploadInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelected}
                    hidden
                  />
                </div>
              )}

              {previewUrl && (
                <div className="food-preview">
                  <img src={previewUrl} alt="Selected food" className="food-preview__image" />

                  {!result && !isAnalyzing && (
                    <div className="food-preview__actions">
                      <button type="button" className="cta-button" onClick={handleAnalyze}>
                        🔍 Analyze Food
                      </button>
                      <button type="button" className="ghost-button" onClick={handleReset}>
                        Choose Different Photo
                      </button>
                    </div>
                  )}

                  {isAnalyzing && (
                    <div className="food-analyzing">
                      <span className="loader-ring" aria-hidden="true"></span>
                      <p>Analyzing your food...</p>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="error-banner" role="alert">
                  <span className="error-banner__icon" aria-hidden="true">⚠️</span>
                  <div>
                    <p className="error-banner__title">Couldn't analyze that photo</p>
                    <p className="error-banner__message">{error}</p>
                  </div>
                </div>
              )}

              {result && <FoodAnalysisResults result={result} onReset={handleReset} />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FoodAnalysisResults({ result, onReset }) {
  return (
    <div className="food-results">
      <h3 className="food-results__summary">{result.food_summary}</h3>

      <div className="food-results__totals">
        <div className="food-results__total-card">
          <span className="food-results__total-value">{Math.round(result.total_calories)}</span>
          <span className="food-results__total-label">kcal</span>
        </div>
        <div className="food-results__total-card">
          <span className="food-results__total-value">{Math.round(result.total_protein_g)}g</span>
          <span className="food-results__total-label">Protein</span>
        </div>
        <div className="food-results__total-card">
          <span className="food-results__total-value">{Math.round(result.total_carbs_g)}g</span>
          <span className="food-results__total-label">Carbs</span>
        </div>
        <div className="food-results__total-card">
          <span className="food-results__total-value">{Math.round(result.total_fat_g)}g</span>
          <span className="food-results__total-label">Fat</span>
        </div>
      </div>

      {result.items.length > 0 && (
        <ul className="food-results__items">
          {result.items.map((item) => (
            <li key={item.name} className="food-item-row">
              <div className="food-item-row__info">
                <span className="food-item-row__name">{item.name}</span>
                <span className="food-item-row__portion">{item.estimated_portion}</span>
              </div>
              <div className="food-item-row__macros">
                <span>{Math.round(item.calories)} kcal</span>
                <span>P {Math.round(item.protein_g)}g · C {Math.round(item.carbs_g)}g · F {Math.round(item.fat_g)}g</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="food-results__disclaimer">{result.confidence_note}</p>

      <button type="button" className="ghost-button ghost-button--full" onClick={onReset}>
        Analyze Another Photo
      </button>
    </div>
  );
}
