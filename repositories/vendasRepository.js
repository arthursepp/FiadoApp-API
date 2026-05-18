// repositories/vendasRepository.js
const db = require('../config/database');

class VendasRepository {

    // ── Salvar venda ────────────────────────────────────────────────────────

    async create({ usuarioId, clienteId, dataCompra, dataVencimento, observacao }) {

        const result = await db.query(
            `
            INSERT INTO vendas
                (usuario_id, cliente_id, data_compra, data_vencimento, valor_total, status, observacao)
            VALUES ($1, $2, $3, $4, 0, 'ATIVA', $5)
            RETURNING *
            `,
            [usuarioId, clienteId, dataCompra, dataVencimento || null, observacao || null]
        );

        return result.rows[0];
    }

    async updateValorTotal(vendaId, usuarioId, valorTotal) {

        const result = await db.query(
            `
            UPDATE vendas
            SET valor_total = $1
            WHERE id = $2 AND usuario_id = $3
            RETURNING *
            `,
            [valorTotal, vendaId, usuarioId]
        );

        return result.rows[0];
    }

    async createItem({ vendaId, descricao, quantidade, valorUnitario, valorTotal }) {

        const result = await db.query(
            `
            INSERT INTO itens_venda
                (venda_id, descricao, quantidade, valor_unitario, valor_total)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            `,
            [vendaId, descricao, quantidade, valorUnitario, valorTotal]
        );

        return result.rows[0];
    }

    async findClienteAtual(clienteId, usuarioId) {

        const result = await db.query(
            `
            SELECT sobrenome, referencia, telefone
            FROM clientes
            WHERE id = $1 AND usuario_id = $2
            `,
            [clienteId, usuarioId]
        );

        return result.rows[0];
    }

    async updateClienteCampos(clienteId, usuarioId, campos) {

        const sets = [];
        const valores = [];
        let i = 1;

        if (campos.sobrenome !== undefined) { sets.push(`sobrenome = $${i++}`); valores.push(campos.sobrenome); }
        if (campos.referencia !== undefined) { sets.push(`referencia = $${i++}`); valores.push(campos.referencia); }
        if (campos.telefone !== undefined) { sets.push(`telefone = $${i++}`); valores.push(campos.telefone); }

        if (sets.length === 0) return;

        valores.push(clienteId, usuarioId);
        await db.query(
            `UPDATE clientes SET ${sets.join(', ')} WHERE id = $${i++} AND usuario_id = $${i}`,
            valores
        );
    }

    async createCliente({ usuarioId, nome, sobrenome, referencia, telefone }) {

        const result = await db.query(
            `
            INSERT INTO clientes (usuario_id, nome, sobrenome, referencia, telefone)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            `,
            [usuarioId, nome, sobrenome || '', referencia || null, telefone || null]
        );

        return result.rows[0];
    }

    async findClienteDuplicado({ usuarioId, nome, sobrenome, referencia }) {

        const result = await db.query(
            `
            SELECT id FROM clientes
            WHERE usuario_id = $1
              AND nome = $2
              AND (sobrenome = $3 OR (sobrenome IS NULL AND $3 = ''))
              AND (
                  (referencia IS NULL AND $4 = '')
                  OR referencia = $4
              )
            LIMIT 1
            `,
            [usuarioId, nome, sobrenome || '', referencia || '']
        );

        return result.rows[0];
    }

    // ── Listagem com filtros ────────────────────────────────────────────────

    async findAll(usuarioId, filtros = {}) {

        const { status, data_inicio, data_fim, cliente_id } = filtros;

        const conditions = ['v.usuario_id = $1'];
        const params = [usuarioId];
        let i = 2;

        if (status) {
            conditions.push(`v.status = $${i++}`);
            params.push(status.toUpperCase());
        }

        if (data_inicio) {
            conditions.push(`v.data_compra >= $${i++}`);
            params.push(data_inicio);
        }

        if (data_fim) {
            conditions.push(`v.data_compra <= $${i++}`);
            params.push(data_fim);
        }

        if (cliente_id) {
            conditions.push(`v.cliente_id = $${i++}`);
            params.push(parseInt(cliente_id));
        }

        const where = conditions.join(' AND ');

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
                v.criado_em,
                c.id         AS cliente_id,
                c.nome       AS cliente_nome,
                c.sobrenome  AS cliente_sobrenome,
                c.referencia AS cliente_referencia,
                c.telefone   AS cliente_telefone
            FROM vendas v
            JOIN clientes c ON c.id = v.cliente_id
            WHERE ${where}
            ORDER BY v.id DESC
            `,
            params
        );

        return result.rows;
    }

    async findItensByVendas(vendaIds) {

        if (vendaIds.length === 0) return [];

        const placeholders = vendaIds.map((_, idx) => `$${idx + 1}`).join(', ');

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

    // ── Detalhe de uma venda ────────────────────────────────────────────────

    async findById(vendaId, usuarioId) {

        const id = parseInt(vendaId);

        if (!id || isNaN(id)) {
            throw new Error('ID de venda inválido.');
        }

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
                v.criado_em,
                c.id         AS cliente_id,
                c.nome       AS cliente_nome,
                c.sobrenome  AS cliente_sobrenome,
                c.referencia AS cliente_referencia,
                c.telefone   AS cliente_telefone
            FROM vendas v
            JOIN clientes c ON c.id = v.cliente_id
            WHERE v.id = $1 AND v.usuario_id = $2
            `,
            [id, parseInt(usuarioId)]
        );

        return result.rows[0];
    }

    async findItensByVenda(vendaId) {

        const id = parseInt(vendaId);

        const result = await db.query(
            `
            SELECT *
            FROM itens_venda
            WHERE venda_id = $1
            ORDER BY id ASC
            `,
            [id]
        );

        return result.rows;
    }

    // ── Pagar / Quitar ──────────────────────────────────────────────────────

    async findVendaParaPagamento(vendaId, usuarioId) {

        const result = await db.query(
            `
            SELECT id, valor_total, status, cliente_id
            FROM vendas
            WHERE id = $1 AND usuario_id = $2
            `,
            [parseInt(vendaId), usuarioId]
        );

        return result.rows[0];
    }

    async findVendasAtivasByCliente(clienteId, usuarioId) {

        const result = await db.query(
            `
            SELECT id, valor_total, status, data_compra
            FROM vendas
            WHERE cliente_id = $1
              AND usuario_id = $2
              AND status = 'ATIVA'
            ORDER BY data_compra ASC
            `,
            [parseInt(clienteId), usuarioId]
        );

        return result.rows;
    }

    async registrarPagamento(client, { vendaId, valorPago, usuarioId }) {

        await client.query(
            `
            INSERT INTO pagamentos (venda_id, valor_pago, usuario_id)
            VALUES ($1, $2, $3)
            `,
            [vendaId, valorPago, usuarioId]
        );

        await client.query(
            `
            UPDATE vendas
            SET status = 'PAGA', quitado_em = NOW()
            WHERE id = $1 AND usuario_id = $2
            `,
            [vendaId, usuarioId]
        );
    }

    async criarVendaRestante(client, { clienteId, usuarioId, valorRestante }) {

        const hoje = new Date().toISOString().split('T')[0];
        const venc = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
            .toISOString().split('T')[0];

        const result = await client.query(
            `
            INSERT INTO vendas
                (cliente_id, data_compra, data_vencimento, valor_total, status, usuario_id)
            VALUES ($1, $2, $3, $4, 'ATIVA', $5)
            RETURNING id
            `,
            [clienteId, hoje, venc, valorRestante, usuarioId]
        );

        const novaVendaId = result.rows[0].id;

        await client.query(
            `
            INSERT INTO itens_venda
                (venda_id, quantidade, descricao, valor_unitario, valor_total)
            VALUES ($1, 1, 'Saldo restante', $2, $2)
            `,
            [novaVendaId, valorRestante]
        );

        return novaVendaId;
    }

    async deleteById(vendaId, usuarioId) {
        const client = await db.connect();

        try {
            await client.query('BEGIN');

            await client.query(
                `DELETE FROM itens_venda WHERE venda_id = $1`,
                [vendaId]
            );

            const result = await client.query(
                `DELETE FROM vendas
             WHERE id = $1 AND usuario_id = $2
             RETURNING id`,
                [vendaId, usuarioId]
            );

            await client.query('COMMIT');

            return result.rows[0]; // retorna { id } ou undefined
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = new VendasRepository();