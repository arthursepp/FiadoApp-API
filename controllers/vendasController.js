// controllers/vendasController.js
const vendasService = require('../services/vendasService');

class VendasController {

    async salvar(req, res) {

        try {

            const venda = await vendasService.salvar(
                req.body,
                req.usuario.id
            );

            return res.status(201).json({
                mensagem: 'Venda cadastrada com sucesso!',
                venda
            });

        } catch (error) {

            return res.status(400).json({
                erro: error.message
            });
        }
    }

    async listar(req, res) {

        try {

            const { status, data_inicio, data_fim, cliente_id } = req.query;

            const vendas = await vendasService.listar(
                req.usuario.id,
                { status, data_inicio, data_fim, cliente_id }
            );

            return res.json(vendas);

        } catch (error) {

            const statusCode = error.message.includes('inválido') ||
                error.message.includes('formato') ||
                error.message.includes('posterior') ? 400 : 500;

            return res.status(statusCode).json({
                erro: error.message
            });
        }
    }

    async detalhar(req, res) {

        try {

            const venda = await vendasService.detalhar(
                req.params.id,
                req.usuario.id
            );

            return res.json(venda);

        } catch (error) {

            return res.status(404).json({
                erro: error.message
            });
        }
    }

    async pagar(req, res) {

        try {

            const resultado = await vendasService.pagar(
                req.params.id,
                req.usuario.id
            );

            return res.json(resultado);

        } catch (error) {

            const status = error.message.includes('não encontrada') ? 404 : 400;
            return res.status(status).json({ erro: error.message });
        }
    }

    async quitar(req, res) {

        try {

            console.log('PARAMS:', req.params)
            console.log('BODY:', req.body)

            const { venda_ids } = req.body;

            const resultado = await vendasService.quitar(
                req.params.clienteId,
                venda_ids,
                req.usuario.id
            );

            return res.json(resultado);

        } catch (error) {

            const status = error.message.includes('não possui') ||
                error.message.includes('não encontrada') ? 404 : 400;
            return res.status(status).json({ erro: error.message });
        }
    }

    async deletar(req, res) {
        try {
            const resultado = await vendasService.deletar(
                req.params.id,
                req.usuario.id
            );

            return res.json(resultado);

        } catch (error) {
            const status = error.message.includes('não encontrada') ? 404 : 400;
            return res.status(status).json({ erro: error.message });
        }
    }
}

module.exports = new VendasController();