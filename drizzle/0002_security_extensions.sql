-- Security Dashboard Extensions: incidents, activity_log, threat_indicators

CREATE TABLE IF NOT EXISTS `incidents` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `userId` int NOT NULL,
  `title` varchar(256) NOT NULL,
  `description` text,
  `severity` enum('critical','high','medium','low','info') NOT NULL DEFAULT 'medium',
  `status` enum('open','investigating','contained','resolved','closed') NOT NULL DEFAULT 'open',
  `category` enum('physical_breach','network_intrusion','device_compromise','data_leak','social_engineering','malware','unauthorized_access','other') NOT NULL DEFAULT 'other',
  `affectedDevices` text,
  `timeline` text,
  `mitigationSteps` text,
  `resolvedAt` timestamp,
  `reportedBy` varchar(128),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `activity_log` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `userId` int NOT NULL,
  `action` varchar(128) NOT NULL,
  `module` varchar(64) NOT NULL,
  `details` text,
  `severity` enum('info','warning','error','critical') NOT NULL DEFAULT 'info',
  `ipAddress` varchar(64),
  `createdAt` timestamp NOT NULL DEFAULT (now())
);

CREATE TABLE IF NOT EXISTS `threat_indicators` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `userId` int NOT NULL,
  `type` enum('ioc','ttp','vulnerability','risk_factor','anomaly') NOT NULL DEFAULT 'risk_factor',
  `title` varchar(256) NOT NULL,
  `description` text,
  `severity` enum('critical','high','medium','low') NOT NULL DEFAULT 'medium',
  `status` enum('active','mitigated','false_positive','monitoring') NOT NULL DEFAULT 'active',
  `source` varchar(128),
  `mitigationNote` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
