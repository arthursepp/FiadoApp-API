// clientesRepository.js
const db = require('../config/database');

class ClientesRepository {

    async findAllByUsuarioComStats(usuarioId) {

        const result = await db.query(
            `
        SELECT
            c.id,
            c.nome,
            c.sobrenome,
            c.referencia,
            c.telefone,
            c.limite_credito,
            c.criado_em,
            COUNT(CASE WHEN v.status = 'PAGA' THEN 1 END)                    AS qtd_vendas_pagas,
            COUNT(CASE WHEN v.status = 'ATIVA' THEN 1 END)                   AS qtd_vendas_abertas,
            COALESCE(SUM(CASE WHEN v.status = 'ATIVA' THEN v.valor_total ELSE 0 END), 0) AS valor_devido
        FROM clientes c
        LEFT JOIN vendas v ON v.cliente_id = c.id
        WHERE c.usuario_id = $1
        GROUP BY c.id, c.nome, c.sobrenome, c.referencia, c.telefone, c.limite_credito, c.criado_em
        ORDER BY c.id DESC
        `,
            [usuarioId]
        );

        return result.rows;
    }

    async findById(id, usuarioId) {

        const result = await db.query(
            `
            SELECT *
            FROM clientes
            WHERE id = $1
            AND usuario_id = $2
            `,
            [id, usuarioId]
        );

        return result.rows[0];
    }

    async create(cliente) {

        const {
            usuario_id,
            nome,
            sobrenome,
            referencia,
            telefone,
            limite_credito
        } = cliente;

        const result = await db.query(
            `
            INSERT INTO clientes
            (
                usuario_id,
                nome,
                sobrenome,
                referencia,
                telefone,
                limite_credito
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
            `,
            [
                usuario_id,
                nome,
                sobrenome,
                referencia,
                telefone,
                limite_credito
            ]
        );

        return result.rows[0];
    }

    async update(id, usuarioId, cliente) {

        const {
            nome,
            sobrenome,
            referencia,
            telefone,
            limite_credito
        } = cliente;

        const result = await db.query(
            `
            UPDATE clientes
            SET
                nome = $1,
                sobrenome = $2,
                referencia = $3,
                telefone = $4,
                limite_credito = $5
            WHERE id = $6
            AND usuario_id = $7
            RETURNING *
            `,
            [
                nome,
                sobrenome,
                referencia,
                telefone,
                limite_credito,
                id,
                usuarioId
            ]
        );

        return result.rows[0];
    }

    async findHistorico(clienteId, usuarioId) {

        // Dados do cliente
        const clienteResult = await db.query(
            `
            SELECT
                id,
                nome,
                sobrenome,
                referencia,
                telefone,
                limite_credito
            FROM clientes
            WHERE id = $1 AND usuario_id = $2
            `,
            [clienteId, usuarioId]
        );

        const cliente = clienteResult.rows[0];

        if (!cliente) return null;

        // Vendas com seus itens e pagamentos
        const vendasResult = await db.query(
            `
            SELECT
                v.id,
                v.data_compra,
                v.data_vencimento,
                v.valor_total,
                v.status,
                v.observacao,
                v.quitado_em,
                v.criado_em
            FROM vendas v
            WHERE v.cliente_id = $1 AND v.usuario_id = $2
            ORDER BY v.data_compra DESC
            `,
            [clienteId, usuarioId]
        );

        const vendas = vendasResult.rows;

        if (vendas.length === 0) {
            return { ...cliente, vendas: [], resumo: this._resumoVazio() };
        }

        const vendaIds = vendas.map(v => v.id);
        const placeholders = vendaIds.map((_, i) => `$${i + 1}`).join(', ');

        // Itens de todas as vendas (evita N+1)
        const itensResult = await db.query(
            `
            SELECT *
            FROM itens_venda
            WHERE venda_id IN (${placeholders})
            ORDER BY venda_id, id ASC
            `,
            vendaIds
        );

        // Pagamentos de todas as vendas (evita N+1)
        const pagamentosResult = await db.query(
            `
            SELECT id, venda_id, valor_pago, data_pagamento AS pago_em
            FROM pagamentos
            WHERE venda_id IN (${placeholders})
            ORDER BY venda_id, data_pagamento ASC
            `,
            vendaIds
        );

        // Agrupa itens e pagamentos por venda_id
        const itensPorVenda = itensResult.rows.reduce((acc, item) => {
            if (!acc[item.venda_id]) acc[item.venda_id] = [];
            acc[item.venda_id].push(item);
            return acc;
        }, {});

        const pagamentosPorVenda = pagamentosResult.rows.reduce((acc, pag) => {
            if (!acc[pag.venda_id]) acc[pag.venda_id] = [];
            acc[pag.venda_id].push(pag);
            return acc;
        }, {});

        const vendasCompletas = vendas.map(venda => ({
            ...venda,
            itens: itensPorVenda[venda.id] || [],
            pagamentos: pagamentosPorVenda[venda.id] || []
        }));

        // Resumo financeiro
        const resumo = vendasCompletas.reduce((acc, v) => {
            const valor = parseFloat(v.valor_total);
            acc.total_vendas++;
            acc.valor_total += valor;
            if (v.status === 'ATIVA') { acc.vendas_ativas++; acc.valor_em_aberto += valor; }
            if (v.status === 'PAGA') { acc.vendas_pagas++; acc.valor_pago += valor; }
            return acc;
        }, {
            total_vendas: 0,
            vendas_ativas: 0,
            vendas_pagas: 0,
            valor_total: 0,
            valor_em_aberto: 0,
            valor_pago: 0
        });

        return { ...cliente, resumo, vendas: vendasCompletas };
    }

    _resumoVazio() {
        return {
            total_vendas: 0, vendas_ativas: 0, vendas_pagas: 0,
            valor_total: 0, valor_em_aberto: 0, valor_pago: 0
        };
    }

    async delete(id, usuarioId) {

        const client = await db.connect();

        try {

            await client.query('BEGIN');

            // 1. Busca o cliente — garante que existe e pertence ao usuário
            const clienteResult = await client.query(
                `
                SELECT id FROM clientes
                WHERE id = $1 AND usuario_id = $2
                `,
                [id, usuarioId]
            );

            const cliente = clienteResult.rows[0];

            if (!cliente) {
                await client.query('ROLLBACK');
                return null;
            }

            // 2. Busca os IDs de todas as vendas do cliente
            const vendasResult = await client.query(
                `
                SELECT id FROM vendas
                WHERE cliente_id = $1 AND usuario_id = $2
                `,
                [id, usuarioId]
            );

            const vendaIds = vendasResult.rows.map(v => v.id);

            if (vendaIds.length > 0) {

                const placeholders = vendaIds.map((_, i) => `$${i + 1}`).join(', ');

                // 3. Deleta os itens das vendas
                await client.query(
                    `DELETE FROM itens_venda WHERE venda_id IN (${placeholders})`,
                    vendaIds
                );

                // 4. Deleta os pagamentos das vendas
                await client.query(
                    `DELETE FROM pagamentos WHERE venda_id IN (${placeholders})`,
                    vendaIds
                );

                // 5. Deleta as vendas
                await client.query(
                    `DELETE FROM vendas WHERE id IN (${placeholders})`,
                    vendaIds
                );
            }

            // 6. Por fim, deleta o cliente
            const deletadoResult = await client.query(
                `
                DELETE FROM clientes
                WHERE id = $1 AND usuario_id = $2
                RETURNING *
                `,
                [id, usuarioId]
            );

            await client.query('COMMIT');

            return deletadoResult.rows[0];

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = new ClientesRepository();