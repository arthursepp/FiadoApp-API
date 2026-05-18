// clientesRoutes.js
const express = require('express');
const router = express.Router();

const clientesController = require('../controllers/clientesController.js');
const pdfController = require('../controllers/pdfController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/', (req, res) =>
    clientesController.listar(req, res)
);

// GET /clientes/:id/pdf?venda_ids=1,2,3&saldo_restante=0 → comprovante de quitação
// ⚠️ deve vir ANTES de /:id
router.get('/:id/pdf', (req, res) =>
    pdfController.comprovanteQuitacao(req, res)
);

router.get('/:id/historico', (req, res) =>
    clientesController.historico(req, res)
);

router.get('/:id', (req, res) =>
    clientesController.buscar(req, res)
);

router.post('/', (req, res) =>
    clientesController.criar(req, res)
);

router.put('/:id', (req, res) =>
    clientesController.atualizar(req, res)
);

router.delete('/:id', (req, res) =>
    clientesController.deletar(req, res)
);

module.exports = router;