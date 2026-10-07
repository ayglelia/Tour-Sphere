CREATE DATABASE IF NOT EXISTS travelcore CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE travelcore;

CREATE TABLE users (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  full_name      VARCHAR(120) NOT NULL,
  email          VARCHAR(160) NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NOT NULL,
  role           ENUM('Admin','Facilities Specialist','Front Desk / Security','Legal Counsel',
                       'Compliance Manager','Contract Administrator','General Staff',
                       'Records Officer','Approver (Director/VP)','External Auditor') NOT NULL,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE facilities (
  id        VARCHAR(10) PRIMARY KEY,
  name      VARCHAR(150) NOT NULL,
  type      VARCHAR(60)  NOT NULL,
  capacity  VARCHAR(20)             
);

CREATE TABLE bookings (
  id            VARCHAR(10) PRIMARY KEY,
  facility      VARCHAR(150) NOT NULL,     
  purpose       VARCHAR(200) NOT NULL,
  requested_by  VARCHAR(100) NOT NULL,
  date          DATE NOT NULL,
  start_time    TIME NOT NULL,
  end_time      TIME NOT NULL,
  status        ENUM('Pending','Approved','Rejected','Checked-in','Completed') NOT NULL DEFAULT 'Pending',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE visitors (
  id        VARCHAR(10) PRIMARY KEY,
  name      VARCHAR(120) NOT NULL,
  purpose   VARCHAR(200) NOT NULL,
  host      VARCHAR(100) NOT NULL,
  company   VARCHAR(150),
  date      DATE NOT NULL,
  status    ENUM('Registered','Checked-in','Checked-out') NOT NULL DEFAULT 'Registered',
  notified  TINYINT(1) NOT NULL DEFAULT 0
);

CREATE TABLE blacklist (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  name    VARCHAR(120) NOT NULL,
  reason  VARCHAR(200) NOT NULL,
  date    DATE NOT NULL
);

CREATE TABLE documents (
  id                VARCHAR(10) PRIMARY KEY,
  title             VARCHAR(200) NOT NULL,
  category          VARCHAR(80)  NOT NULL,   
  owner             VARCHAR(100) NOT NULL,
  date_added        DATE NOT NULL,
  version           VARCHAR(20) NOT NULL DEFAULT 'v1.0',
  retention_years   INT NOT NULL,
  status            ENUM('Active','Archived','Disposed') NOT NULL DEFAULT 'Active'
);

CREATE TABLE document_versions (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  document_id  VARCHAR(10) NOT NULL,
  version      VARCHAR(20) NOT NULL,
  edited_by    VARCHAR(100) NOT NULL,
  edited_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  note         VARCHAR(255),
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE TABLE retention_schedule (
  type   VARCHAR(80) PRIMARY KEY,   
  years  INT NOT NULL
);

CREATE TABLE legal_cases (
  id                VARCHAR(10) PRIMARY KEY,
  title             VARCHAR(200) NOT NULL,
  type              VARCHAR(60)  NOT NULL,
  filed             DATE NOT NULL,
  deadline          DATE NOT NULL,
  status            ENUM('Open','Under Review','Resolved') NOT NULL DEFAULT 'Open',
  related_contract  VARCHAR(10)               
);

CREATE TABLE correspondence (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  date        DATE NOT NULL,
  with_party  VARCHAR(150) NOT NULL,          
  subject     VARCHAR(200) NOT NULL,
  case_id     VARCHAR(10),
  FOREIGN KEY (case_id) REFERENCES legal_cases(id) ON DELETE SET NULL
);

CREATE TABLE contracts (
  id              VARCHAR(10) PRIMARY KEY,
  title           VARCHAR(200) NOT NULL,
  party           VARCHAR(150) NOT NULL,
  type            VARCHAR(60)  NOT NULL,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  value           VARCHAR(30),                
  status          ENUM('Draft','Active','Expiring Soon','Renewed','Terminated') NOT NULL DEFAULT 'Draft',
  signed          TINYINT(1) NOT NULL DEFAULT 0,
  approval_level  TINYINT NOT NULL DEFAULT 0,
  legal_hold      TINYINT(1) NOT NULL DEFAULT 0,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE qr_tokens (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  entity_type  ENUM('facility','visitor','document','contract') NOT NULL,
  entity_id    VARCHAR(10) NOT NULL,
  token        VARCHAR(64) NOT NULL UNIQUE,
  status       ENUM('active','revoked') NOT NULL DEFAULT 'active',
  expires_at   DATETIME,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_log (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  t_label    VARCHAR(10) NOT NULL,     
  message    VARCHAR(255) NOT NULL,
  logged_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO facilities (id, name, type, capacity) VALUES
  ('FA-01','Tour Briefing Room','Meeting Room','12'),
  ('FA-02','Client Consultation Lounge','Client Meeting','6'),
  ('FA-03','Tour Guide Training Hall','Training','25'),
  ('FA-04','Agency Tour Coaster (Toyota Coaster)','Vehicle','28'),
  ('FA-05','Passport & Travel Document Vault','Secure Storage','Restricted');

INSERT INTO bookings (id, facility, purpose, requested_by, date, start_time, end_time, status) VALUES
  ('BK-101','Tour Briefing Room','Partner airline route briefing','M. Santos','2026-07-19','09:00','11:00','Checked-in'),
  ('BK-102','Client Consultation Lounge','Europe tour package consultation','R. Dizon','2026-07-19','13:00','14:00','Approved'),
  ('BK-103','Tour Guide Training Hall','New tour guide orientation','HR — A. Cruz','2026-07-21','08:30','12:00','Pending'),
  ('BK-104','Agency Tour Coaster (Toyota Coaster)','Airport pickup — Boracay group tour','T. Reyes','2026-07-20','05:00','08:00','Approved');

INSERT INTO visitors (id, name, purpose, host, company, date, status, notified) VALUES
  ('VS-210','Liza Gomez','Tour package contract signing','M. Santos','Client — Europe Tour Group','2026-07-19','Checked-in',1),
  ('VS-211','Paolo Reyes','Hotel partnership meeting','R. Dizon','Boracay Sands Resort','2026-07-19','Registered',0),
  ('VS-212','Anna Villanueva','Walk-in tour package inquiry','Front Desk','—','2026-07-18','Checked-out',1);

INSERT INTO documents (id, title, category, owner, date_added, version, retention_years, status) VALUES
  ('DC-338','Client Travel Waiver & Insurance — Boracay Group 22-A','Client Travel Docs','M. Santos','2021-08-02','v1.0',5,'Active'),
  ('DC-339','Hotel Partnership Agreement — Boracay Sands Resort','Supplier Agreement','R. Dizon','2023-02-14','v2.1',5,'Active'),
  ('DC-340','Q2 Tour Package Sales & Revenue Report 2026','Financial Record','Finance Dept.','2026-04-10','v1.0',10,'Active'),
  ('DC-341','Employment Contract — J. Cruz (Tour Consultant)','HR Record','HR Dept.','2019-06-20','v1.0',7,'Active'),
  ('DC-342','DOT & IATA Accreditation Filing 2026','Compliance Filing','Compliance Officer','2026-01-15','v1.0',3,'Active');

INSERT INTO retention_schedule (type, years) VALUES
  ('Client Travel Docs',5),
  ('Supplier Agreement',5),
  ('Financial Record',10),
  ('HR Record',7),
  ('Compliance Filing',3),
  ('Visitor Logs',1);

INSERT INTO legal_cases (id, title, type, filed, deadline, status, related_contract) VALUES
  ('LC-16','Refund dispute — cancelled Boracay tour package BK-071','Client Dispute','2026-06-02','2026-07-25','Under Review','CT-081'),
  ('LC-17','Supplier breach — hotel overbooking incident','Supplier Dispute','2026-05-18','2026-08-01','Open','CT-084'),
  ('LC-18','Data privacy inquiry — client passport records','Compliance','2026-07-10','2026-07-30','Open','—');

INSERT INTO contracts (id, title, party, type, start_date, end_date, value, status, signed, approval_level, legal_hold) VALUES
  ('CT-081','Partner Agreement — Meridian Travel Consortium','Meridian Travel Consortium','Partner MOU','2024-01-01','2026-08-05','₱1,250,000','Active',1,2,1),
  ('CT-084','Hotel Partnership Contract — Boracay Sands Resort','Boracay Sands Resort','Supplier Agreement','2023-03-01','2026-07-28','₱480,000','Active',1,2,1),
  ('CT-085','Employment Contract — J. Cruz (Tour Consultant)','J. Cruz','Employment','2019-06-20','2027-06-20','—','Active',1,1,0),
  ('CT-086','Airline Ticketing Agreement — SkyPacific Airlines','SkyPacific Airlines','Airline Ticketing Agreement','2026-01-01','2028-01-01','₱900,000','Active',1,2,0),
  ('CT-087','Tour Package Agreement — Boracay Group 22-A','Group 22-A (14 pax)','Client Package','2026-07-01','2026-07-01','₱620,000','Draft',0,0,0),
  ('CT-088','Former Land Transport Contract — QuickCab Transport','QuickCab Transport','Supplier Agreement','2021-01-01','2025-12-31','₱150,000','Terminated',1,2,0);

INSERT INTO correspondence (date, with_party, subject, case_id) VALUES
  ('2026-07-11','Meridian Travel Consortium (Legal)','Notice re: Booking BK-071 refund dispute','LC-16'),
  ('2026-06-28','Boracay Sands Resort','Formal notice — overbooking incident clause 4.2','LC-17');

INSERT INTO audit_log (t_label, message) VALUES
  ('08:41','Admin approved facility booking BK-104 (Agency Tour Coaster).'),
  ('08:55','Visitor Liza Gomez checked in via QR pass VS-210.'),
  ('09:02','Contract CT-081 flagged under Legal Hold (case LC-16).'),
  ('09:20','Document DC-342 filed — DOT & IATA Accreditation.');