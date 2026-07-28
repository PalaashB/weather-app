import { useState } from 'react'
import './App.css'

function App() {
  const [location, setLocation] = useState('')

  function handleSearch(e) {
    e.preventDefault()
  }

  function useMyLocation() {
    navigator.geolocation.getCurrentPosition((pos) => {
      setLocation(`${pos.coords.latitude.toFixed(4)},${pos.coords.longitude.toFixed(4)}`)
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
    </div>
  )
}

export default App
