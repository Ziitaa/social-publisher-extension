import { Storage } from "@plasmohq/storage";

export type ManagedPlatform = "douyin" | "rednote" | "bilibili" | "weibo" | "zhihu" | "tiktok" | "x" | "youtube" | "other";
export type AccountStatus = "unknown" | "ready" | "needs_login" | "disabled";

export interface ManagedAccount {
  id: string;
  platform: ManagedPlatform;
  platformLabel: string;
  label: string;
  username?: string;
  profileName?: string;
  sessionRef?: string;
  status: AccountStatus;
  note?: string;
  createdAt: number;
  updatedAt: number;
}

export const ACCOUNT_POOL_STORAGE_KEY = "social_publisher_account_pool";

const storage = new Storage({ area: "local" });

export async function listManagedAccounts(): Promise<ManagedAccount[]> {
  return (await storage.get<ManagedAccount[]>(ACCOUNT_POOL_STORAGE_KEY)) || [];
}

export async function saveManagedAccounts(accounts: ManagedAccount[]): Promise<void> {
  await storage.set(ACCOUNT_POOL_STORAGE_KEY, accounts);
}

export async function upsertManagedAccount(input: Partial<ManagedAccount> & Pick<ManagedAccount, "platform" | "platformLabel" | "label">): Promise<ManagedAccount> {
  const accounts = await listManagedAccounts();
  const now = Date.now();
  const existingIndex = input.id ? accounts.findIndex((item) => item.id === input.id) : -1;
  const next: ManagedAccount = {
    id: input.id || crypto.randomUUID(),
    platform: input.platform,
    platformLabel: input.platformLabel,
    label: input.label,
    username: input.username || "",
    profileName: input.profileName || "",
    sessionRef: input.sessionRef || "",
    status: input.status || "unknown",
    note: input.note || "",
    createdAt: existingIndex >= 0 ? accounts[existingIndex].createdAt : now,
    updatedAt: now,
  };

  if (existingIndex >= 0) {
    accounts[existingIndex] = next;
  } else {
    accounts.push(next);
  }
  await saveManagedAccounts(accounts);
  return next;
}

export async function removeManagedAccount(id: string): Promise<void> {
  const accounts = await listManagedAccounts();
  await saveManagedAccounts(accounts.filter((item) => item.id !== id));
}
