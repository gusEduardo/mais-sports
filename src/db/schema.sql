CREATE TABLE IF NOT EXISTS sports_organizers (
    id integer PRIMARY KEY,
    data jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS sports_events (
    id integer PRIMARY KEY,
    organizer_id integer REFERENCES sports_organizers (id),
    data jsonb NOT NULL
);
