-- Add face descriptor column to users table for facial recognition
-- This script adds the faceDescriptor column to store facial recognition data

USE checkin_db;

-- Add faceDescriptor column if it doesn't exist
SET @sql = (
    SELECT IF(
        EXISTS(
            SELECT * FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'users'
            AND COLUMN_NAME = 'faceDescriptor'
        ),
        'SELECT "faceDescriptor column already exists"',
        'ALTER TABLE users ADD COLUMN faceDescriptor JSON NULL AFTER fingerprintTemplate'
    )
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify the column was added
DESCRIBE users;