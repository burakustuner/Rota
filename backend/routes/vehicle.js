const express = require('express');
const db = require('../config/database');
const { requireDriver, requirePersonnel } = require('../middleware/auth');

const router = express.Router();

// Şoför için kendi aracını getir
router.get('/my-vehicle', requireDriver, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        v.*,
        u.full_name as driver_name,
        u.phone as driver_phone,
        u.email as driver_email
      FROM vehicles v
      JOIN users u ON v.driver_id = u.id
      WHERE v.driver_id = $1 AND v.status = $2
    `, [req.user.id, 'active']);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Aktif araç bulunamadı'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Araç getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Araç bilgileri alınırken hata oluştu'
    });
  }
});

// Personel için takip edebileceği araçları getir
router.get('/accessible', requirePersonnel, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        v.id,
        v.plate_number,
        v.vehicle_name,
        v.capacity,
        v.status,
        v.created_at,
        u.full_name as driver_name,
        u.phone as driver_phone,
        u.email as driver_email,
        cl.latitude,
        cl.longitude,
        cl.is_online,
        cl.last_update
      FROM vehicles v
      JOIN users u ON v.driver_id = u.id
              JOIN personnel_vehicle_access pva ON pva.vehicle_id = v.id
        LEFT JOIN current_locations cl ON cl.vehicle_id = v.id
        WHERE pva.personnel_id = $1
        AND v.status = 'active'
      ORDER BY v.vehicle_name
    `, [req.user.id]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Araçları getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Araç listesi alınırken hata oluştu'
    });
  }
});

// Belirli bir aracın detaylarını getir
router.get('/:vehicleId', requirePersonnel, async (req, res) => {
  try {
    const { vehicleId } = req.params;

    // Personelin bu aracı görme yetkisi var mı kontrol et
    const accessResult = await db.query(
              'SELECT 1 FROM personnel_vehicle_access WHERE personnel_id = $1 AND vehicle_id = $2',
      [req.user.id, vehicleId]
    );

    if (accessResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Bu araç bilgilerini görme yetkiniz yok'
      });
    }

    const result = await db.query(`
      SELECT 
        v.*,
        u.full_name as driver_name,
        u.phone as driver_phone,
        u.email as driver_email,
        cl.latitude,
        cl.longitude,
        cl.accuracy,
        cl.speed,
        cl.heading,
        cl.is_online,
        cl.last_update
      FROM vehicles v
      JOIN users u ON v.driver_id = u.id
      LEFT JOIN current_locations cl ON cl.vehicle_id = v.id
      WHERE v.id = $1
    `, [vehicleId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Araç bulunamadı'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Araç detayı getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Araç detayları alınırken hata oluştu'
    });
  }
});

// Aracın günlük istatistiklerini getir
router.get('/:vehicleId/stats', requirePersonnel, async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { date = new Date().toISOString().split('T')[0] } = req.query;

    // Personelin bu aracı görme yetkisi var mı kontrol et
    const accessResult = await db.query(
      'SELECT 1 FROM personnel_vehicle_access WHERE personnel_id = $1 AND vehicle_id = $2',
      [req.user.id, vehicleId]
    );

    if (accessResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Bu araç istatistiklerini görme yetkiniz yok'
      });
    }

    const startDate = new Date(date);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    // Günün istatistiklerini hesapla
    const statsResult = await db.query(`
      SELECT 
        COUNT(*) as total_points,
        MIN(timestamp) as first_location,
        MAX(timestamp) as last_location,
        MAX(speed) as max_speed,
        AVG(speed) as avg_speed,
        SUM(
          CASE 
            WHEN LAG(latitude) OVER (ORDER BY timestamp) IS NOT NULL 
            THEN ST_Distance(
              ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
              ST_SetSRID(ST_MakePoint(
                LAG(longitude) OVER (ORDER BY timestamp), 
                LAG(latitude) OVER (ORDER BY timestamp)
              ), 4326)::geography
            ) / 1000.0
            ELSE 0 
          END
        ) as total_distance_km
      FROM location_history
      WHERE vehicle_id = $1
        AND timestamp >= $2
        AND timestamp < $3
    `, [vehicleId, startDate.toISOString(), endDate.toISOString()]);

    // Online durumu istatistikleri
    const onlineStatsResult = await db.query(`
      SELECT 
        EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp))) / 3600 as active_hours
      FROM location_history
      WHERE vehicle_id = $1
        AND timestamp >= $2
        AND timestamp < $3
    `, [vehicleId, startDate.toISOString(), endDate.toISOString()]);

    const stats = statsResult.rows[0];
    const onlineStats = onlineStatsResult.rows[0];

    res.json({
      success: true,
      data: {
        vehicle_id: vehicleId,
        date: date,
        total_location_points: parseInt(stats.total_points),
        first_location_time: stats.first_location,
        last_location_time: stats.last_location,
        max_speed_kmh: parseFloat(stats.max_speed) || 0,
        avg_speed_kmh: parseFloat(stats.avg_speed) || 0,
        total_distance_km: parseFloat(stats.total_distance_km) || 0,
        active_hours: parseFloat(onlineStats.active_hours) || 0
      }
    });

  } catch (error) {
    console.error('Araç istatistikleri getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Araç istatistikleri alınırken hata oluştu'
    });
  }
});

// Şoförün günlük özet istatistiklerini getir
router.get('/my-vehicle/stats', requireDriver, async (req, res) => {
  try {
    const { date = new Date().toISOString().split('T')[0] } = req.query;

    // Şoförün aracını bul
    const vehicleResult = await db.query(
      'SELECT id FROM vehicles WHERE driver_id = $1 AND status = $2',
      [req.user.id, 'active']
    );

    if (vehicleResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Aktif araç bulunamadı'
      });
    }

    const vehicleId = vehicleResult.rows[0].id;
    const startDate = new Date(date);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    const statsResult = await db.query(`
      SELECT 
        COUNT(*) as total_points,
        MIN(timestamp) as first_location,
        MAX(timestamp) as last_location,
        MAX(speed) as max_speed,
        AVG(speed) as avg_speed,
        SUM(
          CASE 
            WHEN LAG(latitude) OVER (ORDER BY timestamp) IS NOT NULL 
            THEN ST_Distance(
              ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
              ST_SetSRID(ST_MakePoint(
                LAG(longitude) OVER (ORDER BY timestamp), 
                LAG(latitude) OVER (ORDER BY timestamp)
              ), 4326)::geography
            ) / 1000.0
            ELSE 0 
          END
        ) as total_distance_km
      FROM location_history
      WHERE vehicle_id = $1
        AND timestamp >= $2
        AND timestamp < $3
    `, [vehicleId, startDate.toISOString(), endDate.toISOString()]);

    const stats = statsResult.rows[0];

    res.json({
      success: true,
      data: {
        vehicle_id: vehicleId,
        date: date,
        total_location_points: parseInt(stats.total_points),
        first_location_time: stats.first_location,
        last_location_time: stats.last_location,
        max_speed_kmh: parseFloat(stats.max_speed) || 0,
        avg_speed_kmh: parseFloat(stats.avg_speed) || 0,
        total_distance_km: parseFloat(stats.total_distance_km) || 0
      }
    });

  } catch (error) {
    console.error('Günlük istatistik getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Günlük istatistikler alınırken hata oluştu'
    });
  }
});

module.exports = router; 