CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    preferences JSONB DEFAULT '{}',
    embedding vector(384) -- Using 384 dims for HuggingFace embeddings usually
);

-- Nodes (Stops, Stations, EV Chargers)
CREATE TABLE nodes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- bus_stop, metro_station, ev_station, POI
    geom GEOGRAPHY(Point, 4326) NOT NULL
);

-- Edges (Multi-modal graph edges)
CREATE TABLE edges (
    id SERIAL PRIMARY KEY,
    source_id INT NOT NULL REFERENCES nodes(id),
    target_id INT NOT NULL REFERENCES nodes(id),
    mode VARCHAR(50) NOT NULL, -- walk, bus, metro, ev
    distance FLOAT NOT NULL, -- meters
    time FLOAT NOT NULL, -- seconds
    cost FLOAT NOT NULL -- relative cost metric
);

-- Safety Zones (Heatmap of risk areas)
CREATE TABLE safety_zones (
    id SERIAL PRIMARY KEY,
    risk_level INT NOT NULL, -- 1-10 scale
    geom GEOGRAPHY(Polygon, 4326) NOT NULL
);

-- Routes
CREATE TABLE routes (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    route_data JSONB NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert comprehensive Mumbai transit data
INSERT INTO nodes (name, type, geom) VALUES
-- Metro Stations (Line 1: Versova-Andheri-Ghatkopar)
('Versova Metro', 'metro_station', ST_SetSRID(ST_MakePoint(72.8145, 19.1314), 4326)),
('D N Nagar Metro', 'metro_station', ST_SetSRID(ST_MakePoint(72.8235, 19.1256), 4326)),
('Azad Nagar Metro', 'metro_station', ST_SetSRID(ST_MakePoint(72.8302, 19.1198), 4326)),
('Andheri Metro', 'metro_station', ST_SetSRID(ST_MakePoint(72.8465, 19.1136), 4326)),
('Western Express Highway Metro', 'metro_station', ST_SetSRID(ST_MakePoint(72.8542, 19.1089), 4326)),
('Chakala Metro', 'metro_station', ST_SetSRID(ST_MakePoint(72.8621, 19.1034), 4326)),
('Airport Road Metro', 'metro_station', ST_SetSRID(ST_MakePoint(72.8698, 19.0987), 4326)),
('Marol Naka Metro', 'metro_station', ST_SetSRID(ST_MakePoint(72.8789, 19.0932), 4326)),
('Saki Naka Metro', 'metro_station', ST_SetSRID(ST_MakePoint(72.8876, 19.0878), 4326)),
('Asalpha Metro', 'metro_station', ST_SetSRID(ST_MakePoint(72.8965, 19.0823), 4326)),
('Jagruti Nagar Metro', 'metro_station', ST_SetSRID(ST_MakePoint(72.9054, 19.0769), 4326)),
('Ghatkopar Metro', 'metro_station', ST_SetSRID(ST_MakePoint(72.9143, 19.0714), 4326)),

-- Major Railway Stations
('CST Railway Station', 'train_station', ST_SetSRID(ST_MakePoint(72.8347, 18.9400), 4326)),
('Dadar Railway Station', 'train_station', ST_SetSRID(ST_MakePoint(72.8426, 19.0197), 4326)),
('Bandra Railway Station', 'train_station', ST_SetSRID(ST_MakePoint(72.8402, 19.0639), 4326)),
('Andheri Railway Station', 'train_station', ST_SetSRID(ST_MakePoint(72.8479, 19.1136), 4326)),
('Borivali Railway Station', 'train_station', ST_SetSRID(ST_MakePoint(72.8590, 19.2307), 4326)),
('Virar Railway Station', 'train_station', ST_SetSRID(ST_MakePoint(72.7926, 19.4559), 4326)),
('Thane Railway Station', 'train_station', ST_SetSRID(ST_MakePoint(72.9781, 19.2183), 4326)),
('Mulund Railway Station', 'train_station', ST_SetSRID(ST_MakePoint(72.9557, 19.1718), 4326)),
('Ghatkopar Railway Station', 'train_station', ST_SetSRID(ST_MakePoint(72.9081, 19.0856), 4326)),
('Vashi Railway Station', 'train_station', ST_SetSRID(ST_MakePoint(72.9986, 19.0771), 4326)),

-- Major Bus Depots/Stops
('Borivali Bus Depot', 'bus_stop', ST_SetSRID(ST_MakePoint(72.8590, 19.2307), 4326)),
('Dahisar Bus Depot', 'bus_stop', ST_SetSRID(ST_MakePoint(72.8591, 19.2502), 4326)),
('Andheri Bus Depot', 'bus_stop', ST_SetSRID(ST_MakePoint(72.8465, 19.1136), 4326)),
('Bandra Bus Depot', 'bus_stop', ST_SetSRID(ST_MakePoint(72.8360, 19.0596), 4326)),
('CST Bus Stand', 'bus_stop', ST_SetSRID(ST_MakePoint(72.8347, 18.9400), 4326)),
('Thane Bus Stand', 'bus_stop', ST_SetSRID(ST_MakePoint(72.9781, 19.2183), 4326)),
('Mulund Bus Depot', 'bus_stop', ST_SetSRID(ST_MakePoint(72.9557, 19.1718), 4326)),
('Ghatkopar Bus Depot', 'bus_stop', ST_SetSRID(ST_MakePoint(72.9081, 19.0856), 4326)),
('Vashi Bus Depot', 'bus_stop', ST_SetSRID(ST_MakePoint(72.9986, 19.0771), 4326)),

-- EV Charging Stations
('Bandra EV Station', 'ev_station', ST_SetSRID(ST_MakePoint(72.8360, 19.0596), 4326)),
('Andheri EV Station', 'ev_station', ST_SetSRID(ST_MakePoint(72.8465, 19.1136), 4326)),
('Thane EV Station', 'ev_station', ST_SetSRID(ST_MakePoint(72.9781, 19.2183), 4326));

-- Insert transit edges (connections between stations)
-- Metro Line 1 connections (approximate times and distances)
INSERT INTO edges (source_id, target_id, mode, distance, time, cost) VALUES
-- Metro connections (2-3 min between stations, ~2km apart)
(1, 2, 'metro', 1500, 180, 10), -- Versova to D N Nagar
(2, 3, 'metro', 1500, 180, 10), -- D N Nagar to Azad Nagar
(3, 4, 'metro', 2000, 180, 10), -- Azad Nagar to Andheri
(4, 5, 'metro', 1200, 180, 10), -- Andheri to Western Express Highway
(5, 6, 'metro', 1200, 180, 10), -- Western Express Highway to Chakala
(6, 7, 'metro', 1200, 180, 10), -- Chakala to Airport Road
(7, 8, 'metro', 1200, 180, 10), -- Airport Road to Marol Naka
(8, 9, 'metro', 1200, 180, 10), -- Marol Naka to Saki Naka
(9, 10, 'metro', 1200, 180, 10), -- Saki Naka to Asalpha
(10, 11, 'metro', 1200, 180, 10), -- Asalpha to Jagruti Nagar
(11, 12, 'metro', 1200, 180, 10), -- Jagruti Nagar to Ghatkopar

-- Railway connections (Central Line major stations)
(13, 14, 'train', 8000, 600, 15), -- CST to Dadar
(14, 15, 'train', 6000, 480, 15), -- Dadar to Bandra
(15, 16, 'train', 6000, 480, 15), -- Bandra to Andheri
(16, 17, 'train', 14000, 900, 20), -- Andheri to Borivali
(17, 18, 'train', 28000, 1800, 30), -- Borivali to Virar
(13, 19, 'train', 35000, 2100, 35), -- CST to Thane
(19, 20, 'train', 8000, 600, 15), -- Thane to Mulund
(20, 21, 'train', 10000, 720, 15), -- Mulund to Ghatkopar
(21, 22, 'train', 12000, 900, 20), -- Ghatkopar to Vashi

-- Bus connections (slower, more stops)
(23, 24, 'bus', 3000, 900, 8), -- Borivali to Dahisar
(24, 25, 'bus', 18000, 2700, 15), -- Dahisar to Andheri
(25, 26, 'bus', 7000, 1200, 10), -- Andheri to Bandra
(26, 27, 'bus', 14000, 1800, 12), -- Bandra to CST
(27, 28, 'bus', 35000, 3600, 25), -- CST to Thane
(28, 29, 'bus', 8000, 900, 10), -- Thane to Mulund
(29, 30, 'bus', 10000, 1200, 10), -- Mulund to Ghatkopar
(30, 31, 'bus', 12000, 1500, 12); -- Ghatkopar to Vashi

-- Index for spatial queries
CREATE INDEX idx_nodes_geom ON nodes USING GIST (geom);
CREATE INDEX idx_safety_zones_geom ON safety_zones USING GIST (geom);
