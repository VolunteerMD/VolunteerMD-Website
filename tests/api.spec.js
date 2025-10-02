import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/server.js';
import db from '../src/lib/db.js';
import { clearCache } from '../src/lib/opportunityService.js';

function resetDatabase() {
  db.exec('DELETE FROM favorites; DELETE FROM users; DELETE FROM contact_messages;');
  clearCache();
}

beforeEach(resetDatabase);
afterEach(resetDatabase);

describe('Authentication routes', () => {
  it('registers a new user and sets auth cookie', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'Password123' })
      .expect(201);

    expect(response.body.user).toBeDefined();
    expect(response.body.user.email).toBe('test@example.com');
    const cookies = response.headers['set-cookie'];
    expect(Array.isArray(cookies)).toBe(true);
    expect(cookies.length).toBeGreaterThan(0);
  });

  it('rejects duplicate registrations', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'Password123' })
      .expect(201);

    const dup = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'Password123' })
      .expect(409);

    expect(dup.body.error).toMatch(/already exists/i);
  });

  it('rejects invalid login attempts', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'Password123' })
      .expect(201);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'WrongPass123' })
      .expect(401);

    expect(response.body.error).toMatch(/invalid/i);
  });
});

describe('End-to-end volunteer flow', () => {
  it('allows signup, login, saving an opportunity, and logout', async () => {
    const agent = request.agent(app);

    await agent
      .post('/api/auth/register')
      .send({ email: 'flow@example.com', password: 'Password123' })
      .expect(201);

    const opportunitiesResponse = await agent
      .get('/api/opportunities')
      .expect(200);

    const opportunities = opportunitiesResponse.body.data;
    expect(Array.isArray(opportunities)).toBe(true);
    expect(opportunities.length).toBeGreaterThan(0);

    const firstOpportunity = opportunities[0];
    expect(firstOpportunity.id).toBeDefined();

    await agent
      .post(`/api/favorites/${firstOpportunity.id}`)
      .send({})
      .expect(201);

    const favoritesResponse = await agent
      .get('/api/favorites')
      .expect(200);

    expect(favoritesResponse.body.ids).toContain(firstOpportunity.id);

    await agent
      .post('/api/auth/logout')
      .send({})
      .expect(200);

    await agent
      .get('/api/favorites')
      .expect(401);
  });
});

describe('Public config endpoint', () => {
  it('returns analytics metadata without secrets', async () => {
    const response = await request(app)
      .get('/api/config')
      .expect(200);

    expect(response.body).toHaveProperty('analytics');
    expect(response.body.analytics).toBeNull();
  });
});
