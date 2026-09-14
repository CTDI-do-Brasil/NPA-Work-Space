const { db } = require('../db/database');
const { hashPassword } = require('../utils/security');
const { z } = require('zod');

const createUserSchema = z.object({
  username: z.string().trim().min(3, 'O nome de usuário deve ter pelo menos 3 caracteres').max(50, 'Máximo 50 caracteres'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  role: z.enum(['Admin', 'Operador', 'Visualizador']).default('Operador')
});

const updateUserSchema = z.object({
  username: z.string().trim().min(3, 'O nome de usuário deve ter pelo menos 3 caracteres').max(50, 'Máximo 50 caracteres'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres').optional().or(z.literal('')),
  role: z.enum(['Admin', 'Operador', 'Visualizador']).default('Operador')
});

// Listar todos os usuários
const listUsers = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, username, role, created_at FROM users ORDER BY id ASC`
    );
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error('[USER_LIST_ERROR]', error);
    return res.status(500).json({ error: 'Erro ao listar usuários.' });
  }
};

// Obter detalhes de um usuário específico
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT id, username, role, created_at FROM users WHERE id = $1`,
      [id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('[USER_GET_ERROR]', error);
    return res.status(500).json({ error: 'Erro ao obter dados do usuário.' });
  }
};

// Criar novo usuário/login
const createUser = async (req, res) => {
  try {
    const validatedData = createUserSchema.parse(req.body);
    const { username, password, role } = validatedData;

    // Verificar se usuário já existe
    const existing = await db.query(`SELECT id FROM users WHERE LOWER(username) = LOWER($1)`, [username]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: `O nome de usuário "${username}" já está em uso.` });
    }

    const hashedPassword = await hashPassword(password);

    await db.query(
      `INSERT INTO users (username, password, role, created_at) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
      [username, hashedPassword, role]
    );

    const createdResult = await db.query(
      `SELECT id, username, role, created_at FROM users WHERE username = $1`,
      [username]
    );
    const newUser = createdResult.rows[0];

    // Registrar log de auditoria
    try {
      await db.query(
        `INSERT INTO audit_logs (user_id, action, ip_address, details) VALUES ($1, $2, $3, $4)`,
        [req.user?.id || null, 'USER_CREATED', req.ip, `Usuário criado: ${username} com perfil ${role}`]
      );
    } catch (logErr) {
      console.error('[AUDIT_LOG_ERROR]', logErr.message);
    }

    return res.status(201).json({
      message: 'Login criado com sucesso!',
      user: newUser
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => e.message).join(', ');
      return res.status(400).json({ error: messages });
    }
    console.error('[USER_CREATE_ERROR]', error);
    return res.status(500).json({ error: 'Erro ao cadastrar novo login.' });
  }
};

// Atualizar usuário/login existente
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateUserSchema.parse(req.body);
    const { username, password, role } = validatedData;

    // Verificar se usuário existe
    const userResult = await db.query(`SELECT * FROM users WHERE id = $1`, [id]);
    const user = userResult.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // Verificar se novo username colide com outro usuário
    const conflictResult = await db.query(
      `SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id != $2`,
      [username, id]
    );
    if (conflictResult.rows.length > 0) {
      return res.status(400).json({ error: `O nome de usuário "${username}" já está sendo usado por outro login.` });
    }

    // Se o usuário está rebaixando ou mudando de perfil e ele era o único Admin
    if (user.role === 'Admin' && role !== 'Admin') {
      const adminCount = await db.query(`SELECT COUNT(*) as count FROM users WHERE role = 'Admin'`);
      const totalAdmins = parseInt(adminCount.rows[0]?.count || 0, 10);
      if (totalAdmins <= 1) {
        return res.status(400).json({
          error: 'Não é possível remover o perfil de Administrador do único administrador existente no sistema.'
        });
      }
    }

    // Atualizar dados com ou sem nova senha
    if (password && password.trim().length > 0) {
      const hashedPassword = await hashPassword(password);
      await db.query(
        `UPDATE users SET username = $1, password = $2, role = $3 WHERE id = $4`,
        [username, hashedPassword, role, id]
      );
    } else {
      await db.query(
        `UPDATE users SET username = $1, role = $2 WHERE id = $3`,
        [username, role, id]
      );
    }

    const updatedResult = await db.query(
      `SELECT id, username, role, created_at FROM users WHERE id = $1`,
      [id]
    );
    const updatedUser = updatedResult.rows[0];

    // Registrar auditoria
    try {
      await db.query(
        `INSERT INTO audit_logs (user_id, action, ip_address, details) VALUES ($1, $2, $3, $4)`,
        [req.user?.id || null, 'USER_UPDATED', req.ip, `Usuário atualizado: ${username} (ID: ${id}, Perfil: ${role}, Senha alterada: ${Boolean(password)})`]
      );
    } catch (logErr) {
      console.error('[AUDIT_LOG_ERROR]', logErr.message);
    }

    return res.status(200).json({
      message: 'Login atualizado com sucesso!',
      user: updatedUser
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => e.message).join(', ');
      return res.status(400).json({ error: messages });
    }
    console.error('[USER_UPDATE_ERROR]', error);
    return res.status(500).json({ error: 'Erro ao atualizar login.' });
  }
};

// Excluir usuário/login
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Não permitir auto-exclusão
    if (req.user && parseInt(req.user.id, 10) === parseInt(id, 10)) {
      return res.status(400).json({ error: 'Você não pode excluir o usuário com o qual está autenticado atualmente.' });
    }

    const userResult = await db.query(`SELECT * FROM users WHERE id = $1`, [id]);
    const user = userResult.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // Não permitir exclusão do único Admin
    if (user.role === 'Admin') {
      const adminCount = await db.query(`SELECT COUNT(*) as count FROM users WHERE role = 'Admin'`);
      const totalAdmins = parseInt(adminCount.rows[0]?.count || 0, 10);
      if (totalAdmins <= 1) {
        return res.status(400).json({ error: 'Não é possível excluir o único Administrador do sistema.' });
      }
    }

    await db.query(`DELETE FROM users WHERE id = $1`, [id]);

    // Registrar auditoria
    try {
      await db.query(
        `INSERT INTO audit_logs (user_id, action, ip_address, details) VALUES ($1, $2, $3, $4)`,
        [req.user?.id || null, 'USER_DELETED', req.ip, `Usuário excluído: ${user.username} (ID: ${id})`]
      );
    } catch (logErr) {
      console.error('[AUDIT_LOG_ERROR]', logErr.message);
    }

    return res.status(200).json({ message: `Login "${user.username}" excluído com sucesso!` });
  } catch (error) {
    console.error('[USER_DELETE_ERROR]', error);
    return res.status(500).json({ error: 'Erro ao excluir usuário.' });
  }
};

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};
