const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const db = require('../config/database');

const router = express.Router();

// Test için basit giriş (OneID olmadan)
router.post('/test/login', async (req, res) => {
  try {
    const { email, user_type = 'driver' } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email gerekli'
      });
    }

    // Test kullanıcısı oluştur/bul
    let userResult = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    let user;
    if (userResult.rows.length === 0) {
      // Yeni test kullanıcısı oluştur
      const insertResult = await db.query(`
        INSERT INTO users (email, full_name, user_type, status, oneid_user_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        email,
        'Test User',
        user_type,
        'active',
        'test_' + Date.now() // Test için dummy oneid_user_id
      ]);
      user = insertResult.rows[0];
    } else {
      user = userResult.rows[0];
    }

    // JWT token oluştur
    const jwtToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        user_type: user.user_type,
        oneid_user_id: user.oneid_user_id
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Şoför ise araç bilgisini de getir
    let vehicle = null;
    if (user.user_type === 'driver') {
      const vehicleResult = await db.query(
        'SELECT * FROM vehicles WHERE driver_id = $1 AND status = $2',
        [user.id, 'active']
      );
      vehicle = vehicleResult.rows[0] || null;
    }

    res.json({
      success: true,
      message: 'Test girişi başarılı',
      data: {
        token: jwtToken,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          phone: user.phone,
          user_type: user.user_type,
          profile_photo_url: user.profile_photo_url
        },
        vehicle: vehicle
      }
    });

  } catch (error) {
    console.error('Test giriş hatası:', error);
    res.status(500).json({
      success: false,
      message: 'Test girişi sırasında hata oluştu'
    });
  }
});

// OneID ile giriş
router.post('/oneid/login', async (req, res) => {
  try {
    const { code, redirect_uri } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Authorization code gerekli'
      });
    }

    // OneID'den token al
    const tokenResponse = await axios.post(`${process.env.ONEID_BASE_URL}/oauth/token`, {
      grant_type: 'authorization_code',
      client_id: process.env.ONEID_CLIENT_ID,
      client_secret: process.env.ONEID_CLIENT_SECRET,
      code: code,
      redirect_uri: redirect_uri || process.env.ONEID_REDIRECT_URI
    });

    const { access_token } = tokenResponse.data;

    // OneID'den kullanıcı bilgilerini al
    const userResponse = await axios.get(`${process.env.ONEID_BASE_URL}/api/user`, {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    const oneidUser = userResponse.data;

    // Kullanıcıyı veritabanında ara
    let userResult = await db.query(
      'SELECT * FROM users WHERE oneid_user_id = $1',
      [oneidUser.id]
    );

    let user;
    if (userResult.rows.length === 0) {
      // Yeni kullanıcı, kaydet
      const insertResult = await db.query(`
        INSERT INTO users (oneid_user_id, email, full_name, phone, user_type)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        oneidUser.id,
        oneidUser.email,
        oneidUser.name || oneidUser.full_name,
        oneidUser.phone,
        'personnel' // Varsayılan olarak personel, admin tarafından değiştirilebilir
      ]);
      user = insertResult.rows[0];
    } else {
      user = userResult.rows[0];
      
      // Kullanıcı aktif mi kontrol et
      if (user.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Hesabınız aktif değil, lütfen yönetici ile iletişime geçin'
        });
      }
    }

    // JWT token oluştur
    const jwtToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        user_type: user.user_type,
        oneid_user_id: user.oneid_user_id
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    // Şoför ise araç bilgisini de getir
    let vehicle = null;
    if (user.user_type === 'driver') {
      const vehicleResult = await db.query(
        'SELECT * FROM vehicles WHERE driver_id = $1 AND status = $2',
        [user.id, 'active']
      );
      vehicle = vehicleResult.rows[0] || null;
    }

    res.json({
      success: true,
      message: 'Giriş başarılı',
      data: {
        token: jwtToken,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          phone: user.phone,
          user_type: user.user_type,
          profile_photo_url: user.profile_photo_url
        },
        vehicle: vehicle
      }
    });

  } catch (error) {
    console.error('OneID giriş hatası:', error);
    
    if (error.response) {
      return res.status(400).json({
        success: false,
        message: 'OneID servisi ile iletişim hatası'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Giriş sırasında hata oluştu'
    });
  }
});

// Token yenileme
router.post('/refresh', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token gerekli'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });
    
    // Kullanıcının hala aktif olup olmadığını kontrol et
    const userResult = await db.query(
      'SELECT * FROM users WHERE id = $1 AND status = $2',
      [decoded.id, 'active']
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Geçersiz kullanıcı'
      });
    }

    const user = userResult.rows[0];

    // Yeni token oluştur
    const newToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        user_type: user.user_type,
        oneid_user_id: user.oneid_user_id
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      success: true,
      data: {
        token: newToken
      }
    });

  } catch (error) {
    console.error('Token yenileme hatası:', error);
    res.status(401).json({
      success: false,
      message: 'Token yenilenemedi'
    });
  }
});

// OneID authorize URL'i oluştur
router.get('/oneid/authorize-url', (req, res) => {
  const { redirect_uri, state } = req.query;
  
  const authorizeUrl = new URL(`${process.env.ONEID_BASE_URL}/oauth/authorize`);
  authorizeUrl.searchParams.append('response_type', 'code');
  authorizeUrl.searchParams.append('client_id', process.env.ONEID_CLIENT_ID);
  authorizeUrl.searchParams.append('redirect_uri', redirect_uri || process.env.ONEID_REDIRECT_URI);
  authorizeUrl.searchParams.append('scope', 'read:user');
  
  if (state) {
    authorizeUrl.searchParams.append('state', state);
  }

  res.json({
    success: true,
    data: {
      authorize_url: authorizeUrl.toString()
    }
  });
});

module.exports = router; 