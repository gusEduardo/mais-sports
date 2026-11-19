import { readFile } from 'node:fs/promises'
import { Pool } from 'pg'
import eventos from '../databases/eventos.json' with { type: 'json' }
import organizadores from '../databases/organizadores.json' with { type: 'json' }
import quadras from '../databases/quadras.json' with { type: 'json' }

const connectionString = process.env.DATABASE_URL_UNPOOLED

if (!connectionString) {
    throw new Error('DATABASE_URL_UNPOOLED is required to run the database migration.')
}

const pool = new Pool({ connectionString, max: 1 })
const client = await pool.connect()

try {
    const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8')
    await client.query('BEGIN')
    await client.query(schema)

    for (const organizador of organizadores) {
        await client.query(
            'INSERT INTO sports_organizers (id, data) VALUES ($1, $2::jsonb) ON CONFLICT (id) DO NOTHING',
            [organizador.id, JSON.stringify(organizador)]
        )
    }

    for (const evento of eventos) {
        await client.query(
            'INSERT INTO sports_events (id, organizer_id, data) VALUES ($1, $2, $3::jsonb) ON CONFLICT (id) DO NOTHING',
            [evento.id, evento.organizadorId, JSON.stringify(evento)]
        )
    }

    for (const quadra of quadras) {
        await client.query(
            `INSERT INTO sports_map_places
               (source_key, title, sport, sport_key, place_type, status, address, latitude, longitude)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (source_key) DO NOTHING`,
            [
                quadra.sourceKey,
                quadra.title,
                quadra.sport,
                quadra.sportKey,
                quadra.type,
                quadra.status,
                quadra.address,
                quadra.latitude,
                quadra.longitude,
            ]
        )
    }

    await client.query('COMMIT')
    console.log(`Database ready: ${organizadores.length} organizers, ${eventos.length} events, and ${quadras.length} map places seeded.`)
} catch (error) {
    await client.query('ROLLBACK')
    throw error
} finally {
    client.release()
    await pool.end()
}
