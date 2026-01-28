const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await User.findOne({ username });
    if (!user || user.isDel) return res.status(401).json({ error: 'Invalid username or password' });
    if (!user.isActive) return res.status(403).json({ error: 'Account disabled' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid username or password' });

    const token = jwt.sign(
      { userId: user._id.toString(), level: user.level, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    return res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        level: user.level,
        prefix: user.prefix,
        firstname: user.firstname,
        lastname: user.lastname
      }
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = { login };
