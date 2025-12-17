const request = require('supertest');
process.env.JWT_SECRET = 'test-secret';

const app = require('../server');
const { sequelize } = require('../models');

describe('Auth routes', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('register: creates user and returns token', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'userA', email: 'a@test.com', password: 'pass123', firstName: 'A', lastName: 'B' })
      .expect(201);

    expect(res.body.user.email).toBe('a@test.com');
    expect(res.body.token).toBeTruthy();
  });

  test('register: duplicate email returns 400', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'dup1', email: 'dup@test.com', password: 'pass123' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'dup2', email: 'dup@test.com', password: 'pass123' })
      .expect(400);

    expect(res.body.message.toLowerCase()).toContain('already exists');
  });

  test('login: with email returns token', async () => {
    // ensure user exists
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'login1', email: 'login@test.com', password: 'pass123' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'login@test.com', password: 'pass123' })
      .expect(200);

    expect(res.body.user.email).toBe('login@test.com');
    expect(res.body.token).toBeTruthy();
  });

  test('login: wrong password returns 401', async () => {
    // ensure user exists
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'wrong1', email: 'wrong@test.com', password: 'pass123' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'wrong@test.com', password: 'badpass' })
      .expect(401);

    expect(res.body.message.toLowerCase()).toContain('invalid');
  });
});
