import { useState } from 'react'
import './App.css'

const API = 'http://localhost:8000'

const icons = {
  0: '☀️',
  1: '🌤️',
  2: '⛅',
  3: '☁️',
  45: '🌫️',
  48: '🌫️',
  51: '🌦️',
  53: '🌦️',
  55: '🌦️',
  61: '🌧️',
  63: '🌧️',
  65: '🌧️',
  71: '🌨️',
  73: '🌨️',
  75: '🌨️',
  77: '🌨️',
  80: '🌦️',
  81: '🌧️',
  82: '🌧️',
  85: '🌨️',
  86: '🌨️',
  95: '⛈️',
  96: '⛈️',
  99: '⛈️',
}

function App() {
  const [location, setLocation] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  async function load(loc) {
    setLoading(true)
    const res = await fetch(`${API}/api/weather?location=${encodeURIComponent(loc)}`)
    setData(await res.json())
    setLoading(false)
  }

  function handleSearch(e) {
    e.preventDefault()
    load(location)
  }

  function useMyLocation() {
    navigator.geolocation.getCurrentPosition((pos) => {
      const coords = `${pos.coords.latitude.toFixed(4)},${pos.coords.longitude.toFixed(4)}`
      setLocation(coords)
      load(coords)
    })
  }

  return (
    <div className="app">
      <h1>Weather App</h1>

      <form className="search" onSubmit={handleSearch}>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="City, zip code, or lat,lng"
        />
        <button type="submit">Search</button>
        <button type="button" onClick={useMyLocation}>
          Use my location
        </button>
      </form>

      {loading && <p>Loading...</p>}

      {data && (
        <div className="current">
          <h2>
            {data.name}
            {data.country && `, ${data.country}`}
          </h2>
          <p className="temp">
            {icons[data.current.weather_code]} {data.current.temperature_2m}°C
          </p>
          <p>Humidity: {data.current.relative_humidity_2m}%</p>
          <p>Wind: {data.current.wind_speed_10m} km/h</p>

          <h3>5-day forecast</h3>
          <div className="forecast">
            {data.forecast.map((day) => (
              <div key={day.date} className="day">
                <div>{day.date.slice(5)}</div>
                <div className="icon">{icons[day.code]}</div>
                <div>
                  {day.max}° / {day.min}°
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
