// routes/statsRoutes.js
const express = require('express');
const router = express.Router();

const statsController = require('../controllers/statsController');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

// GET /dashboard  → totais gerais do usuário
router.get('/dashboard', (req, res) =>
    statsController.dashboard(req, res)
);

// GET /analytics?de=YYYY-MM-DD&ate=YYYY-MM-DD  → dados agregados do período
router.get('/analytics', (req, res) =>
    statsController.analytics(req, res)
);

module.exports = router;