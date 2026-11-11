PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS apartment_photos;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS apartments;
DROP TABLE IF EXISTS clients;

CREATE TABLE apartments (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    address       TEXT    NOT NULL UNIQUE,
    rooms         INTEGER NOT NULL CHECK (rooms > 0),
    area          REAL    NOT NULL CHECK (area > 0),
    floor         INTEGER NOT NULL CHECK (floor >= 0),
    price_per_day REAL    NOT NULL CHECK (price_per_day > 0),
    status        TEXT    NOT NULL DEFAULT 'available'
                  CHECK (status IN ('available', 'maintenance')),
    description   TEXT,
    created_at    TEXT    NOT NULL DEFAULT (date('now'))
);

CREATE TABLE clients (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name  TEXT NOT NULL,
    phone      TEXT NOT NULL,
    email      TEXT,
    passport   TEXT UNIQUE,
    notes      TEXT,
    created_at TEXT NOT NULL DEFAULT (date('now'))
);

CREATE INDEX idx_apartments_status ON apartments(status);
CREATE INDEX idx_clients_full_name ON clients(full_name);
