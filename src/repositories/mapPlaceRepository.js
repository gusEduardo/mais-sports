import pool from "../db/pool.js";

function toPublicPlace(row) {
  return {
    id: `db-${row.id}`,
    sourceKey: row.source_key,
    title: row.title,
    sport: row.sport,
    sportKey: row.sport_key,
    type: row.place_type,
    status: row.status,
    address: row.address,
    coords: [Number(row.latitude), Number(row.longitude)],
  };
}

const mapPlaceRepository = {
  async listar() {
    const { rows } = await pool.query(
      `SELECT id, source_key, title, sport, sport_key, place_type, status, address, latitude, longitude
       FROM sports_map_places
       ORDER BY id`,
    );
    return rows.map(toPublicPlace);
  },

  async criar(place) {
    const { rows } = await pool.query(
      `INSERT INTO sports_map_places
         (title, sport, sport_key, place_type, status, address, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, source_key, title, sport, sport_key, place_type, status, address, latitude, longitude`,
      [
        place.title,
        place.sport,
        place.sportKey,
        place.type,
        place.status,
        place.address,
        place.latitude,
        place.longitude,
      ],
    );
    return toPublicPlace(rows[0]);
  },

  async atualizar(id, place) {
    const { rows } = await pool.query(
      `UPDATE sports_map_places
       SET title = $1, sport = $2, sport_key = $3, place_type = $4, status = $5,
           address = $6, latitude = $7, longitude = $8
       WHERE id = $9
       RETURNING id, source_key, title, sport, sport_key, place_type, status, address, latitude, longitude`,
      [
        place.title,
        place.sport,
        place.sportKey,
        place.type,
        place.status,
        place.address,
        place.latitude,
        place.longitude,
        id,
      ],
    );
    return rows[0] ? toPublicPlace(rows[0]) : null;
  },

  async remover(id) {
    const { rows } = await pool.query(
      `DELETE FROM sports_map_places
       WHERE id = $1
       RETURNING id`,
      [id],
    );
    return Boolean(rows[0]);
  },
};

export default mapPlaceRepository;
