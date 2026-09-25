import organizadores from '../databases/organizadores.json' with { type: 'json' }

export function findById(id) {
    return organizadores.find(organizador => organizador.id === id)
}
