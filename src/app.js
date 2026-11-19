import express from "express";
import { fileURLToPath } from "node:url";
import eventoRoute from "./routes/eventoRoute.js";
import usuarioRoute from "./routes/usuarioRoute.js"; // 1. Importa a rota de usuários
import mapPlaceRoute from "./routes/mapPlaceRoute.js";
import { erroMiddleware } from "./middlewares/erroMiddleware.js";

const app = express();
const publicPath = fileURLToPath(new URL("../public/", import.meta.url));
const viewPath = fileURLToPath(new URL("../public/views/", import.meta.url));

app.use(express.json());
app.use(eventoRoute);
app.use(usuarioRoute); // 2. Ativa a rota de usuários aqui
app.use(mapPlaceRoute);

// Expõe somente os arquivos públicos...
app.use(express.static(publicPath));
app.use(express.static(viewPath));

app.use(erroMiddleware);

export default app;
