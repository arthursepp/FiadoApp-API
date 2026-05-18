const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const usuariosRepository = require('../repositories/usuariosRepository');

class AuthService {

    async register(data) {

        const usuarioExistente = await usuariosRepository.findByEmail(data.email);

        if (usuarioExistente) {
            throw new Error('Email já cadastrado');
        }

        const senhaHash = await bcrypt.hash(data.senha, 10);

        const usuario = await usuariosRepository.create({
            nome: data.nome,
            email: data.email,
            senha: senhaHash,
            tipo: data.tipo || 'USER',
            limite_credito_padrao: data.limite_credito_padrao || null
        });

        return usuario;
    }

    async login(email, senha) {

        const usuario = await usuariosRepository.findByEmail(email);

        if (!usuario) {
            throw new Error('Usuário não encontrado');
        }

        const senhaValida = await bcrypt.compare(senha, usuario.senha);

        if (!senhaValida) {
            throw new Error('Senha inválida');
        }

        const token = jwt.sign(
            {
                id: usuario.id,
                email: usuario.email,
                tipo: usuario.tipo
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '7d'
            }
        );

        return {
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                tipo: usuario.tipo
            },
            token
        };
    }
}

module.exports = new AuthService();