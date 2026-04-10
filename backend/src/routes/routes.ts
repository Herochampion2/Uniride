import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { MatchingService } from '../MatchingService.js';
import db from '../db.js';
import { Route } from '../models/Route.js';

const router = Router();

// GET all routes for a specific user
router.get('/:userId', async (req, res) => {
  await db.read();
  const userRoutes = db.data.routes.filter(
    (r) => r.user && r.user.id === req.params.userId
  );
  res.json(userRoutes);
});

// GET all routes
router.get('/', async (req, res) => {
  await db.read();
  res.json(db.data.routes);
});

// POST create a new route
router.post('/', async (req, res) => {
  await db.read();
  const newRoute: Route = {
    ...req.body,
    id: uuidv4(),
  };
  // const matches = MatchingService.findMatches(db.data.routes, newRoute); // TODO: Fix type mismatch
  db.data.routes.push(newRoute);
  await db.write();
  res.status(201).json({ newRoute, matches: [] }); // TODO: Fix matches
});

// DELETE a route
router.delete('/:id', async (req, res) => {
  await db.read();
  const idx = db.data.routes.findIndex(r => r.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Route not found' });
  }
  db.data.routes.splice(idx, 1);
  await db.write();
  res.json({ message: 'Route deleted' });
});

export default router;