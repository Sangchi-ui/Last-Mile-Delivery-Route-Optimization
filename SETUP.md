# 🛠️ Setup Instructions - AI Route Optimizer (FREE Edition)

## 🚀 No API Keys Required!
This project has been optimized for hackathons to run **instantly** without needing Google Cloud billing or API keys. We use OpenStreetMap (Leaflet) and OSRM for routing.

---

## 1. Backend Installation (Python)
Ensure you have Python 3.9+ installed.

```bash
# Navigate to project root
cd "d:/Gitam Hackathon"

# Create virtual environment (if not already done)
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate

# Install dependencies (geopy added for free geocoding)
pip install flask flask-cors requests geopy
```

---

## 2. Running the System
You need two components running:

**Component 1: Backend Server**
```bash
python backend/app.py
```
*The server starts on `http://localhost:5000`*

**Component 2: Frontend UI**
- Simply open `frontend/index.html` in your browser (Chrome/Edge recommended).
- No web server is strictly required, but you can use VS Code's "Live Server" if preferred.

---

## 3. Usage Guide
1.  **Store Location:** Type a full address (e.g., "Gitam University, Visakhapatnam").
2.  **Delivery Points:** Add at least 1-3 customer addresses using the "+" button.
3.  **Compute:** Click **"Compute Optimized Route"**.
4.  **Wait:** The AI calculates the distance matrix and optimizes the sequence.
5.  **Visualize:** The map will automatically zoom to show your optimized path in India.

---

## 💡 Why this is better for Hackathons:
- **Zero Configuration:** Judges can run it immediately.
- **Privacy:** No private keys shared in code.
- **Cost:** Completely free to use.
