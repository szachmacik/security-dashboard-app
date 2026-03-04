CREATE TABLE `audit_schedule` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(256) NOT NULL,
	`description` text,
	`scheduledAt` timestamp NOT NULL,
	`recurrence` enum('once','daily','weekly','monthly') NOT NULL DEFAULT 'once',
	`status` enum('pending','completed','overdue','cancelled') NOT NULL DEFAULT 'pending',
	`completedAt` timestamp,
	`findings` text,
	`severity` enum('critical','high','medium','low','info') DEFAULT 'info',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `audit_schedule_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `devices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`type` enum('laptop','phone','tablet','server','raspberry_pi','usb_drive','other') NOT NULL DEFAULT 'other',
	`location` varchar(256),
	`isolationStatus` enum('air_gapped','faraday','offline','online') NOT NULL DEFAULT 'offline',
	`isActive` boolean NOT NULL DEFAULT true,
	`lastSync` timestamp,
	`notes` text,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `devices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `opsec_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`category` enum('physical','network','cryptographic','opsec','smart_home') NOT NULL,
	`title` varchar(256) NOT NULL,
	`description` text,
	`priority` enum('critical','high','medium','low') NOT NULL DEFAULT 'medium',
	`isCompleted` boolean NOT NULL DEFAULT false,
	`completedAt` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `opsec_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `secure_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(256) NOT NULL,
	`content` text,
	`tags` varchar(512),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `secure_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `security_protocols` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(256) NOT NULL,
	`category` enum('air_gap','optical','acoustic','physical','network','cryptographic') NOT NULL,
	`difficulty` enum('beginner','intermediate','advanced','expert') NOT NULL DEFAULT 'intermediate',
	`riskLevel` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`description` text,
	`instructions` text,
	`requirements` text,
	`isBuiltIn` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `security_protocols_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `smart_home_devices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`protocol` enum('zigbee','zwave','wifi','mqtt','other') NOT NULL DEFAULT 'zigbee',
	`type` enum('socket','relay','sensor','switch','camera','lock','other') NOT NULL DEFAULT 'socket',
	`location` varchar(256),
	`isOnline` boolean NOT NULL DEFAULT false,
	`isPowered` boolean NOT NULL DEFAULT false,
	`automationEnabled` boolean NOT NULL DEFAULT false,
	`automationRule` text,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `smart_home_devices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transfer_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`direction` enum('outbound','inbound') NOT NULL,
	`dataType` varchar(64) NOT NULL DEFAULT 'text',
	`dataSize` int,
	`status` enum('pending','in_progress','completed','failed') NOT NULL DEFAULT 'pending',
	`sourceDevice` varchar(128),
	`targetDevice` varchar(128),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `transfer_sessions_id` PRIMARY KEY(`id`)
);
