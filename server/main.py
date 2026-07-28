import sqlite3

from fastapi import FastAPI
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
