const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Erişim token gerekli'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Kullanıcının hala aktif olup olmadığını kontrol et
    const userResult = await db.query(
      'SELECT id, email, full_name, user_type, status FROM users WHERE id = $1 AND status = $2',
      [decoded.id, 'active']
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Geçersiz veya deaktif kullanıcı'
      });
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      user_type: decoded.user_type,
      full_name: userResult.rows[0].full_name
    };

    next();
  } catch (error) {
    console.error('Token doğrulama hatası:', error);
    return res.status(403).json({
      success: false,
      message: 'Geçersiz token'
    });
  }
};

// Sadece şoförlerin erişebileceği endpointler için
const requireDriver = (req, res, next) => {
  if (req.user.user_type !== 'driver') {
    return res.status(403).json({
      success: false,
      message: 'Bu işlem için şoför yetkisi gerekli'
    });
  }
  next();
};

// Sadece personelin erişebileceği endpointler için
const requirePersonnel = (req, res, next) => {
  if (req.user.user_type !== 'personnel') {
    return res.status(403).json({
      success: false,
      message: 'Bu işlem için personel yetkisi gerekli'
    });
  }
  next();
};

module.exports = {
  authenticateToken,
  requireDriver,
  requirePersonnel
}; 