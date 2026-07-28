import sqlite3

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# FastAPI run sync endpoints in a threadpool, so the connection can't be thread-bound
db = sqlite3.connect("weather.db", check_same_thread=False)
db.execute(
    """CREATE TABLE IF NOT EXISTS records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        location TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT NOT NULL,
        temperature_data TEXT,
        created_at TEXT
    )"""
)
db.commit()

GEO_URL = "https://geocoding-api.open-meteo.com/v1/search"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"


def geocode(location):
    parts = location.split(",")
    if len(parts) == 2:
        try:
            return {"name": location, "latitude": float(parts[0]), "longitude": float(parts[1])}
        except ValueError:
            pass

    r = httpx.get(GEO_URL, params={"name": location, "count": 1})
    results = r.json().get("results")
    if not results:
        return None
    return results[0]


@app.get("/api/weather")
def get_weather(location: str):
    place = geocode(location)
    if place is None:
        raise HTTPException(status_code=404, detail="Location not found")

    r = httpx.get(
        FORECAST_URL,
        params={
            "latitude": place["latitude"],
            "longitude": place["longitude"],
            "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code",
            "daily": "weather_code,temperature_2m_max,temperature_2m_min",
            "forecast_days": 5,
            "timezone": "auto",
        },
    )
    data = r.json()
    daily = data["daily"]
    forecast = [
        {
            "date": daily["time"][i],
            "code": daily["weather_code"][i],
            "max": daily["temperature_2m_max"][i],
            "min": daily["temperature_2m_min"][i],
        }
        for i in range(len(daily["time"]))
    ]
    return {
        "name": place["name"],
        "country": place.get("country", ""),
        "current": data["current"],
        "forecast": forecast,
    }
