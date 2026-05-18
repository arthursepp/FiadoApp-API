// routes/usuariosRoutes.js
const express = require('express');
const router = express.Router();

const usuariosController = require('../controllers/usuariosController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// GET  /usuarios/me  → retorna perfil do usuário logado
router.get('/me', (req, res) =>
    usuariosController.perfil(req, res)
);

// PATCH /usuarios/me  → atualiza nome e/ou limite_credito_padrao
router.patch('/me', (req, res) =>
    usuariosController.atualizarPerfil(req, res)
);

module.exports = router;