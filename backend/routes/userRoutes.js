const express = require('express');
const { listUsers, getUserById, createUser, updateUser, deleteUser } = require('../controllers/userController');
const { authenticateToken, authorizeRoles } = require('../middlewares/auth');

const router = express.Router();

// Desabilitar cache para garantir que listagens reflitam o estado atual do banco
router.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Apenas Administradores podem listar e criar novos usuários
router.get('/', authenticateToken, authorizeRoles('Admin'), listUsers);
router.post('/', authenticateToken, authorizeRoles('Admin'), createUser);

// Usuários podem ver seu próprio perfil ou Admin pode ver qualquer um
router.get('/:id', authenticateToken, (req, res, next) => {
  if (req.user.role === 'Admin' || parseInt(req.user.id, 10) === parseInt(req.params.id, 10)) {
    return next();
  }
  return res.status(403).json({ error: 'Permissão negada.' });
}, getUserById);

// Usuários podem atualizar seus próprios dados (exceto cargo) ou Admin pode atualizar qualquer um
router.put('/:id', authenticateToken, (req, res, next) => {
  if (req.user.role === 'Admin' || parseInt(req.user.id, 10) === parseInt(req.params.id, 10)) {
    // Se não for Admin, garantir que não possa alterar o próprio papel (privilege escalation prevention)
    if (req.user.role !== 'Admin') {
      req.body.role = req.user.role;
    }
    return next();
  }
  return res.status(403).json({ error: 'Permissão negada.' });
}, updateUser);

// Apenas Administradores podem excluir contas de login
router.delete('/:id', authenticateToken, authorizeRoles('Admin'), deleteUser);

module.exports = router;
