import usuarioRepository from "../repositories/usuarioRepository.js";
import bcrypt from "bcrypt";
import { createAccessToken, getJwtSecret } from "../middlewares/authMiddleware.js";

function isAdminEmail(email) {
  if (typeof email !== "string") {
    return false;
  }

  const adminEmails = (process.env.JWT_ADMIN_EMAILS || "")
    .split(",")
    .map((adminEmail) => adminEmail.trim().toLowerCase());

  return adminEmails.includes(email.toLowerCase());
}

function usuarioPublico(usuario) {
  const acesso = isAdminEmail(usuario.email) ? "admin" : "usuario";

  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    acesso,
  };
}

const usuarioController = {
  async login(req, res, next) {
    try {
      const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
      const senha = typeof req.body?.senha === "string" ? req.body.senha : "";
      if (!email || !senha) {
        return res.status(401).json({ message: "E-mail ou senha inválidos." });
      }

      const usuario = await usuarioRepository.buscarPorEmail(email);

      if (!usuario || !(await bcrypt.compare(senha, usuario.senha))) {
        return res.status(401).json({ message: "E-mail ou senha inválidos." });
      }

      const usuarioSeguro = usuarioPublico(usuario);
      const token = createAccessToken(usuarioSeguro);

      return res.status(200).json({
        message: "Login realizado com sucesso.",
        token,
        usuario: usuarioSeguro,
      });
    } catch (error) {
      next(error);
    }
  },

  async criar(req, res, next) {
    try {
      const { nome, email, senha, cpf, uf } = req.body;
      if (isAdminEmail(email)) {
        return res.status(403).json({ message: "Cadastro não autorizado para este e-mail." });
      }

      getJwtSecret();
      const senhaHash = await bcrypt.hash(senha, 10);

      const novoUsuario = await usuarioRepository.criar(
        nome,
        email,
        senhaHash,
        cpf,
        uf,
      );
      const usuarioSeguro = usuarioPublico(novoUsuario);

      return res.status(201).json({
        message: "Conta criada com sucesso.",
        token: createAccessToken(usuarioSeguro),
        usuario: usuarioSeguro,
      });
    } catch (error) {
      next(error);
    }
  },

  async listar(req, res, next) {
    try {
      const usuarios = await usuarioRepository.listarTodos();
      res.json(usuarios);
    } catch (error) {
      next(error);
    }
  },

  async atualizar(req, res, next) {
    try {
      const { id } = req.params;
      const { nome, email, uf } = req.body;

      const atualizado = await usuarioRepository.atualizar(id, nome, email, uf);
      if (!atualizado) {
        return res.status(404).json({ error: "Usuário não encontrado." });
      }
      res.json({ message: "Atualizado com sucesso!", usuario: atualizado });
    } catch (error) {
      next(error);
    }
  },

  async deletar(req, res, next) {
    try {
      const { id } = req.params;
      const deletado = await usuarioRepository.deletar(id);
      if (!deletado) {
        return res.status(404).json({ error: "Usuário não encontrado." });
      }
      res.json({ message: "Usuário removido com sucesso!" });
    } catch (error) {
      next(error);
    }
  },
};

export default usuarioController;
