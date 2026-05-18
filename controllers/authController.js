const authService = require('../services/authService');

class AuthController {

    async register(req, res) {
        try {

            const usuario = await authService.register(req.body);

            return res.status(201).json(usuario);

        } catch (error) {

            return res.status(400).json({
                erro: error.message
            });
        }
    }

    async login(req, res) {
        try {

            const { email, senha } = req.body;

            const data = await authService.login(email, senha);

            return res.json(data);

        } catch (error) {

            return res.status(401).json({
                erro: error.message
            });
        }
    }
}

module.exports = new AuthController();