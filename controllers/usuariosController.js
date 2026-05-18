// controllers/usuariosController.js
const usuariosService = require('../services/usuariosService');

class UsuariosController {

    async perfil(req, res) {

        try {

            const usuario = await usuariosService.perfil(req.usuario.id);

            return res.json(usuario);

        } catch (error) {

            return res.status(404).json({ erro: error.message });
        }
    }

    async atualizarPerfil(req, res) {

        try {

            const atualizado = await usuariosService.atualizarPerfil(
                req.usuario.id,
                req.body
            );

            return res.json({
                mensagem: 'Perfil atualizado com sucesso!',
                usuario: atualizado
            });

        } catch (error) {

            return res.status(400).json({ erro: error.message });
        }
    }
}

module.exports = new UsuariosController();