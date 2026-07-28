# Weather App

React (Vite) frontend with a FastAPI backend. Weather, forecast and geocoding all come from Open-Meteo, which does not need an API key.

Backend: `cd server`, `pip install -r requirements.txt`, `uvicorn main:app --reload`. Runs on port 8000 and creates `weather.db` on first start.

Frontend: `cd client`, `npm install`, `npm run dev`. Runs on port 5173, which is the origin allowed by CORS on the backend.

Saved records can be added, edited and deleted from the table on the page, and exported as CSV from `/api/export`.
