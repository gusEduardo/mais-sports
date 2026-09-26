import express from 'express'
import { fileURLToPath } from 'node:url'
import eventoRoute from './routes/eventoRoute.js'
import { erroMiddleware } from './midwares/erroMiddleware.js'

const app = express()
const publicPath = fileURLToPath(new URL('../public/', import.meta.url))
const viewsPath = fileURLToPath(new URL('../public/views/', import.meta.url))

app.use(eventoRoute)

// Expõe somente os arquivos públicos. Os databases ficam fora de public.
app.use(express.static(publicPath))
// Mantém links antigos como /index.html e /eventos.html funcionando.
app.use(express.static(viewsPath))

// O middleware de erro fica depois das rotas.
app.use(erroMiddleware)

export default app
