// services/statsService.js
const statsRepository = require('../repositories/statsRepository');

class StatsService {

    // ── Dashboard ────────────────────────────────────────────────────────────

    async dashboard(usuarioId) {

        const stats = await statsRepository.findDashboardStats(usuarioId);

        return {
            total_receber: parseFloat(stats.total_receber),
            total_ativas: parseInt(stats.total_ativas),
            total_inadimplentes: parseInt(stats.total_inadimplentes),
            total_clientes: parseInt(stats.total_clientes)
        };
    }

    // ── Analytics ────────────────────────────────────────────────────────────

    async analytics(usuarioId, query) {

        const { de, ate } = this._resolverPeriodo(query);

        const [porDia, topClientes, resumo, porStatus] = await Promise.all([
            statsRepository.findVendasPorDia(usuarioId, de, ate),
            statsRepository.findTopClientes(usuarioId, de, ate),
            statsRepository.findResumoPeriodo(usuarioId, de, ate),
            statsRepository.findPorStatus(usuarioId, de, ate)
        ]);

        return {
            periodo: { de, ate },
            resumo: {
                total_vendas: parseInt(resumo.total_vendas),
                faturamento_bruto: parseFloat(resumo.faturamento_bruto),
                total_recebido: parseFloat(resumo.total_recebido),
                total_aberto: parseFloat(resumo.total_aberto),
                clientes_atendidos: parseInt(resumo.clientes_atendidos)
            },
            por_dia: porDia.map(r => ({
                dia: r.dia,
                total: parseFloat(r.total),
                qtd: parseInt(r.qtd)
            })),
            top_clientes: topClientes.map(r => ({
                nome: r.nome,
                referencia: r.referencia,
                total: parseFloat(r.total),
                qtd_vendas: parseInt(r.qtd_vendas)
            })),
            por_status: porStatus.map(r => ({
                status: r.status,
                qtd: parseInt(r.qtd),
                total: parseFloat(r.total)
            }))
        };
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    _resolverPeriodo({ de, ate }) {

        const reData = /^\d{4}-\d{2}-\d{2}$/;

        const hoje = new Date().toISOString().split('T')[0];
        const primeiroDiaMes = hoje.slice(0, 7) + '-01';

        const deValido = de && reData.test(de) ? de : primeiroDiaMes;
        const ateValido = ate && reData.test(ate) ? ate : hoje;

        if (deValido > ateValido) {
            throw new Error('O parâmetro "de" não pode ser posterior a "ate".');
        }

        return { de: deValido, ate: ateValido };
    }
}

module.exports = new StatsService();