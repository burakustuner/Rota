const express = require('express');
const db = require('../config/database');
const { requireDriver, requirePersonnel } = require('../middleware/auth');

const router = express.Router();

// Şoför konum gönderme (HTTP POST)
router.post('/update', requireDriver, async (req, res) => {
  try {
    const { latitude, longitude, accuracy, speed, heading } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude ve longitude gerekli'
      });
    }

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

    // Konum geçmişine kaydet
    await db.query(`
      INSERT INTO location_history (vehicle_id, driver_id, location, latitude, longitude, accuracy, speed, heading)
      VALUES ($1, $2, ST_SetSRID(ST_MakePoint($4, $3), 4326), $3, $4, $5, $6, $7)
    `, [vehicleId, req.user.id, latitude, longitude, accuracy || null, speed || null, heading || null]);

    // Güncel konumu güncelle
    await db.query(`
      INSERT INTO current_locations (vehicle_id, driver_id, location, latitude, longitude, accuracy, speed, heading, last_update, is_online)
      VALUES ($1, $2, ST_SetSRID(ST_MakePoint($4, $3), 4326), $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, true)
      ON CONFLICT (vehicle_id) 
      DO UPDATE SET 
        driver_id = $2,
        location = ST_SetSRID(ST_MakePoint($4, $3), 4326),
        latitude = $3,
        longitude = $4,
        accuracy = $5,
        speed = $6,
        heading = $7,
        last_update = CURRENT_TIMESTAMP,
        is_online = true
    `, [vehicleId, req.user.id, latitude, longitude, accuracy || null, speed || null, heading || null]);

    res.json({
      success: true,
      message: 'Konum başarıyla güncellendi',
      data: {
        vehicle_id: vehicleId,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Konum güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Konum güncellenirken hata oluştu'
    });
  }
});

// Personel için araç konumlarını getir
router.get('/vehicles/current', requirePersonnel, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        cl.vehicle_id,
        cl.latitude,
        cl.longitude,
        cl.accuracy,
        cl.speed,
        cl.heading,
        cl.last_update,
        cl.is_online,
        v.plate_number,
        v.vehicle_name,
        v.capacity,
        u.full_name as driver_name,
        u.phone as driver_phone
      FROM current_locations cl
      JOIN vehicles v ON cl.vehicle_id = v.id
      JOIN users u ON cl.driver_id = u.id
              JOIN personnel_vehicle_access pva ON pva.vehicle_id = v.id
        WHERE pva.personnel_id = $1
        AND v.status = 'active'
      ORDER BY cl.last_update DESC
    `, [req.user.id]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Araç konumları getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Araç konumları alınırken hata oluştu'
    });
  }
});

// Belirli bir aracın güncel konumunu getir
router.get('/vehicle/:vehicleId/current', requirePersonnel, async (req, res) => {
  try {
    const { vehicleId } = req.params;

    // Personelin bu aracı takip etme yetkisi var mı kontrol et
    const accessResult = await db.query(
      'SELECT 1 FROM personnel_vehicle_access WHERE personnel_id = $1 AND vehicle_id = $2',
      [req.user.id, vehicleId]
    );

    if (accessResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Bu aracı takip etme yetkiniz yok'
      });
    }

    const result = await db.query(`
      SELECT 
        cl.vehicle_id,
        cl.latitude,
        cl.longitude,
        cl.accuracy,
        cl.speed,
        cl.heading,
        cl.last_update,
        cl.is_online,
        v.plate_number,
        v.vehicle_name,
        v.capacity,
        u.full_name as driver_name,
        u.phone as driver_phone
      FROM current_locations cl
      JOIN vehicles v ON cl.vehicle_id = v.id
      JOIN users u ON cl.driver_id = u.id
      WHERE cl.vehicle_id = $1
    `, [vehicleId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Araç konumu bulunamadı'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Araç konumu getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Araç konumu alınırken hata oluştu'
    });
  }
});

// Belirli bir aracın konum geçmişini getir
router.get('/vehicle/:vehicleId/history', requirePersonnel, async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { 
      start_date = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Son 24 saat
      end_date = new Date().toISOString(),
      limit = 1000 
    } = req.query;

    // Personelin bu aracı takip etme yetkisi var mı kontrol et
    const accessResult = await db.query(
      'SELECT 1 FROM personnel_vehicle_access WHERE personnel_id = $1 AND vehicle_id = $2',
      [req.user.id, vehicleId]
    );

    if (accessResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Bu aracı takip etme yetkiniz yok'
      });
    }

    const result = await db.query(`
      SELECT 
        lh.id,
        lh.latitude,
        lh.longitude,
        lh.accuracy,
        lh.speed,
        lh.heading,
        lh.timestamp,
        v.plate_number,
        v.vehicle_name
      FROM location_history lh
      JOIN vehicles v ON lh.vehicle_id = v.id
      WHERE lh.vehicle_id = $1
        AND lh.timestamp >= $2
        AND lh.timestamp <= $3
      ORDER BY lh.timestamp ASC
      LIMIT $4
    `, [vehicleId, start_date, end_date, parseInt(limit)]);

    res.json({
      success: true,
      data: {
        vehicle_id: vehicleId,
        start_date,
        end_date,
        total_points: result.rows.length,
        locations: result.rows
      }
    });

  } catch (error) {
    console.error('Konum geçmişi getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Konum geçmişi alınırken hata oluştu'
    });
  }
});

// Şoför için kendi konum geçmişini getir
router.get('/my-history', requireDriver, async (req, res) => {
  try {
    const { 
      start_date = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      end_date = new Date().toISOString(),
      limit = 1000 
    } = req.query;

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

    const result = await db.query(`
      SELECT 
        id,
        latitude,
        longitude,
        accuracy,
        speed,
        heading,
        timestamp
      FROM location_history
      WHERE vehicle_id = $1
        AND timestamp >= $2
        AND timestamp <= $3
      ORDER BY timestamp ASC
      LIMIT $4
    `, [vehicleId, start_date, end_date, parseInt(limit)]);

    res.json({
      success: true,
      data: {
        vehicle_id: vehicleId,
        start_date,
        end_date,
        total_points: result.rows.length,
        locations: result.rows
      }
    });

  } catch (error) {
    console.error('Konum geçmişi getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Konum geçmişi alınırken hata oluştu'
    });
  }
});

// Şoför durumunu online/offline yap
router.post('/status', requireDriver, async (req, res) => {
  try {
    const { is_online } = req.body;

    if (typeof is_online !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'is_online boolean değeri olmalı'
      });
    }

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

    // Online/offline durumunu güncelle
    await db.query(`
      UPDATE current_locations 
      SET is_online = $1, last_update = CURRENT_TIMESTAMP
      WHERE vehicle_id = $2
    `, [is_online, vehicleId]);

    res.json({
      success: true,
      message: `Durum ${is_online ? 'online' : 'offline'} olarak güncellendi`,
      data: {
        vehicle_id: vehicleId,
        is_online,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Durum güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Durum güncellenirken hata oluştu'
    });
  }
});

module.exports = router; 