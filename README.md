# 🕹️ SyncStore

SyncStore is a high-fidelity, real-time gaming dashboard that bridges your physical nodes with your digital library. It’s designed for players who want a single, clean interface to track their collections across Steam, Epic, PlayStation, and Xbox—without the clutter of mock data or simulations.

Unlike other aggregators, SyncStore uses a **Deep-Scrape Protocol** to pull your actual owned units, real playtime, and official high-res artwork directly from authenticated sources.

## 🚀 Key Features

*   **Real-Time Sync:** No more mock data. If it's in your library, you own it.
*   **Official Metadata:** Scrapes descriptions, genres, and release years directly from official stores (like Steam) for 100% accuracy.
*   **Dual-Platform Experience:** Built with a modern, animated web interface and a mirrored mobile app for library tracking on the go.
*   **Intelligent Grouping:** Automatically merges identical games across multiple platforms into single, unified cards with distinct platform badges.
*   **Animated UI:** Premium interaction design featuring expanding themed search bars and "reveal-on-hover" library cards.

## 🛠️ CI/CD Architecture

We take stability seriously. SyncStore uses GitHub Actions to automate the entire development lifecycle:

*   **Continuous Integration (CI):** Every push to a development branch triggers a full build and lint check for both the Web (Vite) and Mobile (Expo) projects. This ensures no breaking changes ever hit our staging environment.
*   **Continuous Deployment (CD):** Merging to `main` automatically deploys the latest web dashboard to **GitHub Pages** and triggers a release build for mobile via **Expo Application Services (EAS)**.

## 📥 Getting Started

### Prerequisites
*   **Node.js (v20+)**
*   **Python 3.11+** (for the backend node)
*   **Steam Account:** Ensure your profile and game list are set to **Public** in your Steam Privacy Settings.

### Installation

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/nmohith22/SyncStore.git
    cd SyncStore
    ```

2.  **Start the Backend Node**
    ```bash
    cd backend
    python -m venv venv
    .\venv\Scripts\activate  # Windows
    pip install -r requirements.txt
    python -m uvicorn main:app --port 8001
    ```

3.  **Launch the Web Dashboard**
    ```bash
    cd ../web
    npm install
    npm run dev
    ```

4.  **Run the Mobile App**
    ```bash
    cd ../mobile
    npm install
    npx expo start
    ```

## ⚖️ License

Distributed under the **MIT License**. See `LICENSE` for more information.

---
*Built with ❤️ for the gaming community.*
