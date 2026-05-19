// clientesService
const clientesRepository = require('../repositories/clientesRepository');

class ClientesService {

    async listar(usuarioId) {
        return await clientesRepository.findAllByUsuario(usuarioId);
    }

    async buscar(id, usuarioId) {

        const cliente = await clientesRepository.findById(id, usuarioId);

        if (!cliente) {
            throw new Error('Cliente não encontrado');
        }

        return cliente;
    }

    async criar(data, usuarioId) {

        if (!data.nome) {
            throw new Error('Nome é obrigatório');
        }

        return await clientesRepository.create({
            ...data,
            usuario_id: usuarioId
        });
    }

    async atualizar(id, usuarioId, data) {

        const cliente = await clientesRepository.update(
            id,
            usuarioId,
            data
        );

        if (!cliente) {
            throw new Error('Cliente não encontrado');
        }

        return cliente;
    }

    async historico(id, usuarioId) {

        const clienteId = parseInt(id);

        if (!clienteId || isNaN(clienteId)) {
            throw new Error('ID de cliente inválido.');
        }

        const historico = await clientesRepository.findHistorico(clienteId, usuarioId);

        if (!historico) {
            throw new Error('Cliente não encontrado.');
        }

        return historico;
    }

    async deletar(id, usuarioId) {

        const cliente = await clientesRepository.delete(
            id,
            usuarioId
        );

        if (!cliente) {
            throw new Error('Cliente não encontrado');
        }

        return cliente;
    }

    async listarMeus(usuarioId) {
        return await clientesRepository.findAllByUsuarioComStats(usuarioId);
    }
}

module.exports = new ClientesService();