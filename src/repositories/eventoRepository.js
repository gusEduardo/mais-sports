import eventos from '../databases/eventos.json' with { type: 'json' }

export function findById(id) {
    return eventos.find(evento => evento.id === id)
}
