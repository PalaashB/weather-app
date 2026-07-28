import json
import sqlite3
from datetime import date, datetime

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


def validate(body):
    try:
        start = date.fromisoformat(body["start_date"])
        end = date.fromisoformat(body["end_date"])
    except ValueError:
        raise HTTPException(status_code=400, detail="Dates must be YYYY-MM-DD")

    if start > end:
        raise HTTPException(status_code=400, detail="Start date must be on or before end date")

    place = geocode(body["location"])
    if place is None:
        raise HTTPException(status_code=404, detail="Location not found")

    return place, start, end


def fetch_temps(place, start, end):
    r = httpx.get(
        FORECAST_URL,
        params={
            "latitude": place["latitude"],
            "longitude": place["longitude"],
            "daily": "temperature_2m_max,temperature_2m_min",
            "start_date": str(start),
            "end_date": str(end),
            "timezone": "auto",
        },
    )
    data = r.json()
    if "daily" not in data:
        raise HTTPException(status_code=400, detail=data.get("reason", "No weather data for that range"))

    daily = data["daily"]
    return [
        {"date": daily["time"][i], "max": daily["temperature_2m_max"][i], "min": daily["temperature_2m_min"][i]}
        for i in range(len(daily["time"]))
    ]


@app.post("/api/records")
def create_record(body: dict):
    place, start, end = validate(body)
    temps = fetch_temps(place, start, end)
    cur = db.execute(
        "INSERT INTO records (location, start_date, end_date, temperature_data, created_at) VALUES (?, ?, ?, ?, ?)",
        (place["name"], str(start), str(end), json.dumps(temps), datetime.now().isoformat(timespec="seconds")),
    )
    db.commit()
    return {"id": cur.lastrowid}


@app.get("/api/records")
def list_records():
    rows = db.execute(
        "SELECT id, location, start_date, end_date, temperature_data, created_at FROM records ORDER BY id DESC"
    ).fetchall()
    return [
        {
            "id": row[0],
            "location": row[1],
            "start_date": row[2],
            "end_date": row[3],
            "temperature_data": json.loads(row[4]),
            "created_at": row[5],
        }
        for row in rows
    ]


@app.put("/api/records/{record_id}")
def update_record(record_id: int, body: dict):
    if db.execute("SELECT id FROM records WHERE id = ?", (record_id,)).fetchone() is None:
        raise HTTPException(status_code=404, detail="Record not found")

    place, start, end = validate(body)
    temps = fetch_temps(place, start, end)
    db.execute(
        "UPDATE records SET location = ?, start_date = ?, end_date = ?, temperature_data = ? WHERE id = ?",
        (place["name"], str(start), str(end), json.dumps(temps), record_id),
    )
    db.commit()
    return {"id": record_id}


@app.delete("/api/records/{record_id}")
def delete_record(record_id: int):
    cur = db.execute("DELETE FROM records WHERE id = ?", (record_id,))
    db.commit()
    if cur.rowcount == 0:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"deleted": record_id}
