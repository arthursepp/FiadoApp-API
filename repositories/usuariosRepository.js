const db = require('../config/database');

class UsuariosRepository {

    async findByEmail(email) {
        const result = await db.query(
            'SELECT * FROM usuarios WHERE email = $1',
            [email]
        );

        return result.rows[0];
    }

    async findById(id) {

        const result = await db.query(
            `
            SELECT id, nome, email, tipo, limite_credito_padrao, criado_em
            FROM usuarios
            WHERE id = $1
            `,
            [id]
        );

        return result.rows[0];
    }

    async updatePerfil(id, campos) {

        const sets = [];
        const valores = [];
        let i = 1;

        if (campos.nome !== undefined)                 { sets.push(`nome = $${i++}`);                  valores.push(campos.nome); }
        if (campos.limite_credito_padrao !== undefined) { sets.push(`limite_credito_padrao = $${i++}`); valores.push(campos.limite_credito_padrao); }

        if (sets.length === 0) return null;

        valores.push(id);

        const result = await db.query(
            `
            UPDATE usuarios
            SET ${sets.join(', ')}
            WHERE id = $${i}
            RETURNING id, nome, email, tipo, limite_credito_padrao, criado_em
            `,
            valores
        );

        return result.rows[0];
    }

    async create(usuario) {
        const {
            nome,
            email,
            senha,
            tipo,
            limite_credito_padrao
        } = usuario;

        const result = await db.query(
            `INSERT INTO usuarios
      (nome, email, senha, tipo, limite_credito_padrao)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, nome, email, tipo`,
            [
                nome,
                email,
                senha,
                tipo,
                limite_credito_padrao
            ]
        );

        return result.rows[0];
    }
}

module.exports = new UsuariosRepository();