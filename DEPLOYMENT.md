# SyncStore Deployment Guide

This document outlines the steps required to deploy the SyncStore full-stack application to **Render**.

## Overview
SyncStore consists of two main parts:
1.  **Backend (API):** A FastAPI application located in the `backend/` directory.
2.  **Frontend (Web Dashboard):** A React application located in the `web/` directory.

Since GitHub Pages only hosts static files, we use **Render** to host both the API and the Frontend.

---

## Deployment Steps

### 1. Backend Setup (Render Web Service)
1.  In the Render Dashboard, click **New +** → **Web Service**.
2.  Connect your GitHub repository (`nmohith22/SyncStore`).
3.  Configure the service:
    *   **Name:** `syncstore-backend`
    *   **Runtime:** `Python 3`
    *   **Build Command:** `pip install -r requirements.txt`
    *   **Start Command:** `uvicorn main:app --host 0.0.0.0 --port 8000`
    *   **Root Directory:** `backend`
    *   **Plan:** Select **Free**.
4.  **Environment Variables (Environment tab):**
    *   `STEAM_API_KEY`: [Your Steam API Key]
    *   `SECRET_KEY`: [A random long string]
    *   `PYTHON_VERSION`: `3.11.1`
5.  Click **Create Web Service**.

### 2. Frontend Setup (Render Static Site)
1.  In the Render Dashboard, click **New +** → **Static Site**.
2.  Connect your GitHub repository.
3.  Configure the service:
    *   **Name:** `syncstore-frontend`
    *   **Build Command:** `npm install && npm run build`
    *   **Publish Directory:** `dist`
    *   **Root Directory:** `web`
    *   **Plan:** Select **Free**.
4.  **Redirects/Rewrites:**
    *   Add rule: `/*` -> `/index.html` (to support React routing).
5.  Click **Create Static Site**.

---

## Important Post-Deployment Tasks

### 1. Update Frontend API URL
After the backend is deployed, Render will provide a **Public URL** (e.g., `https://syncstore-backend.onrender.com`).
You must update this URL in your frontend code so it stops trying to connect to `localhost:8001`:
*   Update `web/src/App.tsx`
*   Update `web/src/components/PlatformCard.tsx`
*   Update `web/src/components/SettingsModal.tsx`

### 2. UptimeRobot (Preventing Cold Starts)
To keep the free backend awake:
1.  Go to [UptimeRobot](https://uptimerobot.com/).
2.  Create a new monitor.
3.  **URL:** `https://your-backend-name.onrender.com/health`
4.  **Interval:** 5 minutes.

---

## Environment Variables Reference
*   **STEAM_API_KEY**: Obtain from [Steam Community Web API Key](https://steamcommunity.com/dev/apikey).
*   **SECRET_KEY**: Generate locally using `python -c "import secrets; print(secrets.token_hex(32))"`.
