// Frontend for GeoChain (React + Leaflet + Axios + UI Enhancements)
import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import './App.css'; // Assume custom CSS for responsive layout

const App = () => {
  const [useNaturalLang, setUseNaturalLang] = useState(true);
  const [insertMode, setInsertMode] = useState(true);
  const [locationInput, setLocationInput] = useState('');
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [radius, setRadius] = useState(1000);
  const [name, setName] = useState('');
  const [results, setResults] = useState([]);
  const [center, setCenter] = useState([20, 77]);

  const toggleMode = () => setInsertMode(!insertMode);
  const toggleInputType = () => setUseNaturalLang(!useNaturalLang);

  const handleInsert = async () => {
    try {
      const payload = useNaturalLang
        ? { useNaturalLanguage: true, location: locationInput, name }
        : { useNaturalLanguage: false, x: parseFloat(lon), y: parseFloat(lat), name };

      const res = await axios.post('http://localhost:3000/insert', payload);
      alert('Data inserted: ' + JSON.stringify(res.data.point));
    } catch (err) {
      alert('Insert error: ' + err.message);
    }
  };

  const handleSearch = async () => {
    try {
      const payload = useNaturalLang
        ? { useNaturalLanguage: true, query: locationInput, radius }
        : { useNaturalLanguage: false, query: `${lat},${lon}`, radius };

      const res = await axios.post('http://localhost:3000/geosearch', payload);
      setResults(res.data.results);
      setCenter([res.data.center.y, res.data.center.x]);
    } catch (err) {
      alert('Search error: ' + err.message);
    }
  };

  return (
    <div style={{ minHeight: '100vh', padding: '40px', fontFamily: 'Segoe UI, sans-serif', background: 'linear-gradient(to right, #e0eafc, #cfdef3)' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', background: '#ffffff', borderRadius: '16px', padding: '30px', boxShadow: '0 12px 30px rgba(0,0,0,0.15)' }}>
        <h1 style={{ textAlign: 'center', color: '#1a365d', fontSize: '2.5rem' }}>🌍 GeoChain</h1>

        <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <button onClick={toggleMode} className="btn">{insertMode ? 'Mode: Insert' : 'Mode: Search'}</button>
          <button onClick={toggleInputType} className="btn">{useNaturalLang ? 'Input: Natural Language' : 'Input: Lat/Lon'}</button>
        </div>

        <div className="form-section">
          {useNaturalLang ? (
            <input className="input" placeholder="Enter location (e.g., New York)" value={locationInput} onChange={e => setLocationInput(e.target.value)} />
          ) : (
            <>
              <input className="input" placeholder="Latitude" value={lat} onChange={e => setLat(e.target.value)} />
              <input className="input" placeholder="Longitude" value={lon} onChange={e => setLon(e.target.value)} />
            </>
          )}

          {insertMode ? (
            <>
              <input className="input" placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
              <button className="btn" onClick={handleInsert}>📍 Insert</button>
            </>
          ) : (
            <>
              <input className="input" placeholder="Radius in meters" value={radius} onChange={e => setRadius(e.target.value)} />
              <button className="btn" onClick={handleSearch}>🔍 Search</button>
            </>
          )}
        </div>

        <div style={{ marginTop: '30px' }}>
          <MapContainer center={center} zoom={5} style={{ height: '500px', width: '100%' }} key={center.toString()}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Circle center={center} radius={parseFloat(radius)} pathOptions={{ color: 'blue' }} />
            {results.map((p, i) => (
              <Marker key={i} position={[p.y, p.x]} />
            ))}
          </MapContainer>
        </div>

        <h3 style={{ marginTop: '30px', color: '#1a365d' }}>📦 Results (sorted by timestamp):</h3>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {results.map((p, i) => (
            <li key={i} style={{ padding: '8px 0', borderBottom: '1px solid #ccc' }}>
              <strong>{p.name}</strong> — {new Date(p.timestamp).toLocaleString()} — 📍 ({p.y}, {p.x})
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default App;
