import type { EntrySummary } from "../types/vault";

interface Props {
  entry: EntrySummary;
  onClick: () => void;
}

export function EntryRow({ entry, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full flex-col items-start gap-0.5 border-b border-neutral-100 px-3 py-2 text-left hover:bg-neutral-100 dark:border-neutral-800 dark:hover:bg-neutral-800"
    >
      <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
        {entry.title}
      </span>
      <span className="text-xs text-neutral-500 dark:text-neutral-400">{entry.username}</span>
    </button>
  );
}
