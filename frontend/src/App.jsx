// GeoChain Frontend (React + Leaflet)
import React, { useState } from 'react';
import { MapContainer, TileLayer, useMapEvents, Rectangle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';

const IngestPoint = ({ onIngest }) => {
  const [x, setX] = useState('');
  const [y, setY] = useState('');
  const [data, setData] = useState('');

  const handleSubmit = async () => {
    await axios.post('http://localhost:3000/ingest', { x: +x, y: +y, data });
    onIngest();
  };

  return (
    <div className="p-4 space-y-2">
      <h2 className="text-lg font-bold">Ingest Point</h2>
      <input placeholder="X" value={x} onChange={e => setX(e.target.value)} className="border p-1" />
      <input placeholder="Y" value={y} onChange={e => setY(e.target.value)} className="border p-1" />
      <input placeholder="Data" value={data} onChange={e => setData(e.target.value)} className="border p-1" />
      <button onClick={handleSubmit} className="bg-blue-500 text-white px-2 py-1">Submit</button>
    </div>
  );
};

const QueryRegion = ({ onQuery }) => {
  const [x, setX] = useState('');
  const [y, setY] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');

  const handleQuery = async () => {
    const res = await axios.post('http://localhost:3000/query', {
      x: +x,
      y: +y,
      width: +width,
      height: +height
    });
    onQuery(res.data);
  };

  return (
    <div className="p-4 space-y-2">
      <h2 className="text-lg font-bold">Query Region</h2>
      <input placeholder="Center X" value={x} onChange={e => setX(e.target.value)} className="border p-1" />
      <input placeholder="Center Y" value={y} onChange={e => setY(e.target.value)} className="border p-1" />
      <input placeholder="Width" value={width} onChange={e => setWidth(e.target.value)} className="border p-1" />
      <input placeholder="Height" value={height} onChange={e => setHeight(e.target.value)} className="border p-1" />
      <button onClick={handleQuery} className="bg-green-500 text-white px-2 py-1">Query</button>
    </div>
  );
};

const MapSelector = ({ region }) => {
  const bounds = region
    ? [
        [region.y - region.height / 2, region.x - region.width / 2],
        [region.y + region.height / 2, region.x + region.width / 2]
      ]
    : null;

  return (
    <MapContainer center={[0, 0]} zoom={2} style={{ height: '500px' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {bounds && <Rectangle bounds={bounds} pathOptions={{ color: 'red' }} />}
    </MapContainer>
  );
};

export default function App() {
  const [region, setRegion] = useState(null);
  const [queryResult, setQueryResult] = useState(null);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
      <div>
        <IngestPoint onIngest={() => alert('Point inserted')} />
        <QueryRegion
          onQuery={data => {
            setQueryResult(data);
            setRegion({
              x: data.results[0]?.x || 0,
              y: data.results[0]?.y || 0,
              width: 100,
              height: 100
            });
          }}
        />
      </div>
      <div>
        <MapSelector region={region} />
        {queryResult && (
          <div className="mt-4">
            <h3 className="font-bold">Merkle Root:</h3>
            <p className="break-all text-xs bg-gray-100 p-2">{queryResult.merkleRoot}</p>
            <h4 className="font-bold mt-2">Results:</h4>
            <ul className="text-sm">
              {queryResult.results.map((r, i) => (
                <li key={i} className="border-b py-1">
                  ({r.x}, {r.y}) → {r.data}
                  <br />Proof: {queryResult.proofs[i].proof.join(', ')}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
