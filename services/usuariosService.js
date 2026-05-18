// services/usuariosService.js
const usuariosRepository = require('../repositories/usuariosRepository');

class UsuariosService {

    async perfil(usuarioId) {

        const usuario = await usuariosRepository.findById(usuarioId);

        if (!usuario) {
            throw new Error('Usuário não encontrado.');
        }

        return usuario;
    }

    async atualizarPerfil(usuarioId, dados) {

        const campos = {};

        if (dados.nome !== undefined) {

            const nome = dados.nome.trim();

            if (nome === '') {
                throw new Error('O nome não pode ser vazio.');
            }

            campos.nome = nome.charAt(0).toUpperCase() + nome.slice(1);
        }

        if (dados.limite_credito_padrao !== undefined) {

            const limite = parseFloat(dados.limite_credito_padrao);

            if (isNaN(limite)) {
                throw new Error('Limite de crédito inválido.');
            }

            if (limite < 0) {
                throw new Error('Limite de crédito não pode ser negativo.');
            }

            // null desativa o limite global
            campos.limite_credito_padrao = dados.limite_credito_padrao === null ? null : limite;
        }

        if (Object.keys(campos).length === 0) {
            throw new Error('Nenhum campo válido para atualizar. Use: nome, limite_credito_padrao.');
        }

        const atualizado = await usuariosRepository.updatePerfil(usuarioId, campos);

        if (!atualizado) {
            throw new Error('Usuário não encontrado.');
        }

        return atualizado;
    }
}

module.exports = new UsuariosService();