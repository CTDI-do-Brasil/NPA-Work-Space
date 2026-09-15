const { db } = require('../db/database');
const { verifyPassword, generateAccessToken, generateRefreshToken } = require('../utils/security');
const { z } = require('zod');

const loginSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(6)
});

const login = async (req, res) => {
  try {
    const validatedData = loginSchema.parse(req.body);
    const { username, password } = validatedData;

    const userResult = await db.query(`SELECT * FROM users WHERE username = $1`, [username]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const validPassword = await verifyPassword(user.password, password);
    if (!validPassword) {
      // Audit log for failed attempt
      try {
        await db.query(
          `INSERT INTO audit_logs (user_id, action, ip_address, details) VALUES ($1, $2, $3, $4)`,
          [user.id, 'FAILED_LOGIN', req.ip, `Failed login attempt for user: ${username}`]
        );
      } catch (logErr) {
        console.error('[AUDIT_LOG_ERROR]', logErr.message);
      }
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Set Refresh Token in HttpOnly cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Audit log for successful login
    try {
      await db.query(
        `INSERT INTO audit_logs (user_id, action, ip_address, details) VALUES ($1, $2, $3, $4)`,
        [user.id, 'LOGIN', req.ip, 'User logged in successfully']
      );
    } catch (logErr) {
      console.error('[AUDIT_LOG_ERROR]', logErr.message);
    }

    return res.status(200).json({
      accessToken,
      user: { id: user.id, username: user.username, role: user.role }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('[AUTH_ERROR]', error);
    return res.status(500).json({ error: 'Server error' });
  }
};

const logout = (req, res) => {
  res.clearCookie('refreshToken');
  res.status(200).json({ message: 'Logged out successfully' });
};

const changePasswordSchema = z.object({
  currentPassword: z.string().optional().or(z.literal('')),
  newPassword: z.string().min(6, 'A nova senha deve ter pelo menos 6 caracteres')
});

const changePassword = async (req, res) => {
  try {
    const validatedData = changePasswordSchema.parse(req.body);
    const { currentPassword, newPassword } = validatedData;
    const userId = req.user?.id;
    const username = req.user?.username;

    let user = null;
    if (userId) {
      const userResult = await db.query(`SELECT * FROM users WHERE id = $1`, [userId]);
      user = userResult.rows[0];
    } else if (username) {
      const userResult = await db.query(`SELECT * FROM users WHERE username = $1`, [username]);
      user = userResult.rows[0];
    }

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // Se a senha atual foi informada, validar
    if (currentPassword && currentPassword.trim().length > 0) {
      const valid = await verifyPassword(user.password, currentPassword);
      if (!valid) {
        return res.status(400).json({ error: 'Senha atual incorreta.' });
      }
    }

    const { hashPassword } = require('../utils/security');
    const hashedPassword = await hashPassword(newPassword);

    await db.query(`UPDATE users SET password = $1 WHERE id = $2`, [hashedPassword, user.id]);

    // Registrar log de auditoria
    try {
      await db.query(
        `INSERT INTO audit_logs (user_id, action, ip_address, details) VALUES ($1, $2, $3, $4)`,
        [user.id, 'PASSWORD_CHANGED', req.ip, `Usuário ${user.username} alterou a própria senha`]
      );
    } catch (logErr) {
      console.error('[AUDIT_LOG_ERROR]', logErr.message);
    }

    return res.status(200).json({ message: 'Senha alterada com sucesso!' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => e.message).join(', ');
      return res.status(400).json({ error: messages });
    }
    console.error('[CHANGE_PASSWORD_ERROR]', error);
    return res.status(500).json({ error: 'Erro ao alterar senha.' });
  }
};

module.exports = { login, logout, changePassword };
