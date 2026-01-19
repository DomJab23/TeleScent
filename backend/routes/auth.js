const express = require('express');
const { User } = require('../models');
const { generateToken, authenticateToken } = require('../middleware/auth');
const { Op } = require('sequelize');
const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, username } = req.body;
    const finalUsername = username || (email ? email.split('@')[0] : null);

    // Validate required fields
    if (!email || !password || !finalUsername) {
      return res.status(400).json({ 
        message: 'Email, password, and username are required' 
      });
    }

    // Check if user already exists by email or username
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { email },
          { username: finalUsername }
        ]
      }
    });
    if (existingUser) {
      return res.status(400).json({ 
        message: 'User with this email or username already exists' 
      });
    }

    // Create new user
    const user = await User.create({
      username: finalUsername,
      email,
      password,
      firstName,
      lastName,
    });

    // Generate token
    const token = generateToken(user.id);

    res.status(201).json({
      message: 'User created successfully',
      user: user.toJSON(),
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// Login user (accepts username or email) - BYPASS MODE FOR TESTING
router.post('/login', async (req, res) => {
  try {
    // AUTO-LOGIN: Just find or create admin user and log them in
    let user = await User.findOne({ where: { username: 'admin' } });
    
    if (!user) {
      // Create admin user if doesn't exist
      user = await User.create({
        username: 'admin',
        email: 'admin@telescent.com',
        password: 'admin',
        firstName: 'Admin',
        lastName: 'User',
      });
    }

    // Generate token
    const token = generateToken(user.id);

    res.json({
      message: 'Auto-login successful',
      user: user.toJSON(),
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    res.json({
      message: 'Profile retrieved successfully',
      user: req.user.toJSON(),
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { firstName, lastName } = req.body;
    
    await req.user.update({
      firstName,
      lastName,
    });

    res.json({
      message: 'Profile updated successfully',
      user: req.user.toJSON(),
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
});

// Logout (client-side handles token removal)
router.post('/logout', authenticateToken, (req, res) => {
  res.json({ message: 'Logout successful' });
});

module.exports = router;
