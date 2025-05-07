// Backend for QuadTree Proximity Search with Natural Language & Lat/Lon Support

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

class QuadTreeNode {
  constructor(boundary, capacity) {
    this.boundary = boundary;
    this.capacity = capacity;
    this.points = [];
    this.divided = false;
  }

  insert(point) {
    if (!this.contains(this.boundary, point)) return false;
    if (this.points.length < this.capacity) {
      this.points.push(point);
      return true;
    } else {
      if (!this.divided) this.subdivide();
      return (
        this.northeast.insert(point) ||
        this.northwest.insert(point) ||
        this.southeast.insert(point) ||
        this.southwest.insert(point)
      );
    }
  }

  contains(boundary, point) {
    return (
      point.x >= boundary.x - boundary.width / 2 &&
      point.x <= boundary.x + boundary.width / 2 &&
      point.y >= boundary.y - boundary.height / 2 &&
      point.y <= boundary.y + boundary.height / 2
    );
  }

  subdivide() {
    const { x, y, width, height } = this.boundary;
    const w = width / 2;
    const h = height / 2;

    this.northeast = new QuadTreeNode({ x: x + w / 2, y: y - h / 2, width: w, height: h }, this.capacity);
    this.northwest = new QuadTreeNode({ x: x - w / 2, y: y - h / 2, width: w, height: h }, this.capacity);
    this.southeast = new QuadTreeNode({ x: x + w / 2, y: y + h / 2, width: w, height: h }, this.capacity);
    this.southwest = new QuadTreeNode({ x: x - w / 2, y: y + h / 2, width: w, height: h }, this.capacity);

    this.divided = true;
  }

  queryCircle(center, radius, found = []) {
    if (!this.intersectsCircle(this.boundary, center, radius)) return found;

    for (const p of this.points) {
      const d = Math.sqrt((p.x - center.x) ** 2 + (p.y - center.y) ** 2);
      if (d <= radius / 111320) found.push(p);
    }

    if (this.divided) {
      this.northwest.queryCircle(center, radius, found);
      this.northeast.queryCircle(center, radius, found);
      this.southwest.queryCircle(center, radius, found);
      this.southeast.queryCircle(center, radius, found);
    }

    return found;
  }

  intersectsCircle(boundary, center, radius) {
    const dx = Math.max(Math.abs(center.x - boundary.x) - boundary.width / 2, 0);
    const dy = Math.max(Math.abs(center.y - boundary.y) - boundary.height / 2, 0);
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= radius / 111320;
  }
}

const quadTree = new QuadTreeNode({ x: 0, y: 0, width: 360, height: 180 }, 4);

// Insert using either coordinates or location
app.post('/insert', async (req, res) => {
  const { name, useNaturalLanguage, location, x, y } = req.body;

  let coords = { x, y };

  if (useNaturalLanguage && location) {
    try {
      const geo = await axios.get(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`, {
        headers: { 'User-Agent': 'QuadTreeApp/1.0' }
      });
      if (!geo.data[0]) return res.status(404).json({ error: 'location not found' });
      coords = {
        x: parseFloat(geo.data[0].lon),
        y: parseFloat(geo.data[0].lat)
      };
    } catch (err) {
      return res.status(500).json({ error: 'geocoding failed', details: err.message });
    }
  }

  const point = { x: coords.x, y: coords.y, name, timestamp: new Date().toISOString() };
  quadTree.insert(point);
  res.json({ status: 'inserted', point });
});

// Query using either coordinates or location
app.post('/geosearch', async (req, res) => {
  const { query, radius, useNaturalLanguage } = req.body;
  let center;

  if (useNaturalLanguage) {
    try {
      const geo = await axios.get(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`, {
        headers: { 'User-Agent': 'QuadTreeApp/1.0' }
      });
      if (!geo.data[0]) return res.status(404).json({ error: 'location not found' });
      center = {
        x: parseFloat(geo.data[0].lon),
        y: parseFloat(geo.data[0].lat)
      };
    } catch (err) {
      return res.status(500).json({ error: 'geocoding failed', details: err.message });
    }
  } else {
    const [lat, lon] = query.split(',').map(Number);
    if (isNaN(lat) || isNaN(lon)) return res.status(400).json({ error: 'Invalid coordinates' });
    center = { x: lon, y: lat };
  }

  const results = quadTree.queryCircle(center, radius).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json({ center, radius, results });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));