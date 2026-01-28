const express = require('express');
const { authRequired } = require('../middleware/auth');

const { listUsers } = require('../controllers/user.controller');

const router = express.Router();

router.get('/', authRequired, listUsers);

module.exports = router;
