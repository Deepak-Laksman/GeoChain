const express = require('express');
const crypto = require('crypto');
const app = express();
const cors = require('cors');

app.use(express.json());
app.use(cors());

// 1. Quad Tree Node
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

  query(range, found = []) {
    if (!this.intersects(this.boundary, range)) return found;

    for (const p of this.points) {
      if (this.contains(range, p)) found.push(p);
    }

    if (this.divided) {
      this.northwest.query(range, found);
      this.northeast.query(range, found);
      this.southwest.query(range, found);
      this.southeast.query(range, found);
    }

    return found;
  }

  intersects(boundary, range) {
    return !(
      range.x - range.width / 2 > boundary.x + boundary.width / 2 ||
      range.x + range.width / 2 < boundary.x - boundary.width / 2 ||
      range.y - range.height / 2 > boundary.y + boundary.height / 2 ||
      range.y + range.height / 2 < boundary.y - boundary.height / 2
    );
  }
}

// 2. Merkle Tree with Proofs
class MerkleTree {
  constructor(dataBlocks) {
    this.leaves = dataBlocks.map(d => MerkleTree.hash(JSON.stringify(d)));
    this.tree = this.buildTree(this.leaves);
  }

  static hash(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  buildTree(leaves) {
    let level = leaves;
    const tree = [leaves];

    while (level.length > 1) {
      const nextLevel = [];
      for (let i = 0; i < level.length; i += 2) {
        const left = level[i];
        const right = level[i + 1] || left;
        nextLevel.push(MerkleTree.hash(left + right));
      }
      level = nextLevel;
      tree.unshift(level);
    }

    return tree;
  }

  getRoot() {
    return this.tree[0][0];
  }

  getProof(index) {
    let proof = [];
    let levelIndex = this.tree.length - 1;
    let currentIndex = index;

    for (let i = this.tree.length - 1; i > 0; i--) {
      const level = this.tree[i];
      const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;
      const sibling = level[siblingIndex] || level[currentIndex];
      proof.push(sibling);
      currentIndex = Math.floor(currentIndex / 2);
    }

    return proof;
  }
}

// 3. Instantiate the Quad Tree
const rootBoundary = { x: 0, y: 0, width: 1000, height: 1000 };
const quadTree = new QuadTreeNode(rootBoundary, 4);

// 4. REST API
app.post('/ingest', (req, res) => {
  const { x, y, data } = req.body;
  const point = { x, y, data, timestamp: new Date().toISOString() };
  quadTree.insert(point);
  res.json({ status: 'Inserted', point });
});

app.post('/query', (req, res) => {
  const { x, y, width, height } = req.body;
  const results = quadTree.query({ x, y, width, height });
  const merkle = new MerkleTree(results);

  const proofs = results.map((item, i) => ({
    item,
    proof: merkle.getProof(i)
  }));

  res.json({ results, merkleRoot: merkle.getRoot(), proofs });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`GeoChain backend running on http://localhost:${PORT}`);
});
