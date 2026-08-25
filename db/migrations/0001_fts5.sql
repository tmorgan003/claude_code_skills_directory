CREATE VIRTUAL TABLE IF NOT EXISTS repos_fts USING fts5(
	name,
	description,
	purpose_summary,
	topics,
	content='repos',
	content_rowid='id'
);
--> statement-breakpoint
CREATE TRIGGER repos_ai AFTER INSERT ON repos BEGIN
	INSERT INTO repos_fts(rowid, name, description, purpose_summary, topics)
	VALUES (new.id, new.name, new.description, new.purpose_summary, new.topics);
END;
--> statement-breakpoint
CREATE TRIGGER repos_ad AFTER DELETE ON repos BEGIN
	INSERT INTO repos_fts(repos_fts, rowid, name, description, purpose_summary, topics)
	VALUES ('delete', old.id, old.name, old.description, old.purpose_summary, old.topics);
END;
--> statement-breakpoint
CREATE TRIGGER repos_au AFTER UPDATE ON repos BEGIN
	INSERT INTO repos_fts(repos_fts, rowid, name, description, purpose_summary, topics)
	VALUES ('delete', old.id, old.name, old.description, old.purpose_summary, old.topics);
	INSERT INTO repos_fts(rowid, name, description, purpose_summary, topics)
	VALUES (new.id, new.name, new.description, new.purpose_summary, new.topics);
END;
