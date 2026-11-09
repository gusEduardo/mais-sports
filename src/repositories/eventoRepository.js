import { pool } from '../db/pool.js'

export async function findById(id) {
    const { rows } = await pool.query(
        'SELECT data FROM sports_events WHERE id = $1',
        [id]
    )
    return rows[0]?.data
}
