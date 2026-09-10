-- ============================================================
-- SQL Seed Script: seed_data.sql
-- Project: COP4331 LAMP Stack Demo (Contact Manager)
-- Description: Populates ContactsAppDB with initial Users and Contacts.
-- ============================================================

USE `ContactsAppDB`;

-- 1. Seed Sample Users
-- User 1: Rick Leinecker (Plaintext password for demonstration / testing)
INSERT INTO `Users` (`FirstName`, `LastName`, `Login`, `Password`) 
VALUES ('Rick', 'Leinecker', 'RickL', 'COP4331');

-- User 2: Sam Hill
INSERT INTO `Users` (`FirstName`, `LastName`, `Login`, `Password`) 
VALUES ('Sam', 'Hill', 'SamH', 'Test');

-- User 3: Rick Leinecker (MD5 hashed password example)
INSERT INTO `Users` (`FirstName`, `LastName`, `Login`, `Password`) 
VALUES ('Rick', 'Leinecker', 'RickL_MD5', '5832a71366768098cceb7095efb774f2');

-- User 4: Sam Hill (MD5 hashed password example)
INSERT INTO `Users` (`FirstName`, `LastName`, `Login`, `Password`) 
VALUES ('Sam', 'Hill', 'SamH_MD5', '0cbc6611f5540bd0809a388dc95a615b');


-- 2. Seed Initial Contacts
INSERT INTO `Contacts` (`FirstName`, `LastName`, `Email`, `Phone`, `UserID`) VALUES
('Alex', 'Morgan', 'alex.morgan@example.com', '407-555-0101', 1),
('Jordan', 'Lee', 'jordan.lee@example.com', '407-555-0102', 1),
('Taylor', 'Rivera', 'taylor.rivera@example.com', '407-555-0103', 2),
('Casey', 'Patel', 'casey.patel@example.com', '407-555-0104', 2);
