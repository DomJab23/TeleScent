const request = require('supertest');
process.env.JWT_SECRET = 'test-secret';

const app = require('./server');
const { sequelize } = require('./models');

describe('Auth profile routes', () => {
  let token;

  beforeAll(async () => {
    await sequelize.sync({ force: true });

    // register user
    await request(app)
      .post('/api/auth/register')
      .send({ username: 'profileUser', email: 'profile@test.com', password: 'pass123', firstName: 'Old', lastName: 'Name' })
      .expect(201);

    // login to get token
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'profile@test.com', password: 'pass123' })
      .expect(200);

    token = res.body.token;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('profile GET requires token', async () => {
    await request(app)
      .get('/api/auth/profile')
      .expect(401);
  });

  test('profile GET returns current user with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.user.email).toBe('profile@test.com');
    expect(res.body.user.username).toBe('profileUser');
    expect(res.body.user.password).toBeUndefined();
  });

  test('profile PUT updates user names with valid token', async () => {
    const res = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ firstName: 'New', lastName: 'Name' })
      .expect(200);

    expect(res.body.user.firstName).toBe('New');
    expect(res.body.user.lastName).toBe('Name');
  });

  test('profile PUT requires token', async () => {
    await request(app)
      .put('/api/auth/profile')
      .send({ firstName: 'X' })
      .expect(401);
  });
});
