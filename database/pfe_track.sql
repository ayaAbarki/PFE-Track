CREATE DATABASE IF NOT EXISTS pfe_track
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pfe_track;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  company_name VARCHAR(150) NOT NULL,
  position VARCHAR(150) NOT NULL,
  domain VARCHAR(100) NOT NULL,
  application_date DATE NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'To Contact',
  offer_url VARCHAR(255) NULL,
  contact_email VARCHAR(150) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_app_user (user_id),
  INDEX idx_app_status (status),
  CONSTRAINT fk_app_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  application_id INT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT NULL,
  due_date DATE NOT NULL,
  priority ENUM('Low','Medium','High') NOT NULL DEFAULT 'Medium',
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_task_user (user_id),
  INDEX idx_task_app (application_id),
  INDEX idx_task_due (due_date),
  CONSTRAINT fk_task_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_task_app FOREIGN KEY (application_id)
    REFERENCES applications(id) ON DELETE SET NULL
) ENGINE=InnoDB;