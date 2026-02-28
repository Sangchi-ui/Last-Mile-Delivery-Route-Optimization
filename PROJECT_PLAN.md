# AI-Based Last-Mile Delivery Route Optimization - Implementation Plan (Open-Source)

## 🚀 Overview
This project solves the Last-Mile Delivery problem using a custom AI/ML-driven search algorithm (Nearest Neighbor + 2-opt Refinement) to minimize a multi-factor cost function. **This version is optimized for ZERO API KEYS.**

---

## 🏗️ System Architecture

### 1. Frontend (The Control Center)
- **Tech Stack:** HTML5, CSS3 (Glassmorphism), Vanilla JavaScript, **Leaflet.js**.
- **Features:**
    - Address-based input (Free text).
    - Map visualization using OpenStreetMap (Free & Keyless).
    - Real-time display of Optimization Metrics (Distance, Time, Cost in ₹).
    - Order sequence display.

### 2. Backend (The Brain)
- **Tech Stack:** Python, Flask.
- **Core Modules:**
    - **Geocoding Engine (Geopy/Nominatim):** Converts addresses to coordinates (Free).
    - **Distance Matrix Builder (OSRM):** Fetches real-world road distances/times (Free).
    - **AI Model:** Traveling Salesperson Problem (TSP) solver.
        - *Heuristic:* Nearest Neighbor.
        - *Improvement:* 2-opt Swap Algorithm.
    - **Cost Evaluator:** Computed in Indian Rupees (₹).

---

## 📊 Cost Function (Indian Context)
**Total Cost = α(D) + β(T) + γ(F) + δ(S)**
- **Distance Cost:** ₹10 per km weight.
- **Time Cost:** ₹5 per minute weight.
- **Fuel Cost:** ₹12 per km.
- **Labor Cost:** ₹180 per hour.

---

## 📁 Updated Folder Structure
```text
delivery_optimizer/
├── backend/
│   └── app.py              # Flask server with TSP & OSRM integration
├── frontend/
│   ├── index.html          # Leaflet implementation
│   ├── styles.css          # Premium Modern Design
│   └── script.js           # Frontend Logic (Leaflet Map)
├── setup.md                # Keyless installation
└── judge_script.md         # Pitch script
```
