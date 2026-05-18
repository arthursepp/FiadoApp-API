// routes/pdfRoutes.js
const express = require('express');
const router = express.Router();

const pdfController = require('../controllers/pdfController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// GET  /vendas/:id/pdf          → download do comprovante de pagamento
router.get('/vendas/:id/pdf', (req, res) =>
    pdfController.comprovantePagamento(req, res)
);

// POST /clientes/quitacao/pdf   → download do comprovante de quitação
// body: { "venda_ids": [1, 2, 3] }
router.post('/clientes/quitacao/pdf', (req, res) =>
    pdfController.comprovanteQuitacao(req, res)
);

// GET  /relatorio               → download do relatório com filtros opcionais
// query: ?status=ATIVA&data_inicio=2026-01-01&data_fim=2026-05-18
router.get('/relatorio', (req, res) =>
    pdfController.relatorio(req, res)
);

module.exports = router;