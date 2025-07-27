-- Add versioning columns to existing tables
ALTER TABLE sorters ADD COLUMN version INTEGER DEFAULT 1 NOT NULL;
ALTER TABLE sorters ADD COLUMN deleted BOOLEAN DEFAULT FALSE NOT NULL;

ALTER TABLE sorterItems ADD COLUMN version INTEGER DEFAULT 1 NOT NULL;
ALTER TABLE sorterGroups ADD COLUMN version INTEGER DEFAULT 1 NOT NULL;

-- Add version to rankings (for new rankings)
ALTER TABLE sortingResults ADD COLUMN version INTEGER;

-- Create historical snapshots table
CREATE TABLE sorterHistory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sorterId UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  coverImageUrl TEXT,
  version INTEGER NOT NULL,
  archivedAt TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(sorterId, version)
);

-- Performance indices
CREATE INDEX idx_sorter_items_version ON sorterItems(sorterId, version);
CREATE INDEX idx_sorter_groups_version ON sorterGroups(sorterId, version);
CREATE INDEX idx_sorter_history_lookup ON sorterHistory(sorterId, version);
CREATE INDEX idx_rankings_version ON sortingResults(sorterId, version);
CREATE INDEX idx_sorters_not_deleted ON sorters(id) WHERE deleted = FALSE;