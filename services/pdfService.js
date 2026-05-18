// services/pdfService.js
const PDFDocument = require('pdfkit');
const pdfRepository = require('../repositories/pdfRepository');

// ── Helpers de formatação ────────────────────────────────────────────────────

const fmt = {
    moeda: v => `R$ ${parseFloat(v).toFixed(2).replace('.', ',')}`,
    data: v => {
        if (!v) return '—';
        const [ano, mes, dia] = String(v).split('T')[0].split('-');
        return `${dia}/${mes}/${ano}`;
    },
    dataHora: v => {
        if (!v) return '—';
        return new Date(v).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    },
    nomeCliente: (nome, sobrenome) => [nome, sobrenome].filter(Boolean).join(' ')
};

// ── Componentes de layout ────────────────────────────────────────────────────

function cabecalho(doc, titulo, loja) {
    doc.fontSize(18).font('Helvetica-Bold').text('FiadoApp', { align: 'center' });
    doc.fontSize(11).font('Helvetica').text(loja || '', { align: 'center' });
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(1).stroke('#cccccc');
    doc.moveDown(0.5);
    doc.fontSize(14).font('Helvetica-Bold').text(titulo, { align: 'center' });
    doc.moveDown(0.8);
}

function secao(doc, texto) {
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#333333').text(texto.toUpperCase());
    doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).lineWidth(0.5).stroke('#aaaaaa');
    doc.moveDown(0.4);
    doc.fillColor('#000000');
}

function linha(doc, chave, valor) {
    doc.fontSize(10).font('Helvetica-Bold').text(`${chave}: `, { continued: true });
    doc.font('Helvetica').text(String(valor || '—'));
}

function tabelaItens(doc, itens) {
    const cols = { descricao: 50, qtd: 290, unitario: 360, total: 460 };

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#ffffff');
    doc.rect(50, doc.y, 495, 18).fill('#444444');
    const yHeader = doc.y - 17;
    doc.text('Descrição', cols.descricao, yHeader, { width: 230 });
    doc.text('Qtd', cols.qtd, yHeader, { width: 60, align: 'center' });
    doc.text('Unit.', cols.unitario, yHeader, { width: 90, align: 'right' });
    doc.text('Total', cols.total, yHeader, { width: 85, align: 'right' });
    doc.moveDown(0.2);

    doc.fillColor('#000000').font('Helvetica');
    itens.forEach((item, idx) => {
        doc.rect(50, doc.y, 495, 16).fill(idx % 2 === 0 ? '#f9f9f9' : '#ffffff');
        const y = doc.y - 15;
        doc.fontSize(9).fillColor('#000000');
        doc.text(item.descricao, cols.descricao, y, { width: 230 });
        doc.text(String(item.quantidade), cols.qtd, y, { width: 60, align: 'center' });
        doc.text(fmt.moeda(item.valor_unitario), cols.unitario, y, { width: 90, align: 'right' });
        doc.text(fmt.moeda(item.valor_total), cols.total, y, { width: 85, align: 'right' });
        doc.moveDown(0.1);
    });
}

function rodape(doc) {
    doc.moveDown(1);
    doc.fontSize(8).fillColor('#888888').font('Helvetica')
        .text(`Documento gerado em ${fmt.dataHora(new Date())}`, { align: 'center' });
}

function gerarPDF(callback) {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        try {
            callback(doc);
            doc.end();
        } catch (err) {
            reject(err);
        }
    });
}

// ── Classe principal ─────────────────────────────────────────────────────────

class PdfService {

    // ── Comprovante de pagamento individual ──────────────────────────────────

    async comprovantePagamento(vendaId, usuarioId) {

        const id = parseInt(vendaId);
        if (!id || isNaN(id)) throw new Error('ID de venda inválido.');

        const venda = await pdfRepository.findVendaParaComprovante(id, usuarioId);
        if (!venda) throw new Error('Venda não encontrada.');

        const itens = await pdfRepository.findItensByVendas([id]);

        return gerarPDF(doc => {

            cabecalho(doc, 'Comprovante de Pagamento', venda.usuario_nome);

            secao(doc, 'Cliente');
            linha(doc, 'Nome', fmt.nomeCliente(venda.cliente_nome, venda.cliente_sobrenome));
            if (venda.cliente_referencia) linha(doc, 'Referência', venda.cliente_referencia);
            if (venda.cliente_telefone) linha(doc, 'Telefone', venda.cliente_telefone);

            secao(doc, 'Venda');
            linha(doc, 'Nº da Venda', String(venda.id));
            linha(doc, 'Data da Compra', fmt.data(venda.data_compra));
            linha(doc, 'Vencimento', fmt.data(venda.data_vencimento));
            linha(doc, 'Valor Total', fmt.moeda(venda.valor_total));
            linha(doc, 'Status', venda.status);
            if (venda.observacao) linha(doc, 'Observação', venda.observacao);
            if (venda.quitado_em) linha(doc, 'Pago em', fmt.dataHora(venda.quitado_em));

            secao(doc, 'Itens');
            tabelaItens(doc, itens);

            doc.moveDown(0.5);
            doc.fontSize(11).font('Helvetica-Bold')
                .text(`Total: ${fmt.moeda(venda.valor_total)}`, { align: 'right' });

            rodape(doc);
        });
    }

    // ── Comprovante de quitação ──────────────────────────────────────────────

    async comprovanteQuitacao(vendaIds, usuarioId) {

        if (!Array.isArray(vendaIds) || vendaIds.length === 0) {
            throw new Error('Informe ao menos uma venda.');
        }

        const ids = vendaIds.map(id => parseInt(id)).filter(id => !isNaN(id) && id > 0);
        if (ids.length === 0) throw new Error('IDs de venda inválidos.');

        const vendas = await pdfRepository.findVendasParaQuitacao(ids, usuarioId);
        if (vendas.length === 0) throw new Error('Nenhuma venda encontrada.');

        const itens = await pdfRepository.findItensByVendas(ids);
        const itensPorVenda = itens.reduce((acc, item) => {
            const vid = parseInt(item.venda_id);
            if (!acc[vid]) acc[vid] = [];
            acc[vid].push(item);
            return acc;
        }, {});

        const totalGeral = vendas.reduce((acc, v) => acc + parseFloat(v.valor_total), 0);
        const primeira = vendas[0];

        return gerarPDF(doc => {

            cabecalho(doc, 'Comprovante de Quitação', primeira.usuario_nome);

            secao(doc, 'Cliente');
            linha(doc, 'Nome', fmt.nomeCliente(primeira.cliente_nome, primeira.cliente_sobrenome));
            if (primeira.cliente_referencia) linha(doc, 'Referência', primeira.cliente_referencia);
            if (primeira.cliente_telefone) linha(doc, 'Telefone', primeira.cliente_telefone);

            vendas.forEach(venda => {
                secao(doc, `Venda #${venda.id} — ${fmt.data(venda.data_compra)}`);
                linha(doc, 'Valor', fmt.moeda(venda.valor_total));
                linha(doc, 'Pago em', fmt.dataHora(venda.quitado_em));

                const itensVenda = itensPorVenda[parseInt(venda.id)] || [];
                if (itensVenda.length > 0) {
                    doc.moveDown(0.3);
                    tabelaItens(doc, itensVenda);
                }
            });

            doc.moveDown(0.8);
            doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(1).stroke('#333333');
            doc.moveDown(0.3);
            doc.fontSize(13).font('Helvetica-Bold')
                .text(`Total Quitado: ${fmt.moeda(totalGeral)}`, { align: 'right' });

            rodape(doc);
        });
    }

    // ── Relatório com filtros ────────────────────────────────────────────────

    async relatorio(usuarioId, filtros = {}) {

        const vendas = await pdfRepository.findVendasParaRelatorio(usuarioId, filtros);
        const ids = vendas.map(v => parseInt(v.id));
        const itens = ids.length > 0 ? await pdfRepository.findItensByVendas(ids) : [];

        const itensPorVenda = itens.reduce((acc, item) => {
            const vid = parseInt(item.venda_id);
            if (!acc[vid]) acc[vid] = [];
            acc[vid].push(item);
            return acc;
        }, {});

        const totalGeral = vendas.reduce((acc, v) => acc + parseFloat(v.valor_total), 0);
        const totalPago = vendas.filter(v => v.status === 'PAGA')
            .reduce((acc, v) => acc + parseFloat(v.valor_total), 0);
        const totalAberto = vendas.filter(v => v.status === 'ATIVA')
            .reduce((acc, v) => acc + parseFloat(v.valor_total), 0);

        return gerarPDF(doc => {

            cabecalho(doc, 'Relatório de Vendas', vendas[0]?.usuario_nome || '');

            if (filtros.status || filtros.data_inicio || filtros.data_fim) {
                secao(doc, 'Filtros Aplicados');
                if (filtros.status) linha(doc, 'Status', filtros.status);
                if (filtros.data_inicio) linha(doc, 'Data início', fmt.data(filtros.data_inicio));
                if (filtros.data_fim) linha(doc, 'Data fim', fmt.data(filtros.data_fim));
            }

            secao(doc, 'Resumo');
            linha(doc, 'Total de vendas', String(vendas.length));
            linha(doc, 'Faturamento bruto', fmt.moeda(totalGeral));
            linha(doc, 'Total recebido', fmt.moeda(totalPago));
            linha(doc, 'Total em aberto', fmt.moeda(totalAberto));

            if (vendas.length === 0) {
                doc.moveDown(0.5).fontSize(10).text('Nenhuma venda encontrada para os filtros informados.');
            } else {
                vendas.forEach(venda => {
                    secao(doc, `#${venda.id} — ${fmt.nomeCliente(venda.cliente_nome, venda.cliente_sobrenome)} — ${fmt.data(venda.data_compra)}`);
                    linha(doc, 'Valor', fmt.moeda(venda.valor_total));
                    linha(doc, 'Status', venda.status);
                    if (venda.observacao) linha(doc, 'Obs', venda.observacao);

                    const itensVenda = itensPorVenda[parseInt(venda.id)] || [];
                    if (itensVenda.length > 0) {
                        doc.moveDown(0.3);
                        tabelaItens(doc, itensVenda);
                    }
                });
            }

            doc.moveDown(0.8);
            doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(1).stroke('#333333');
            doc.moveDown(0.3);
            doc.fontSize(12).font('Helvetica-Bold')
                .text(`Total Geral: ${fmt.moeda(totalGeral)}`, { align: 'right' });

            rodape(doc);
        });
    }
}

module.exports = new PdfService();