// controllers/pdfController.js
const pdfService = require('../services/pdfService');

function enviarPDF(res, buffer, nomeArquivo) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
}

class PdfController {

    async comprovantePagamento(req, res) {
        try {
            const buffer = await pdfService.comprovantePagamento(
                req.params.id,
                req.usuario.id
            );
            enviarPDF(res, buffer, `comprovante-venda-${req.params.id}.pdf`);
        } catch (error) {
            const status = error.message.includes('não encontrada') ? 404 : 400;
            res.status(status).json({ erro: error.message });
        }
    }

    async comprovanteQuitacao(req, res) {
        try {
            const { venda_ids } = req.body;
            const buffer = await pdfService.comprovanteQuitacao(
                venda_ids,
                req.usuario.id
            );
            enviarPDF(res, buffer, `comprovante-quitacao.pdf`);
        } catch (error) {
            const status = error.message.includes('não encontrada') ? 404 : 400;
            res.status(status).json({ erro: error.message });
        }
    }

    async relatorio(req, res) {
        try {
            const { status, data_inicio, data_fim, cliente_id } = req.query;
            const buffer = await pdfService.relatorio(
                req.usuario.id,
                { status, data_inicio, data_fim, cliente_id }
            );
            enviarPDF(res, buffer, `relatorio-vendas.pdf`);
        } catch (error) {
            res.status(500).json({ erro: error.message });
        }
    }
}

module.exports = new PdfController();