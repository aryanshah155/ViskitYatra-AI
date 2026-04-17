const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'viksityatra_super_secret_dev_key';

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if user already exists
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const result = await db.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, password_hash]
    );

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, role: 'user' }, JWT_SECRET, { expiresIn: '1d' });

    res.json({ token, user: { ...user, role: 'user' } });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to register', details: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Assign a mock role for now: email ending in @admin.com gets admin
    const role = user.email.endsWith('@admin.com') ? 'admin' : 'user';
    const token = jwt.sign({ id: user.id, email: user.email, role }, JWT_SECRET, { expiresIn: '1d' });

    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Failed to login', details: err.message });
  }
});

module.exports = router;
