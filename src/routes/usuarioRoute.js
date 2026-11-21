import { Router } from "express";
import usuarioController from "../controllers/usuarioController.js";
import { auth, authAdmin, authOwnerOrAdmin } from "../middlewares/authMiddleware.js";

const router = Router();

router.post("/usuarios/login", usuarioController.login);
router.get("/usuarios/verificar", usuarioController.verificar);
router.post("/usuarios", usuarioController.criar);
router.get("/usuarios", auth, authAdmin, usuarioController.listar);
router.put("/usuarios/:id", auth, authOwnerOrAdmin, usuarioController.atualizar);
router.delete("/usuarios/:id", auth, authOwnerOrAdmin, usuarioController.deletar);

export default router;
