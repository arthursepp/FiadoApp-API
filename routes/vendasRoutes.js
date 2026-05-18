// routes/vendasRoutes.js
const express = require('express');
const router = express.Router();

const vendasController = require('../controllers/vendasController');
const pdfController = require('../controllers/pdfController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// POST /vendas                             → salvar nova venda
router.post('/', (req, res) =>
    vendasController.salvar(req, res)
);

// GET  /vendas                             → listar vendas (filtros via query string)
router.get('/', (req, res) =>
    vendasController.listar(req, res)
);

// POST /vendas/clientes/:clienteId/quitar  → quitar vendas selecionadas de um cliente
// ⚠️ deve vir ANTES de /:id para não ser capturada como parâmetro dinâmico
router.post('/clientes/:clienteId/quitar', (req, res) =>
    vendasController.quitar(req, res)
);

// GET  /vendas/:id/pdf                     → comprovante de pagamento em PDF
// ⚠️ deve vir ANTES de /:id
router.get('/:id/pdf', (req, res) =>
    pdfController.comprovantePagamento(req, res)
);

// GET  /vendas/:id                         → detalhar uma venda específica
router.get('/:id', (req, res) =>
    vendasController.detalhar(req, res)
);

// POST /vendas/:id/pagar                   → pagar uma venda individual
router.post('/:id/pagar', (req, res) =>
    vendasController.pagar(req, res)
);

module.exports = router;