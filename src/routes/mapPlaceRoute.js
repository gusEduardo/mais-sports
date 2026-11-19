import { Router } from "express";
import mapPlaceController from "../controllers/mapPlaceController.js";
import { auth, authAdmin } from "../middlewares/authMiddleware.js";

const router = Router();

router.get("/api/quadras", mapPlaceController.listar);
router.post("/api/quadras", auth, authAdmin, mapPlaceController.criar);
router.put("/api/quadras/:id", auth, authAdmin, mapPlaceController.atualizar);

export default router;
