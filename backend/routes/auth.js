const express = require('express');
const { Op } = require('sequelize');
const { User } = require('../models');
const { generateToken, authenticateToken } = require('../middleware/auth');
const { sendError } = require('../services/sensorPayload');

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, username } = req.body;
    const finalUsername = username || (email ? email.split('@')[0] : null);

    if (!email || !password || !finalUsername) {
      return sendError(res, 400, 'Email, password, and username are required');
    }

    const existingUser = await User.findOne({
      where: { [Op.or]: [{ email }, { username: finalUsername }] },
    });
    if (existingUser) {
      return sendError(res, 400, 'User with this email or username already exists');
    }

    const user = await User.create({
      username: finalUsername, email, password, firstName, lastName,
    });

    res.status(201).json({
      message: 'User created successfully',
      user: user.toJSON(),
      token: generateToken(user.id),
    });
  } catch (error) {
    console.error('Registration error:', error);
    sendError(res, 500, 'Internal server error', error);
  }
});

router.post('/login', async (req, res) => {
  try {
    let user = await User.findOne({ where: { username: 'admin' } });
    if (!user) {
      user = await User.create({
        username: 'admin',
        email: 'admin@telescent.com',
        password: 'admin',
        firstName: 'Admin',
        lastName: 'User',
      });
    }
    res.json({
      message: 'Auto-login successful',
      user: user.toJSON(),
      token: generateToken(user.id),
    });
  } catch (error) {
    console.error('Login error:', error);
    sendError(res, 500, 'Internal server error', error);
  }
});

router.get('/profile', authenticateToken, async (req, res) => {
  try {
    res.json({
      message: 'Profile retrieved successfully',
      user: req.user.toJSON(),
    });
  } catch (error) {
    console.error('Profile error:', error);
    sendError(res, 500, 'Internal server error', error);
  }
});

router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName } = req.body;
    await req.user.update({ firstName, lastName });
    res.json({
      message: 'Profile updated successfully',
      user: req.user.toJSON(),
    });
  } catch (error) {
    console.error('Profile update error:', error);
    sendError(res, 500, 'Internal server error', error);
  }
});

router.post('/logout', authenticateToken, (req, res) => {
  res.json({ message: 'Logout successful' });
});

module.exports = router;
