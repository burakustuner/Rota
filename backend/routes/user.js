const express = require('express');
const db = require('../config/database');

const router = express.Router();

// Kullanıcı profil bilgilerini getir
router.get('/profile', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, email, full_name, phone, user_type, profile_photo_url, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Profil getirme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Profil bilgileri alınırken hata oluştu'
    });
  }
});

// Kullanıcı profil bilgilerini güncelle
router.put('/profile', async (req, res) => {
  try {
    const { full_name, phone, profile_photo_url } = req.body;

    const result = await db.query(`
      UPDATE users 
      SET full_name = COALESCE($1, full_name),
          phone = COALESCE($2, phone),
          profile_photo_url = COALESCE($3, profile_photo_url),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING id, email, full_name, phone, user_type, profile_photo_url, updated_at
    `, [full_name, phone, profile_photo_url, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    res.json({
      success: true,
      message: 'Profil başarıyla güncellendi',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Profil güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Profil güncellenirken hata oluştu'
    });
  }
});

// Kullanıcının cihaz bilgilerini güncelle (push notification için)
router.post('/device', async (req, res) => {
  try {
    const { device_token, device_type, app_version } = req.body;

    if (!device_token) {
      return res.status(400).json({
        success: false,
        message: 'Device token gerekli'
      });
    }

    // Bu endpoint gelecekte device_info tablosu için kullanılabilir
    // Şimdilik Redis'e kaydetmek yeterli olacak
    const redisClient = require('../config/redis');
    
    await redisClient.setEx(
      `device:${req.user.id}`, 
      30 * 24 * 60 * 60, // 30 gün
      JSON.stringify({
        device_token,
        device_type,
        app_version,
        updated_at: new Date().toISOString()
      })
    );

    res.json({
      success: true,
      message: 'Cihaz bilgileri güncellendi'
    });

  } catch (error) {
    console.error('Cihaz bilgisi güncelleme hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Cihaz bilgileri güncellenirken hata oluştu'
    });
  }
});

module.exports = router; 