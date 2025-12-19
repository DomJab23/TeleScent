const { authenticateToken } = require('./middleware/auth');
const jwt = require('jsonwebtoken');
const { User } = require('./models');

jest.mock('jsonwebtoken');
jest.mock('./models', () => {
  const actual = jest.requireActual('./models');
  return {
    ...actual,
    User: {
      findByPk: jest.fn()
    }
  };
});

const fakeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('authenticateToken middleware', () => {
  const next = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 401 when no token provided', async () => {
    const req = { headers: {} };
    const res = fakeRes();

    await authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Access token required' });
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 403 when token verification fails', async () => {
    const req = { headers: { authorization: 'Bearer badtoken' } };
    const res = fakeRes();

    jwt.verify.mockImplementation(() => {
      throw new Error('invalid');
    });

    await authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when user not found', async () => {
    const req = { headers: { authorization: 'Bearer good' } };
    const res = fakeRes();

    jwt.verify.mockReturnValue({ userId: 123 });
    User.findByPk.mockResolvedValue(null);

    await authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });

  test('attaches user and calls next on success', async () => {
    const req = { headers: { authorization: 'Bearer good' } };
    const res = fakeRes();

    const userMock = { id: 1 };
    jwt.verify.mockReturnValue({ userId: 1 });
    User.findByPk.mockResolvedValue(userMock);

    await authenticateToken(req, res, next);

    expect(req.user).toBe(userMock);
    expect(next).toHaveBeenCalled();
  });
});
