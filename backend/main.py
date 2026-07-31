"""
main.py
-------
Entry point for the FitMacros backend.

This is the file you run to start the API server:
    uvicorn main:app --reload

Responsibilities of this file:
  1. Create the FastAPI app.
  2. Configure CORS so the frontend (running on a different origin) is
     allowed to call this API.
  3. "Plug in" the routes defined in app/routes.py.

All the actual business logic lives in app/calculations.py and app/routes.py
so this file stays short and easy to scan.
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.routes import router
from app.chat_routes import router as chat_router

# Load variables from a local .env file (if one exists) into the environment.
# On Render, environment variables are set in the dashboard instead, and
# load_dotenv() simply does nothing in that case.
load_dotenv()

app = FastAPI(
    title="FitMacros API",
    description="Calculates BMI, BMR, TDEE, macros, water intake and meal plans.",
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# CORS (Cross-Origin Resource Sharing)
# ---------------------------------------------------------------------------
# The frontend (e.g. https://fitmacros.vercel.app) runs on a different
# origin than the backend (e.g. https://fitmacros-api.onrender.com).
# Browsers block cross-origin requests by default, so we must explicitly
# allow the frontend's URL here.
#
# ALLOWED_ORIGINS is read from an environment variable so you never have to
# hardcode a URL in the source code. Multiple origins can be comma-separated.
# Example .env value:
#   ALLOWED_ORIGINS=http://localhost:5173,https://fitmacros.vercel.app
raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
allowed_origins = [origin.strip() for origin in raw_origins.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routes from app/routes.py and app/chat_routes.py.
app.include_router(router)
app.include_router(chat_router)


@app.get("/")
def read_root():
    """Simple health-check endpoint. Useful for confirming the API is live."""
    return {
        "status": "ok",
        "message": "FitMacros API is running. See /docs for interactive API docs.",
    }
