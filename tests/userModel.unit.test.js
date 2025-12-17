const { sequelize, User } = require('../models');

describe('User model', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('hashes password on create and comparePassword works', async () => {
    const user = await User.create({
      username: 'hashuser',
      email: 'hash@test.com',
      password: 'plainpass'
    });

    expect(user.password).not.toBe('plainpass');

    const isMatch = await user.comparePassword('plainpass');
    expect(isMatch).toBe(true);

    const isWrong = await user.comparePassword('wrong');
    expect(isWrong).toBe(false);
  });

  test('hashes password on update when changed', async () => {
    const user = await User.create({
      username: 'updateuser',
      email: 'update@test.com',
      password: 'initial'
    });
    const oldHash = user.password;

    user.password = 'newpass';
    await user.save();

    expect(user.password).not.toBe(oldHash);
    const isMatch = await user.comparePassword('newpass');
    expect(isMatch).toBe(true);
  });

  test('toJSON removes password field', async () => {
    const user = await User.create({
      username: 'jsonuser',
      email: 'json@test.com',
      password: 'secret'
    });

    const json = user.toJSON();
    expect(json.password).toBeUndefined();
    expect(json.email).toBe('json@test.com');
  });
});
