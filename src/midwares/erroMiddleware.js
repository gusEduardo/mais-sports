import { fileURLToPath } from 'node:url'

const viewsPath = fileURLToPath(new URL('../../public/views/', import.meta.url))

// Os quatro parâmetros identificam um middleware de erro no Express.
export function erroMiddleware(erro, req, res, next) {
    if (res.headersSent) return next(erro)

    const status = [400, 404].includes(erro.status) ? erro.status : 500
    const mensagem = status === 500 ? 'Não foi possível carregar o evento. Tente novamente.' : erro.message

    if (status === 500) console.error(erro)

    if (req.path.startsWith('/api/')) {
        return res.status(status).json({ message: mensagem })
    }

    const pagina = status === 500 ? 'erro-servidor.html' : 'evento-nao-encontrado.html'
    return res.status(status).sendFile(pagina, { root: viewsPath })
}
