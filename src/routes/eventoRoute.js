import { Router } from 'express'
import { mostrarPagina, getById, mostrarLista } from '../controllers/eventoController.js'
import { validarId } from '../midwares/eventoMiddleware.js'

const eventoRoute = Router()

eventoRoute.get('/eventos', mostrarLista)
eventoRoute.get('/evento/:id', validarId, mostrarPagina)
eventoRoute.get('/api/eventos/:id', validarId, getById)

export default eventoRoute
