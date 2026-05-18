// controllers/statsController.js
const statsService = require('../services/statsService');

class StatsController {

    async dashboard(req, res) {

        try {

            const stats = await statsService.dashboard(req.usuario.id);

            return res.json(stats);

        } catch (error) {

            return res.status(500).json({ erro: error.message });
        }
    }

    async analytics(req, res) {

        try {

            const resultado = await statsService.analytics(
                req.usuario.id,
                req.query
            );

            return res.json(resultado);

        } catch (error) {

            const status = error.message.includes('posterior') ? 400 : 500;
            return res.status(status).json({ erro: error.message });
        }
    }
}

module.exports = new StatsController();