export function validarId(req, res, next) {
    const id = req.params.id

    // parseInt('1abc') daria 1. Aqui exigimos que o ID inteiro seja válido.
    if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
        const erro = new Error('ID inválido. Use um número inteiro positivo, como 1 ou 2.')
        erro.status = 400
        return next(erro)
    }

    req.eventoId = Number(id)
    return next()
}
