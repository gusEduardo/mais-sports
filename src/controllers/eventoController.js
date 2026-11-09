import { fileURLToPath } from 'node:url'
import { findById } from '../repositories/eventoRepository.js'
import { findById as findOrganizadorById } from '../repositories/organizadorRepository.js'

const viewsPath = fileURLToPath(new URL('../../public/views/', import.meta.url))

async function buscarEvento(id) {
    const evento = await findById(id)

    if (!evento) {
        const erro = new Error('Desculpe :( Este evento não está no nosso banco de dados.')
        erro.status = 404
        throw erro
    }

    return evento
}

// /evento/1: valida a existência antes de enviar o mesmo HTML para todo evento.
export async function mostrarPagina(req, res) {
    await buscarEvento(req.eventoId)
    return res.sendFile('evento.html', { root: viewsPath })
}

// /api/eventos/1: entrega os dados que o JavaScript colocará no HTML.
export async function getById(req, res) {
    const evento = await buscarEvento(req.eventoId)
    const organizador = await findOrganizadorById(evento.organizadorId)

    return res.status(200).json({ ...evento, organizador: organizador ?? null })
}

export function mostrarLista(req, res) {
    return res.sendFile('eventos.html', { root: viewsPath })
}
