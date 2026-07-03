import { invoke } from "@tauri-apps/api/core";
import type { Entry, EntryInput, EntrySummary } from "../types/vault";
import type { Settings } from "../types/settings";

export function vaultExists(): Promise<boolean> {
  return invoke("vault_exists");
}

export function isUnlocked(): Promise<boolean> {
  return invoke("is_unlocked");
}

export function createVault(masterPassword: string): Promise<void> {
  return invoke("create_vault", { masterPassword });
}

export function unlockVault(masterPassword: string): Promise<void> {
  return invoke("unlock_vault", { masterPassword });
}

export function lockVault(): Promise<void> {
  return invoke("lock_vault");
}

export function changeMasterPassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  return invoke("change_master_password", { currentPassword, newPassword });
}

export function listEntries(): Promise<EntrySummary[]> {
  return invoke("list_entries");
}

export function getEntry(id: string): Promise<Entry> {
  return invoke("get_entry", { id });
}

export function addEntry(input: EntryInput): Promise<EntrySummary> {
  return invoke("add_entry", { input });
}

export function updateEntry(
  id: string,
  input: EntryInput,
): Promise<EntrySummary> {
  return invoke("update_entry", { id, input });
}

export function deleteEntry(id: string): Promise<void> {
  return invoke("delete_entry", { id });
}

export type ClipboardField = "username" | "password";

export function copyEntryFieldToClipboard(
  id: string,
  field: ClipboardField,
): Promise<void> {
  return invoke("copy_entry_field_to_clipboard", { id, field });
}

export function reportActivity(): Promise<void> {
  return invoke("report_activity");
}

export function getSettings(): Promise<Settings> {
  return invoke("get_settings");
}

export function updateSettings(settings: Settings): Promise<void> {
  return invoke("update_settings", { settings });
}

export function exportVaultEncrypted(): Promise<boolean> {
  return invoke("export_vault_encrypted");
}

export function importVaultEncrypted(): Promise<boolean> {
  return invoke("import_vault_encrypted");
}
