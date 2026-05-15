# Least Cost Portrait — KTH Studio Edition


> *Transforming image brightness into physical friction, and friction into art.*

Inspired by **Dana Tomlin's lecture on Map Algebra** at KTH (May 11, 2026), this experimental full-stack web application bridges classic GIS algorithms with generative visual art. It treats every pixel's luminance as a resistance value and simulates a wavefront propagating across the image surface — the resulting **iso-cost contour lines** become a portrait.

Demo
🌐 **Live Demo: [yang-geo.github.io/least-cost-portrait](https://yang-geo.github.io/least-cost-portrait/)**

⚠️ The backend runs on a free-tier server. Processing may take 30–60 seconds — please be patient after placing your seed point.
---

## The Concept

This project is built on the core idea of **cost-distance analysis** from GIS:

- Dark pixels → high friction → the wavefront slows down and bends
- Bright pixels → low friction → the wavefront moves freely
- Placing a **seed point** (e.g., on a subject's eye) launches a simulated wave
- The extracted **iso-cost lines** — contours of equal accumulated cost — trace the geometry of light and shadow in the face

The cost surface formula is:

```
Cost = 1 + (1 − Grayscale) × Friction Multiplier
```

The algorithm uses **Dijkstra / MCP_Geometric** (Minimum Cost Path) from `scikit-image` to compute the cumulative cost matrix across the entire image.

---

## Demo

| Original | Cost Surface | Portrait Output |
|----------|-------------|-----------------|
| RGB image | Grayscale friction map | Iso-cost contour lines |

---

## Features

- **Interactive Canvas Engine** — synchronized dual-viewport (RGB + Grayscale) with zoom, pan, and seed placement
- **Parametric Control** — adjust Friction Multiplier and Contour Density in real time
- **Sample Images** — built-in Mona Lisa and Eddie Peng presets
- **Export** — download results as PNG, JPG, or SVG
- **Decoupled Architecture** — JavaScript frontend + Python FastAPI backend

---

## Project Structure

```
least-cost-portrait/
├── frontend/
│   ├── index.html        # Studio UI — dual canvas workspace + sidebar controls
│   ├── styles.css        # Dark mode UI, custom tooltips, checkerboard preview
│   ├── script.js         # Canvas 2D camera engine, seed management, API calls
│   ├── MonaLisa.jpg      # Sample image
│   └── EddiePeng.png     # Sample image
├── backend/
│   ├── main.py           # FastAPI server — cost surface + MCP + contour rendering
│   └── requirements.txt  # Python dependencies
└── README.md
```

---

## Getting Started (Local Development)

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 2. Frontend

The frontend is plain HTML/CSS/JS — no build step required. Serve it with any local server (required for sample image loading via `fetch`):

```bash
# Option A: Python
cd frontend
python -m http.server 5500

# Option B: VS Code Live Server
# Right-click index.html → Open with Live Server
```

Then open `http://127.0.0.1:5500` in your browser.

> **Note:** Opening `index.html` directly via `file://` will block sample image loading due to browser CORS policy. Always use a local server.

---

## Usage

1. Upload an image or choose a sample (Mona Lisa / Eddie Peng)
2. Adjust **Friction Multiplier** — higher values create stronger refraction around dark regions
3. Adjust **Contour Density** — more levels reveal finer topographic detail
4. Click on the image to place **seed points** (e.g., on the eyes or key features)
5. Click **Generate Portrait**
6. Export as PNG / JPG / SVG

---

## Deployment

| Layer | Platform | Cost |
|-------|----------|------|
| Frontend | GitHub Pages | Free |
| Backend | Render.com | Free tier |

See [deployment guide](#) for full setup instructions.

> **Note:** Render's free tier sleeps after 15 minutes of inactivity. The first request after sleep may take ~30 seconds to wake the backend.

---

## Tech Stack

**Frontend**
- Vanilla JavaScript (Canvas 2D API)
- Custom camera system with synchronized dual viewports
- No frameworks, no build tools

**Backend**
- Python + FastAPI
- `scikit-image` — MCP_Geometric (Dijkstra-based cost accumulation)
- `matplotlib` — contour line extraction and rendering
- `numpy` — cost surface matrix operations

---

## Acknowledgements

This project was created as a personal exploration following **Dana Tomlin's guest lecture** at KTH (May 11, 2026) on Map Algebra and cost-distance analysis.

---

## Author

**Ziqi Yang** — KTH
