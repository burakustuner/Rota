-- PostGIS extension'ını etkinleştir
CREATE EXTENSION IF NOT EXISTS postgis;

-- Kullanıcı tipleri enum
CREATE TYPE user_type AS ENUM ('driver', 'personnel');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'blocked');
CREATE TYPE vehicle_status AS ENUM ('active', 'maintenance', 'inactive');

-- Kullanıcılar tablosu
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    oneid_user_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    user_type user_type NOT NULL,
    status user_status DEFAULT 'active',
    profile_photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Servis araçları tablosu
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plate_number VARCHAR(20) UNIQUE NOT NULL,
    vehicle_name VARCHAR(255) NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 30,
    driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status vehicle_status DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Konum geçmişi tablosu (PostGIS Point kullanarak)
CREATE TABLE location_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    location GEOMETRY(POINT, 4326) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(10, 2),
    speed DECIMAL(10, 2),
    heading DECIMAL(5, 2),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Güncel konum tablosu (performans için)
CREATE TABLE current_locations (
    vehicle_id UUID PRIMARY KEY REFERENCES vehicles(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    location GEOMETRY(POINT, 4326) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy DECIMAL(10, 2),
    speed DECIMAL(10, 2),
    heading DECIMAL(5, 2),
    last_update TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_online BOOLEAN DEFAULT true
);

-- Personel-araç takip yetkisi tablosu
CREATE TABLE personnel_vehicle_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    personnel_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(personnel_id, vehicle_id)
);

-- Rotalar tablosu
CREATE TABLE routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    route_name VARCHAR(255) NOT NULL,
    route_points GEOMETRY(LINESTRING, 4326),
    estimated_duration INTEGER, -- dakika
    estimated_distance DECIMAL(10, 2), -- km
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- İndeksler
CREATE INDEX idx_location_history_vehicle_id ON location_history(vehicle_id);
CREATE INDEX idx_location_history_timestamp ON location_history(timestamp DESC);
CREATE INDEX idx_location_history_geom ON location_history USING GIST(location);
CREATE INDEX idx_current_locations_geom ON current_locations USING GIST(location);
CREATE INDEX idx_users_oneid ON users(oneid_user_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_vehicles_driver ON vehicles(driver_id);
CREATE INDEX idx_vehicles_plate ON vehicles(plate_number);

-- Trigger fonksiyonu - updated_at otomatik güncelleme
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggerlar
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_routes_updated_at BEFORE UPDATE ON routes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Örnek veriler
INSERT INTO users (oneid_user_id, email, full_name, phone, user_type) VALUES
('oneid_driver_1', 'sofor1@example.com', 'Ahmet Yılmaz', '+905551234567', 'driver'),
('oneid_driver_2', 'sofor2@example.com', 'Mehmet Kaya', '+905551234568', 'driver'),
('oneid_driver_3', 'sofor3@example.com', 'Ali Demir', '+905551234569', 'driver'),
  ('oneid_personnel_1', 'personel1@example.com', 'Ayşe Özkan', '+905551234570', 'personnel'),
  ('oneid_personnel_2', 'personel2@example.com', 'Fatma Çelik', '+905551234571', 'personnel');

INSERT INTO vehicles (plate_number, vehicle_name, capacity, driver_id) VALUES
('34ABC123', 'Servis 1', 30, (SELECT id FROM users WHERE email = 'sofor1@example.com')),
('34DEF456', 'Servis 2', 25, (SELECT id FROM users WHERE email = 'sofor2@example.com')),
('34GHI789', 'Servis 3', 35, (SELECT id FROM users WHERE email = 'sofor3@example.com'));

-- Personellere araç takip yetkisi ver
INSERT INTO personnel_vehicle_access (personnel_id, vehicle_id)
SELECT 
  p.id as personnel_id,
  v.id as vehicle_id
FROM users p
CROSS JOIN vehicles v
WHERE p.user_type = 'personnel'; 