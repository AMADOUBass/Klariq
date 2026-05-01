-- ─── Database-level Audit Triggers for JournalEntry ───────────────────────────

-- Function to capture changes to JournalEntry
CREATE OR REPLACE FUNCTION audit_journal_entries_fn()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        -- Only log if something actually changed (excluding updatedAt if it exists)
        IF (OLD.* IS DISTINCT FROM NEW.*) THEN
            INSERT INTO "AuditLog" (id, "companyId", "actorId", action, "entityType", "entityId", before, after, "createdAt")
            VALUES (
                gen_random_uuid()::text,
                NEW."companyId",
                'DB_SYSTEM',
                'journal_entry.updated',
                'JournalEntry',
                NEW.id,
                to_jsonb(OLD),
                to_jsonb(NEW),
                now()
            );
        END IF;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO "AuditLog" (id, "companyId", "actorId", action, "entityType", "entityId", before, after, "createdAt")
        VALUES (
            gen_random_uuid()::text,
            OLD."companyId",
            'DB_SYSTEM',
            'journal_entry.deleted',
            'JournalEntry',
            OLD.id,
            to_jsonb(OLD),
            NULL,
            now()
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to JournalEntry
DROP TRIGGER IF EXISTS trg_audit_journal_entry ON "JournalEntry";
CREATE TRIGGER trg_audit_journal_entry
AFTER UPDATE OR DELETE ON "JournalEntry"
FOR EACH ROW
EXECUTE FUNCTION audit_journal_entries_fn();