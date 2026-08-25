CREATE TABLE `refresh_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`status` text NOT NULL,
	`repos_added` integer DEFAULT 0 NOT NULL,
	`repos_updated` integer DEFAULT 0 NOT NULL,
	`repos_removed` integer DEFAULT 0 NOT NULL,
	`error_log` text DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `repos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`github_id` integer NOT NULL,
	`full_name` text NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`purpose_summary` text,
	`readme_excerpt` text,
	`type` text DEFAULT 'unclassified' NOT NULL,
	`category` text DEFAULT 'other' NOT NULL,
	`topics` text DEFAULT '[]' NOT NULL,
	`stars` integer DEFAULT 0 NOT NULL,
	`forks` integer DEFAULT 0 NOT NULL,
	`open_issues` integer DEFAULT 0 NOT NULL,
	`primary_language` text,
	`license` text,
	`github_url` text NOT NULL,
	`package_url` text,
	`package_manager` text,
	`install_snippet` text,
	`created_at` text NOT NULL,
	`last_commit_at` text,
	`fetched_at` text NOT NULL,
	`first_seen_run_id` integer,
	`trending_7d` integer DEFAULT 0 NOT NULL,
	`trending_30d` integer DEFAULT 0 NOT NULL,
	`hidden` integer DEFAULT false NOT NULL,
	`removed_at` text,
	`removed_miss_count` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`first_seen_run_id`) REFERENCES `refresh_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `star_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`repo_id` integer NOT NULL,
	`run_id` integer NOT NULL,
	`stars` integer NOT NULL,
	`recorded_at` text NOT NULL,
	FOREIGN KEY (`repo_id`) REFERENCES `repos`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`run_id`) REFERENCES `refresh_runs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `repos_github_id_idx` ON `repos` (`github_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `star_history_repo_run_idx` ON `star_history` (`repo_id`,`run_id`);