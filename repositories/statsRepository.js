// repositories/statsRepository.js
const db = require('../config/database');

class StatsRepository {

    // ── Dashboard ────────────────────────────────────────────────────────────

    async findDashboardStats(usuarioId) {

        const result = await db.query(
            `
            SELECT
                COALESCE(SUM(CASE WHEN status = 'ATIVA' THEN valor_total ELSE 0 END), 0)  AS total_receber,
                COUNT(CASE WHEN status = 'ATIVA' THEN 1 END)                               AS total_ativas,
                COUNT(DISTINCT CASE
                    WHEN status = 'ATIVA'
                     AND data_vencimento IS NOT NULL
                     AND data_vencimento < CURRENT_DATE
                    THEN cliente_id END)                                                    AS total_inadimplentes,
                (SELECT COUNT(*) FROM clientes WHERE usuario_id = $1)                      AS total_clientes
            FROM vendas
            WHERE usuario_id = $1
            `,
            [usuarioId]
        );

        return result.rows[0];
    }

    // ── Analytics ────────────────────────────────────────────────────────────

    async findVendasPorDia(usuarioId, de, ate) {

        const result = await db.query(
            `
            SELECT
                DATE(data_compra)       AS dia,
                SUM(valor_total)        AS total,
                COUNT(*)                AS qtd
            FROM vendas
            WHERE usuario_id = $1
              AND data_compra BETWEEN $2 AND $3
            GROUP BY DATE(data_compra)
            ORDER BY dia ASC
            `,
            [usuarioId, de, ate]
        );

        return result.rows;
    }

    async findTopClientes(usuarioId, de, ate) {

        const result = await db.query(
            `
            SELECT
                c.nome,
                COALESCE(c.referencia, '')   AS referencia,
                SUM(v.valor_total)           AS total,
                COUNT(v.id)                  AS qtd_vendas
            FROM vendas v
            JOIN clientes c ON v.cliente_id = c.id
            WHERE v.usuario_id = $1
              AND v.data_compra BETWEEN $2 AND $3
            GROUP BY c.id, c.nome, c.referencia
            ORDER BY total DESC
            LIMIT 10
            `,
            [usuarioId, de, ate]
        );

        return result.rows;
    }

    async findResumoPeriodo(usuarioId, de, ate) {

        const result = await db.query(
            `
            SELECT
                COUNT(*)                                                                     AS total_vendas,
                COALESCE(SUM(valor_total), 0)                                               AS faturamento_bruto,
                COALESCE(SUM(CASE WHEN status = 'PAGA'  THEN valor_total ELSE 0 END), 0)   AS total_recebido,
                COALESCE(SUM(CASE WHEN status = 'ATIVA' THEN valor_total ELSE 0 END), 0)   AS total_aberto,
                COUNT(DISTINCT cliente_id)                                                   AS clientes_atendidos
            FROM vendas
            WHERE usuario_id = $1
              AND data_compra BETWEEN $2 AND $3
            `,
            [usuarioId, de, ate]
        );

        return result.rows[0];
    }

    async findPorStatus(usuarioId, de, ate) {

        const result = await db.query(
            `
            SELECT
                status,
                COUNT(*)            AS qtd,
                SUM(valor_total)    AS total
            FROM vendas
            WHERE usuario_id = $1
              AND data_compra BETWEEN $2 AND $3
            GROUP BY status
            `,
            [usuarioId, de, ate]
        );

        return result.rows;
    }
}

module.exports = new StatsRepository();