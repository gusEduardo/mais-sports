import pool from "../db/pool.js";

const usuarioRepository = {
  async buscarPorEmail(email) {
    const query = `
            SELECT id, nome, email, senha, cpf, uf, criado_em
            FROM usuarios
            WHERE email = $1
            LIMIT 1;
        `;
    const resultado = await pool.query(query, [email]);
    return resultado.rows[0];
  },

  async criar(nome, email, senhaHash, cpf, uf) {
    const query = `
            INSERT INTO usuarios (nome, email, senha, cpf, uf) 
            VALUES ($1, $2, $3, $4, $5) 
            RETURNING id, nome, email, cpf, uf, criado_em;
        `;
    const values = [nome, email, senhaHash, cpf, uf];
    const resultado = await pool.query(query, values);
    return resultado.rows[0];
  },

  async listarTodos() {
    const query =
      "SELECT id, nome, email, cpf, uf, criado_em FROM usuarios ORDER BY id DESC";
    const resultado = await pool.query(query);
    return resultado.rows;
  },

  async atualizar(id, nome, email, uf) {
    const query = `
            UPDATE usuarios 
            SET nome = $1, email = $2, uf = $3 
            WHERE id = $4 
            RETURNING id, nome, email, cpf, uf;
        `;
    const values = [nome, email, uf, id];
    const resultado = await pool.query(query, values);
    return resultado.rows[0];
  },

  async deletar(id) {
    const query = "DELETE FROM usuarios WHERE id = $1 RETURNING id";
    const resultado = await pool.query(query, [id]);
    return resultado.rows[0];
  },
};

// Garanta que esta linha está presente no final do arquivo:
export default usuarioRepository;
