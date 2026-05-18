// services/vendasService.js
const vendasRepository = require('../repositories/vendasRepository');
const db = require('../config/database');

class VendasService {

    // ── Salvar venda ────────────────────────────────────────────────────────

    async salvar(dados, usuarioId) {

        const {
            cliente_id,
            nome,
            sobrenome,
            referencia,
            telefone,
            data_compra,
            data_vencimento,
            observacao,
            itens
        } = dados;

        if (!data_compra) {
            throw new Error('Data da compra é obrigatória.');
        }

        if (!itens || !Array.isArray(itens) || itens.length === 0) {
            throw new Error('Adicione pelo menos um item à venda.');
        }

        const itensValidos = itens.filter(item =>
            parseInt(item.quantidade) > 0 &&
            item.descricao &&
            item.descricao.trim() !== ''
        );

        if (itensValidos.length === 0) {
            throw new Error('Nenhum item válido encontrado. Verifique quantidade e descrição.');
        }

        const client = await db.connect();

        try {

            await client.query('BEGIN');

            // ── Resolve o cliente ───────────────────────────────────────────

            let clienteId;

            if (cliente_id) {

                clienteId = parseInt(cliente_id);

                const atual = await vendasRepository.findClienteAtual(clienteId, usuarioId);

                if (!atual) {
                    throw new Error('Cliente não encontrado.');
                }

                const camposParaAtualizar = {};

                const sobrenomeNovo = sobrenome ? this._capitalizar(sobrenome) : null;
                if (sobrenomeNovo && sobrenomeNovo !== atual.sobrenome) {
                    camposParaAtualizar.sobrenome = sobrenomeNovo;
                }
                if (referencia && referencia.trim() !== '' && referencia !== atual.referencia) {
                    camposParaAtualizar.referencia = referencia.trim();
                }
                if (telefone && telefone.trim() !== '' && telefone !== atual.telefone) {
                    camposParaAtualizar.telefone = telefone.trim();
                }

                if (Object.keys(camposParaAtualizar).length > 0) {
                    await vendasRepository.updateClienteCampos(clienteId, usuarioId, camposParaAtualizar);
                }

            } else {

                if (!nome || nome.trim() === '') {
                    throw new Error('O nome do cliente é obrigatório.');
                }

                const nomeFormatado = this._capitalizar(nome);
                const sobrenomeFormatado = sobrenome ? this._capitalizar(sobrenome) : '';

                const duplicado = await vendasRepository.findClienteDuplicado({
                    usuarioId,
                    nome: nomeFormatado,
                    sobrenome: sobrenomeFormatado,
                    referencia: referencia || ''
                });

                if (duplicado) {
                    throw new Error('Cliente já existe. Selecione-o na lista.');
                }

                const novoCliente = await vendasRepository.createCliente({
                    usuarioId,
                    nome: nomeFormatado,
                    sobrenome: sobrenomeFormatado,
                    referencia: referencia || null,
                    telefone: telefone || null
                });

                clienteId = novoCliente.id;
            }

            // ── Cria a venda ────────────────────────────────────────────────

            const venda = await vendasRepository.create({
                usuarioId,
                clienteId,
                dataCompra: data_compra,
                dataVencimento: data_vencimento || null,
                observacao: observacao || null
            });

            // ── Insere os itens ─────────────────────────────────────────────

            let valorTotalGeral = 0;

            for (const item of itensValidos) {

                const quantidade = parseInt(item.quantidade);
                const valorUnitario = parseFloat(item.valor_unitario || 0);
                const valorTotalItem = quantidade * valorUnitario;

                valorTotalGeral += valorTotalItem;

                await vendasRepository.createItem({
                    vendaId: venda.id,
                    descricao: item.descricao.trim(),
                    quantidade,
                    valorUnitario,
                    valorTotal: valorTotalItem
                });
            }

            if (valorTotalGeral <= 0) {
                throw new Error('O valor total da venda deve ser maior que zero.');
            }

            const vendaFinal = await vendasRepository.updateValorTotal(
                venda.id,
                usuarioId,
                valorTotalGeral
            );

            await client.query('COMMIT');

            const itensInseridos = await vendasRepository.findItensByVenda(venda.id);

            return {
                ...vendaFinal,
                cliente_id: clienteId,
                itens: itensInseridos
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // ── Listar com filtros ──────────────────────────────────────────────────

    async listar(usuarioId, filtros = {}) {

        this._validarFiltros(filtros);

        const vendas = await vendasRepository.findAll(usuarioId, filtros);

        if (vendas.length === 0) return [];

        // Busca todos os itens de uma vez (evita N+1 queries)
        const vendaIds = vendas.map(v => v.id);
        const todosItens = await vendasRepository.findItensByVendas(vendaIds);

        // Agrupa itens por venda_id
        const itensPorVenda = todosItens.reduce((acc, item) => {
            if (!acc[item.venda_id]) acc[item.venda_id] = [];
            acc[item.venda_id].push(item);
            return acc;
        }, {});

        return vendas.map(venda => ({
            ...venda,
            itens: itensPorVenda[venda.id] || []
        }));
    }

    // ── Detalhar uma venda ──────────────────────────────────────────────────

    async detalhar(vendaId, usuarioId) {

        const id = parseInt(vendaId);

        if (!id || isNaN(id)) {
            throw new Error('ID de venda inválido.');
        }

        const venda = await vendasRepository.findById(id, usuarioId);

        if (!venda) {
            throw new Error('Venda não encontrada.');
        }

        const itens = await vendasRepository.findItensByVenda(id);

        return { ...venda, itens };
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    _validarFiltros({ status, data_inicio, data_fim }) {

        const statusValidos = ['ATIVA', 'PAGA', 'PARCIAL'];

        if (status && !statusValidos.includes(status.toUpperCase())) {
            throw new Error(`Status inválido. Use: ${statusValidos.join(', ')}.`);
        }

        const reData = /^\d{4}-\d{2}-\d{2}$/;

        if (data_inicio && !reData.test(data_inicio)) {
            throw new Error('data_inicio deve estar no formato YYYY-MM-DD.');
        }

        if (data_fim && !reData.test(data_fim)) {
            throw new Error('data_fim deve estar no formato YYYY-MM-DD.');
        }

        if (data_inicio && data_fim && data_inicio > data_fim) {
            throw new Error('data_inicio não pode ser posterior a data_fim.');
        }
    }

    // ── Pagar venda individual ──────────────────────────────────────────────

    async pagar(vendaId, usuarioId) {

        const id = parseInt(vendaId);
        if (!id || isNaN(id)) throw new Error('ID de venda inválido.');

        const venda = await vendasRepository.findVendaParaPagamento(id, usuarioId);

        if (!venda) throw new Error('Venda não encontrada.');
        if (venda.status === 'PAGA') throw new Error('Esta venda já foi paga.');

        const client = await db.connect();

        try {
            await client.query('BEGIN');

            await vendasRepository.registrarPagamento(client, {
                vendaId: id,
                valorPago: parseFloat(venda.valor_total),
                usuarioId
            });

            await client.query('COMMIT');

            return {
                mensagem: 'Venda marcada como paga com sucesso!',
                venda_id: id,
                pdf_url: `/vendas/${id}/pdf`
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // ── Quitar cliente (vendas selecionadas) ────────────────────────────────

    async quitar(clienteId, vendaIds, usuarioId) {

        const cId = parseInt(clienteId);
        if (!cId || isNaN(cId)) throw new Error('ID de cliente inválido.');

        if (!Array.isArray(vendaIds) || vendaIds.length === 0) {
            throw new Error('Informe ao menos uma venda para quitar.');
        }

        const ids = vendaIds.map(id => parseInt(id)).filter(id => !isNaN(id) && id > 0);

        if (ids.length === 0) throw new Error('IDs de venda inválidos.');

        // Busca todas as vendas ativas do cliente para validação
        const vendasAtivas = await vendasRepository.findVendasAtivasByCliente(cId, usuarioId);

        if (vendasAtivas.length === 0) {
            throw new Error('Este cliente não possui vendas ativas.');
        }

        // parseInt garante comparação number === number (pg retorna ids como string)
        const ativasIds = vendasAtivas.map(v => parseInt(v.id));

        // Garante que todos os IDs solicitados são ativos e pertencem ao cliente
        const invalidas = ids.filter(id => !ativasIds.includes(id));
        if (invalidas.length > 0) {
            throw new Error(`Venda(s) não encontrada(s) ou já paga(s): ${invalidas.join(', ')}.`);
        }

        const vendasParaQuitar = vendasAtivas.filter(v => ids.includes(parseInt(v.id)));
        const totalQuitado = vendasParaQuitar.reduce((acc, v) => acc + parseFloat(v.valor_total), 0);

        const client = await db.connect();

        try {
            await client.query('BEGIN');

            for (const venda of vendasParaQuitar) {
                await vendasRepository.registrarPagamento(client, {
                    vendaId: venda.id,
                    valorPago: parseFloat(venda.valor_total),
                    usuarioId
                });
            }

            await client.query('COMMIT');

            return {
                mensagem: 'Vendas quitadas com sucesso!',
                cliente_id: cId,
                vendas_quitadas: ids,
                total_quitado: totalQuitado,
                pdf_url: `/clientes/${cId}/pdf`
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    _capitalizar(str) {
        return str.trim().charAt(0).toUpperCase() + str.trim().slice(1).toLowerCase();
    }

    async deletar(vendaId, usuarioId) {
        const id = parseInt(vendaId);
        if (!id || isNaN(id)) throw new Error('ID de venda inválido.');

        const venda = await vendasRepository.findById(id, usuarioId);

        if (!venda) throw new Error('Venda não encontrada.');

        if (venda.status === 'PAGA') {
            throw new Error('Não é possível excluir uma venda já paga.');
        }

        const deletada = await vendasRepository.deleteById(id, usuarioId);

        if (!deletada) throw new Error('Venda não encontrada.');

        return { mensagem: 'Venda excluída com sucesso!', venda_id: id };
    }
}

module.exports = new VendasService();