-- Migration 014: Add WhatsApp support for offline alerts
-- Adds phone_number to users table and recipient_phones to site_alert_configs

-- Add phone_number column to users table
ALTER TABLE users
ADD COLUMN phone_number VARCHAR(20) NULL AFTER email;

-- Set default phone number for existing users (to be changed via GUI later)
UPDATE users SET phone_number = '+254712345678' WHERE phone_number IS NULL;

-- Add index for quick lookup of users by phone number
CREATE INDEX idx_users_phone_number ON users(phone_number);

-- Add recipient_phones column to site_alert_configs for manual phone numbers
ALTER TABLE site_alert_configs 
ADD COLUMN recipient_phones JSON NULL AFTER recipient_emails;

-- Add comment explaining the columns
ALTER TABLE users 
MODIFY COLUMN phone_number VARCHAR(20) NULL COMMENT 'WhatsApp-enabled phone number in international format (+254...) for alert notifications';

ALTER TABLE site_alert_configs 
MODIFY COLUMN recipient_phones JSON NULL COMMENT 'JSON array of manual phone numbers (+ format) for WhatsApp alerts';
