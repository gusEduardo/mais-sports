import pool from "../db/pool.js";

function toPublicPlace(row) {
  return {
    id: `custom-${row.id}`,
    title: row.title,
    sport: row.sport,
    sportKey: row.sport,
    type: row.place_type,
    status: row.status,
    address: row.address,
    coords: [Number(row.latitude), Number(row.longitude)],
  };
}

const mapPlaceRepository = {
  async listar() {
    const { rows } = await pool.query(
      `SELECT id, title, sport, place_type, status, address, latitude, longitude
       FROM sports_map_places
       ORDER BY id`,
    );
    return rows.map(toPublicPlace);
  },

  async criar(place) {
    const { rows } = await pool.query(
      `INSERT INTO sports_map_places
         (title, sport, place_type, status, address, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, title, sport, place_type, status, address, latitude, longitude`,
      [
        place.title,
        place.sport,
        place.type,
        place.status,
        place.address,
        place.latitude,
        place.longitude,
      ],
    );
    return toPublicPlace(rows[0]);
  },
};

export default mapPlaceRepository;
