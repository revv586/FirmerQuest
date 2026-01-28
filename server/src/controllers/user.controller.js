const User = require('../models/User');

const listUsers = async (req, res, next) => {
  try {
    if (req.user.level === 'user') {
      const user = await User.findOne({ _id: req.user.userId, isDel: false })
        .select('prefix firstname lastname username level isActive isDel');
      return res.json(user ? [user] : []);
    }

    const includeDeleted = req.query.includeDeleted === 'true';
    const filter = includeDeleted ? {} : { isDel: false };

    const users = await User.find(filter)
      .select('prefix firstname lastname username level isActive isDel');

    return res.json(users);
  } catch (err) {
    return next(err);
  }
};

module.exports = { listUsers };
