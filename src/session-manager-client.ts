export interface SessionManagerAccount {
  id: string;
  platform: string;
  platformLabel: string;
  label: string;
  username?: string;
  purpose?: "recruitment" | "product" | "b2b" | "general";
  owner?: string;
  status?: string;
  homeUrl?: string;
  sessionStatus?: "offline" | "starting" | "ready" | "unknown";
  createdAt?: number;
  updatedAt?: number;
}

export interface AccountGroup {
  id: string;
  name: string;
  description?: string;
  accountIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface MatrixTaskPayload {
  contentType: "DYNAMIC" | "VIDEO";
  syncData: unknown;
}

export interface MatrixTask {
  id: string;
  accountId: string;
  platform: string;
  status: "queued" | "dispatched" | "failed";
  createdAt: number;
  updatedAt: number;
  contentType?: "DYNAMIC" | "VIDEO";
  campaignName?: string;
  campaignType?: "recruitment" | "product" | "b2b" | "custom";
  platformInfo?: { publishMode?: "fill" | "auto"; name?: string };
  payload?: MatrixTaskPayload;
  error?: string;
}

const BASE_URL = "http://127.0.0.1:2663";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Session Manager request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function getSessionManagerHealth(): Promise<{ ok: boolean; version: string }> {
  return request("/api/health");
}

export async function listSessionAccounts(): Promise<SessionManagerAccount[]> {
  return request("/api/accounts");
}

export async function upsertSessionAccount(account: SessionManagerAccount): Promise<SessionManagerAccount> {
  return request("/api/accounts", {
    method: "POST",
    body: JSON.stringify(account),
  });
}

export async function deleteSessionAccount(id: string): Promise<void> {
  await request(`/api/accounts/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function launchSessionAccount(id: string): Promise<{ ok: boolean; sessionDir: string }> {
  return request(`/api/accounts/${encodeURIComponent(id)}/launch`, { method: "POST", body: "{}" });
}

export async function enqueueMatrixTasks(
  accountIds: string[],
  payloadByAccount: Record<string, MatrixTaskPayload>,
): Promise<MatrixTask[]> {
  return request("/api/tasks", {
    method: "POST",
    body: JSON.stringify({ accountIds, payloadByAccount }),
  });
}

export async function listMatrixTasks(): Promise<MatrixTask[]> {
  return request("/api/tasks");
}

export async function enqueueMatrixBatch(input: {
  accountIds: string[];
  contentType: "DYNAMIC" | "VIDEO";
  campaignName?: string;
  campaignType?: "recruitment" | "product" | "b2b" | "custom";
  sharedData: unknown;
  sharedVariants?: Array<{ title?: string; content?: string }>;
  platformByAccount: Record<string, unknown>;
}): Promise<MatrixTask[]> {
  return request("/api/tasks/batch", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function listAccountGroups(): Promise<AccountGroup[]> {
  return request("/api/groups");
}

export async function saveAccountGroup(input: {
  id?: string;
  name: string;
  description?: string;
  accountIds: string[];
}): Promise<AccountGroup> {
  return request("/api/groups", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteAccountGroup(id: string): Promise<void> {
  await request(`/api/groups/${encodeURIComponent(id)}`, { method: "DELETE" });
}
