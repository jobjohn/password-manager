import { useEffect, useMemo } from "react";
import { useVaultStore } from "../state/useVaultStore";
import { useNavStore } from "../state/useNavStore";
import { EntryRow } from "../components/EntryRow";
import { SearchBar } from "../components/SearchBar";

export function VaultListView() {
  const entries = useVaultStore((s) => s.entries);
  const isLoading = useVaultStore((s) => s.isLoading);
  const searchQuery = useVaultStore((s) => s.searchQuery);
  const selectedTag = useVaultStore((s) => s.selectedTag);
  const setSearchQuery = useVaultStore((s) => s.setSearchQuery);
  const setSelectedTag = useVaultStore((s) => s.setSelectedTag);
  const refresh = useVaultStore((s) => s.refresh);
  const push = useNavStore((s) => s.push);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    for (const entry of entries) {
      for (const tag of entry.tags) tags.add(tag);
    }
    return [...tags].sort();
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return entries.filter((entry) => {
      const matchesQuery =
        query.length === 0 ||
        entry.title.toLowerCase().includes(query) ||
        entry.username.toLowerCase().includes(query) ||
        entry.url.toLowerCase().includes(query);
      const matchesTag = selectedTag === null || entry.tags.includes(selectedTag);
      return matchesQuery && matchesTag;
    });
  }, [entries, searchQuery, selectedTag]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-neutral-200 px-3 py-2 dark:border-neutral-700">
        <div className="flex items-center justify-between gap-2">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
          <button
            type="button"
            onClick={() => push({ name: "entry-edit", entryId: null })}
            className="shrink-0 rounded bg-neutral-900 px-2 py-1 text-xs font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
          >
            + 追加
          </button>
        </div>
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() =>
                  setSelectedTag(selectedTag === tag ? null : tag)
                }
                className={`rounded-full px-2 py-0.5 text-xs ${
                  selectedTag === tag
                    ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
        <span className="text-xs text-neutral-500 dark:text-neutral-400">
          {filteredEntries.length}件
        </span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <p className="p-3 text-center text-xs text-neutral-400 dark:text-neutral-500">
            読み込み中…
          </p>
        )}
        {!isLoading && filteredEntries.length === 0 && (
          <p className="p-3 text-center text-xs text-neutral-400 dark:text-neutral-500">
            エントリがありません
          </p>
        )}
        {filteredEntries.map((entry) => (
          <EntryRow
            key={entry.id}
            entry={entry}
            onClick={() => push({ name: "entry-detail", entryId: entry.id })}
          />
        ))}
      </div>
    </div>
  );
}
