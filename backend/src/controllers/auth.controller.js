import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Op, fn, col, where } from 'sequelize';
import { User } from '../models/index.js';
import { config } from '../config/env.js';

const buildUserResponse = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  chips: user.chips,
  level: user.level,
  experience: user.experience,
  avatar: user.avatar,
  gamesPlayed: user.gamesPlayed,
  gamesWon: user.gamesWon,
  totalWinnings: user.totalWinnings,
  highestWinning: user.highestWinning
});

export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const normalizedUsername = typeof username === 'string' ? username.trim() : '';
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!normalizedUsername || !normalizedEmail || !password) {
      return res.status(400).json({ message: 'Username, email and password are required' });
    }

    const [existingUser, existingEmail] = await Promise.all([
      User.findOne({
        where: where(fn('lower', col('username')), normalizedUsername.toLowerCase())
      }),
      User.findOne({
        where: where(fn('lower', col('email')), normalizedEmail)
      })
    ]);

    if (existingUser || existingEmail) {
      const errors = {};
      if (existingUser) errors.username = 'Username already exists';
      if (existingEmail) errors.email = 'Email already exists';

      let message = 'Registration failed';
      if (existingUser && existingEmail) {
        message = 'Username and email already exist';
      } else if (existingUser) {
        message = 'Username already exists';
      } else if (existingEmail) {
        message = 'Email already exists';
      }

      return res.status(400).json({ message, errors });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username: normalizedUsername,
      email: normalizedEmail,
      password: hashedPassword
    });

    const token = jwt.sign({ id: user.id }, config.jwtSecret, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: buildUserResponse(user)
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      const fieldSet = new Set((error.errors || []).map(e => e.path));
      const errors = {};
      if (fieldSet.has('username')) errors.username = 'Username already exists';
      if (fieldSet.has('email')) errors.email = 'Email already exists';

      let message = 'Username or email already exists';
      if (errors.username && errors.email) message = 'Username and email already exist';
      else if (errors.username) message = 'Username already exists';
      else if (errors.email) message = 'Email already exists';

      return res.status(400).json({ message, errors });
    }
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { identifier, email, password } = req.body;

    const loginIdentifier = typeof (identifier ?? email) === 'string'
      ? (identifier ?? email).trim()
      : '';

    if (!loginIdentifier || !password) {
      return res.status(400).json({ message: 'Identifier and password are required' });
    }

    const normalizedIdentifier = loginIdentifier.toLowerCase();
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: normalizedIdentifier },
          where(fn('lower', col('username')), normalizedIdentifier)
        ]
      }
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id }, config.jwtSecret, { expiresIn: '7d' });

    res.json({
      token,
      user: buildUserResponse(user)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: { exclude: ['password'] }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
