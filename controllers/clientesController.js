// clientesController.js
const clientesService = require('../services/clientesService');

class ClientesController {

    async listarMeus(req, res) {

        try {
            const clientes = await clientesService.listarMeus(
                req.usuario.id
            );

            return res.json(clientes);

        } catch (error) {

            return res.status(500).json({
                erro: error.message
            });
        }
    }

    async listar(req, res) {

        try {
            const clientes = await clientesService.listar(
                req.usuario.id,
                req.query.nome || null
            );

            return res.json(clientes);

        } catch (error) {

            return res.status(500).json({
                erro: error.message
            });
        }
    }

    async buscar(req, res) {

        try {

            const cliente = await clientesService.buscar(
                req.params.id,
                req.usuario.id
            );

            return res.json(cliente);

        } catch (error) {

            return res.status(404).json({
                erro: error.message
            });
        }
    }

    async criar(req, res) {

        try {

            const cliente = await clientesService.criar(
                req.body,
                req.usuario.id
            );

            return res.status(201).json(cliente);

        } catch (error) {

            return res.status(400).json({
                erro: error.message
            });
        }
    }

    async atualizar(req, res) {

        try {

            const cliente = await clientesService.atualizar(
                req.params.id,
                req.usuario.id,
                req.body
            );

            return res.json(cliente);

        } catch (error) {

            return res.status(400).json({
                erro: error.message
            });
        }
    }

    async historico(req, res) {

        try {

            const historico = await clientesService.historico(
                req.params.id,
                req.usuario.id
            );

            return res.json(historico);

        } catch (error) {

            const status = error.message.includes('não encontrado') ? 404 : 400;
            return res.status(status).json({ erro: error.message });
        }
    }

    async deletar(req, res) {

        try {

            const cliente = await clientesService.deletar(
                req.params.id,
                req.usuario.id
            );

            return res.json({
                mensagem: 'Cliente deletado com sucesso',
                cliente
            });

        } catch (error) {

            return res.status(400).json({
                erro: error.message
            });
        }
    }
}

module.exports = new ClientesController();