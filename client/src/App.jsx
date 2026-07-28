import { useEffect, useState } from 'react'
import './App.css'

const API = 'http://localhost:8000'

const icons = {
  0: '☀️',
  1: '🌤️',
  2: '⛅',
  3: '☁️',          // WMO weather codes
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
  const [error, setError] = useState('')
  const [records, setRecords] = useState([])

  useEffect(() => {
    loadRecords()
  }, [])

  async function loadRecords() {
    const res = await fetch(`${API}/api/records`)
    setRecords(await res.json())
  }

  async function load(loc) {
    setLoading(true)
    setError('')
    setData(null)
    try {
      const res = await fetch(`${API}/api/weather?location=${encodeURIComponent(loc)}`)
      if (res.ok) {
        setData(await res.json())
      } else {
        const body = await res.json()
        setError(body.detail)
      }
    } catch {
      setError('Could not load weather. Is the server running?')
    }
    setLoading(false)
  }

  function ask(r) {
    const location = prompt('Location', r ? r.location : '')
    if (!location) return null
    const start_date = prompt('Start date (YYYY-MM-DD)', r ? r.start_date : '')
    if (!start_date) return null
    const end_date = prompt('End date (YYYY-MM-DD)', r ? r.end_date : '')
    if (!end_date) return null
    return { location, start_date, end_date }
  }

  async function send(url, method, body) {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      loadRecords()
    } else {
      const problem = await res.json()
      alert(problem.detail)
    }
  }

  function addRecord() {
    const body = ask()
    if (body) send(`${API}/api/records`, 'POST', body)
  }

  function editRecord(r) {
    const body = ask(r)
    if (body) send(`${API}/api/records/${r.id}`, 'PUT', body)
  }

  async function deleteRecord(id) {
    if (!confirm('Delete this record?')) return
    await fetch(`${API}/api/records/${id}`, { method: 'DELETE' })
    loadRecords()
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
      {error && <p className="error">{error}</p>}

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

      <h2>Saved records</h2>
      <p>
        <button onClick={addRecord}>Add record</button>{' '}
        <a href={`${API}/api/export`}>Export CSV</a>
      </p>

      <table>
        <thead>
          <tr>
            <th>Location</th>
            <th>From</th>
            <th>To</th>
            <th>Low / high</th>
            <th>Saved</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id}>
              <td>{r.location}</td>
              <td>{r.start_date}</td>
              <td>{r.end_date}</td>
              <td>
                {Math.min(...r.temperature_data.map((d) => d.min))}° /{' '}
                {Math.max(...r.temperature_data.map((d) => d.max))}°
              </td>
              <td>{r.created_at.replace('T', ' ')}</td>
              <td>
                <button onClick={() => editRecord(r)}>Edit</button>{' '}
                <button onClick={() => deleteRecord(r.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default App
