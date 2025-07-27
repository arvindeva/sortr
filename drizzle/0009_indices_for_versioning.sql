-- Performance indices for versioning system
CREATE INDEX idx_sorter_items_version ON sorterItems(sorterId, version);
CREATE INDEX idx_sorter_groups_version ON sorterGroups(sorterId, version);
CREATE INDEX idx_sorter_history_lookup ON sorterHistory(sorterId, version);
CREATE INDEX idx_rankings_version ON sortingResults(sorterId, version);
CREATE INDEX idx_sorters_not_deleted ON sorters(id) WHERE deleted = FALSE;