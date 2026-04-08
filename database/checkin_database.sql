-- ===================================
-- BASE DE DATOS CHECKIN - MYSQL
-- Proyecto: QR Attendance System
-- Fecha: 2026-04-04
-- ===================================

-- Crear base de datos
CREATE DATABASE IF NOT EXISTS checkin_db;
USE checkin_db;

-- ===================================
-- TABLA: USUARIOS
-- ===================================
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  fullName VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user', 'supervisor') NOT NULL DEFAULT 'user',
  password VARCHAR(255),
  photo LONGBLOB,
  photoUrl VARCHAR(500),
  exitLockUntil DATETIME NULL,
  fingerprintTemplate LONGBLOB,
  faceDescriptor JSON NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_role (role),
  INDEX idx_exitLock (exitLockUntil)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================
-- TABLA: REGISTROS DE ASISTENCIA
-- ===================================
CREATE TABLE IF NOT EXISTS attendance_records (
  id VARCHAR(255) PRIMARY KEY,
  userId VARCHAR(255) NOT NULL,
  timestamp DATETIME NOT NULL,
  type ENUM('entry', 'exit') NOT NULL,
  photo LONGBLOB,
  photoUrl VARCHAR(500),
  observations TEXT,
  method ENUM('qr', 'fingerprint', 'face', 'manual') DEFAULT 'qr',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_userId (userId),
  INDEX idx_timestamp (timestamp),
  INDEX idx_type (type),
  INDEX idx_method (method)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================
-- TABLA: MENSAJES
-- ===================================
CREATE TABLE IF NOT EXISTS messages (
  id VARCHAR(255) PRIMARY KEY,
  userId VARCHAR(255) NOT NULL,
  userName VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  timestamp DATETIME NOT NULL,
  status ENUM('new', 'read') DEFAULT 'new',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_userId (userId),
  INDEX idx_status (status),
  INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================
-- TABLA: CONFIGURACIÓN DE LA APP
-- ===================================
CREATE TABLE IF NOT EXISTS app_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  appMode ENUM('corporate', 'school') DEFAULT 'corporate',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================
-- TABLA: REPORTES
-- ===================================
CREATE TABLE IF NOT EXISTS reports (
  id VARCHAR(255) PRIMARY KEY,
  userId VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_userId (userId),
  INDEX idx_status (status),
  INDEX idx_createdAt (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================
-- TABLA: CÓDIGOS QR
-- ===================================
CREATE TABLE IF NOT EXISTS qr_codes (
  id VARCHAR(255) PRIMARY KEY,
  userId VARCHAR(255) NOT NULL,
  qrData TEXT NOT NULL,
  expiresAt DATETIME,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_userId (userId),
  INDEX idx_expiresAt (expiresAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================
-- TABLA: HISTORIAL DE ACTIVIDADES
-- ===================================
CREATE TABLE IF NOT EXISTS activity_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId VARCHAR(255),
  action VARCHAR(255) NOT NULL,
  details TEXT,
  ipAddress VARCHAR(45),
  userAgent TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_userId (userId),
  INDEX idx_action (action),
  INDEX idx_createdAt (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===================================
-- DATOS INICIALES
-- ===================================

-- Insertar configuración por defecto
INSERT INTO app_settings (appMode) VALUES ('corporate');

-- Insertar usuario administrador por defecto
INSERT INTO users (id, fullName, role, password)
VALUES ('admin-001', 'Administrador', 'admin', SHA2('admin', 256))
ON DUPLICATE KEY UPDATE id=id;
