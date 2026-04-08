-- Add face descriptor column to users table
ALTER TABLE users ADD COLUMN faceDescriptor JSON NULL AFTER fingerprintTemplate;