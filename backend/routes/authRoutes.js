const express = require('express');
const { login, logout, refreshToken, changePassword } = require('../controllers/authController');
const { authenticateToken } = require('../middlewares/auth');

const router = express.Router();

router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh', refreshToken);
router.post('/change-password', authenticateToken, changePassword);

module.exports = router;
