-- ─── 1. Ledger Immutability & Balancing ───────────────────────────────────────

-- Function to check double-entry balance (Debits = Credits)
CREATE OR REPLACE FUNCTION check_journal_balance()
RETURNS TRIGGER AS $$
DECLARE
  debit_sum  NUMERIC(19,4);
  credit_sum NUMERIC(19,4);
BEGIN
  -- Sum all lines for this entry
  SELECT 
    COALESCE(SUM(amount) FILTER (WHERE type = 'DEBIT'), 0),
    COALESCE(SUM(amount) FILTER (WHERE type = 'CREDIT'), 0)
  INTO debit_sum, credit_sum
  FROM "JournalLine"
  WHERE "journalEntryId" = NEW.id;

  IF debit_sum <> credit_sum THEN
    RAISE EXCEPTION 'Unbalanced journal entry: debits=% credits=%', debit_sum, credit_sum;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce balance ON UPDATE (when posting)
-- Note: In Phase 2, we enforce balance when "isPosted" becomes true.
CREATE TRIGGER trg_check_journal_balance
  AFTER UPDATE OF "isPosted" ON "JournalEntry"
  FOR EACH ROW
  WHEN (NEW."isPosted" = true)
  EXECUTE FUNCTION check_journal_balance();

-- ─── 2. Audit Log Security ───────────────────────────────────────────────────

-- Prevent UPDATE or DELETE on AuditLog (Append-only)
CREATE RULE audit_log_no_update AS ON UPDATE TO "AuditLog" DO INSTEAD NOTHING;
CREATE RULE audit_log_no_delete AS ON DELETE TO "AuditLog" DO INSTEAD NOTHING;

-- ─── 3. Row Level Security (RLS) ──────────────────────────────────────────────

-- Enable RLS on all tenant-scoped tables
ALTER TABLE "UserProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FiscalPeriod" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JournalEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JournalLine" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TaxRate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TaxRatePeriod" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- Define the tenant isolation policy
-- This assumes the application sets 'app.current_company_id' in the session context.
-- If not set, access is denied (defense in depth).
DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'UserProfile', 'FiscalPeriod', 'Account', 
        'JournalEntry', 'TaxRate', 'AuditLog'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('
            CREATE POLICY tenant_isolation_policy ON %I
            USING ("companyId" = current_setting(''app.current_company_id'', true)::text);
        ', t);
    END LOOP;
END $$;

-- JournalLine is isolated via its parent JournalEntry
CREATE POLICY tenant_isolation_policy ON "JournalLine"
USING (
    EXISTS (
        SELECT 1 FROM "JournalEntry" 
        WHERE "JournalEntry".id = "JournalLine"."journalEntryId"
        AND "JournalEntry"."companyId" = current_setting('app.current_company_id', true)::text
    )
);

-- TaxRatePeriod is isolated via its parent TaxRate
CREATE POLICY tenant_isolation_policy ON "TaxRatePeriod"
USING (
    EXISTS (
        SELECT 1 FROM "TaxRate" 
        WHERE "TaxRate".id = "TaxRatePeriod"."taxRateId"
        AND "TaxRate"."companyId" = current_setting('app.current_company_id', true)::text
    )
);