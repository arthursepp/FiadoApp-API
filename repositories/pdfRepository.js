// repositories/pdfRepository.js
const db = require('../config/database');

class PdfRepository {

    // ── Comprovante de pagamento individual ──────────────────────────────────

    async findVendaParaComprovante(vendaId, usuarioId) {

        const result = await db.query(
            `
            SELECT
                v.id,
                v.data_compra,
                v.data_vencimento,
                v.valor_total,
                v.status,
                v.observacao,
                v.quitado_em,
                p.data_pagamento,
                p.valor_pago,
                c.nome          AS cliente_nome,
                c.sobrenome     AS cliente_sobrenome,
                c.referencia    AS cliente_referencia,
                c.telefone      AS cliente_telefone,
                u.nome          AS usuario_nome
            FROM vendas v
            JOIN clientes   c ON v.cliente_id  = c.id
            JOIN usuarios   u ON v.usuario_id  = u.id
            LEFT JOIN pagamentos p ON p.venda_id = v.id
            WHERE v.id = $1 AND v.usuario_id = $2
            ORDER BY p.data_pagamento DESC
            LIMIT 1
            `,
            [vendaId, usuarioId]
        );

        return result.rows[0];
    }

    // ── Comprovante de quitação ──────────────────────────────────────────────

    async findVendasParaQuitacao(vendaIds, usuarioId) {

        const placeholders = vendaIds.map((_, i) => `$${i + 2}`).join(', ');

        const result = await db.query(
            `
            SELECT
                v.id,
                v.data_compra,
                v.valor_total,
                v.quitado_em,
                c.nome          AS cliente_nome,
                c.sobrenome     AS cliente_sobrenome,
                c.referencia    AS cliente_referencia,
                c.telefone      AS cliente_telefone,
                u.nome          AS usuario_nome
            FROM vendas v
            JOIN clientes c ON v.cliente_id = c.id
            JOIN usuarios u ON v.usuario_id = u.id
            WHERE v.usuario_id = $1
              AND v.id IN (${placeholders})
            ORDER BY v.data_compra ASC
            `,
            [usuarioId, ...vendaIds]
        );

        return result.rows;
    }

    // ── Relatório com filtros ────────────────────────────────────────────────

    async findVendasParaRelatorio(usuarioId, filtros = {}) {

        const { status, data_inicio, data_fim, cliente_id } = filtros;

        const conditions = ['v.usuario_id = $1'];
        const params = [usuarioId];
        let i = 2;

        if (status) { conditions.push(`v.status = $${i++}`); params.push(status.toUpperCase()); }
        if (data_inicio) { conditions.push(`v.data_compra >= $${i++}`); params.push(data_inicio); }
        if (data_fim) { conditions.push(`v.data_compra <= $${i++}`); params.push(data_fim); }
        if (cliente_id) { conditions.push(`v.cliente_id = $${i++}`); params.push(parseInt(cliente_id)); }

        const result = await db.query(
            `
            SELECT
                v.id,
                v.data_compra,
                v.data_vencimento,
                v.valor_total,
                v.status,
                v.observacao,
                v.quitado_em,
                c.nome          AS cliente_nome,
                c.sobrenome     AS cliente_sobrenome,
                c.referencia    AS cliente_referencia,
                u.nome          AS usuario_nome
            FROM vendas v
            JOIN clientes c ON v.cliente_id = c.id
            JOIN usuarios u ON v.usuario_id = u.id
            WHERE ${conditions.join(' AND ')}
            ORDER BY v.data_compra DESC
            `,
            params
        );

        return result.rows;
    }

    async findItensByVendas(vendaIds) {

        if (vendaIds.length === 0) return [];

        const placeholders = vendaIds.map((_, i) => `$${i + 1}`).join(', ');

        const result = await db.query(
            `
            SELECT *
            FROM itens_venda
            WHERE venda_id IN (${placeholders})
            ORDER BY venda_id, id ASC
            `,
            vendaIds
        );

        return result.rows;
    }
}

module.exports = new PdfRepository();