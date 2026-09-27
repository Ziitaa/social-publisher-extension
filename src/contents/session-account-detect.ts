import { Storage } from "@plasmohq/storage";
import type { PlasmoCSConfig } from "plasmo";
import { refreshAccountInfo } from "~sync/account";

export const config: PlasmoCSConfig = {
  matches: ["https://*/*"],
  run_at: "document_idle",
};

const storage = new Storage({ area: "local" });
const BASE_URL = "http://127.0.0.1:2663";
const VERIFY_INTERVAL_MS = 5 * 60 * 1000;
const HEARTBEAT_INTERVAL_MS = 10 * 1000;

let lastVerifiedAt = 0;
let running = false;

async function getManagedAccount(accountId: string) {
  const response = await fetch(`${BASE_URL}/api/accounts/${encodeURIComponent(accountId)}`);
  if (!response.ok) return null;
  return response.json();
}

function isExpectedHost(homeUrl?: string) {
  if (!homeUrl) return true;
  try {
    const expected = new URL(homeUrl).hostname;
    return window.location.hostname === expected || window.location.hostname.endsWith(`.${expected}`);
  } catch {
    return true;
  }
}

async function markReady(accountId: string) {
  await fetch(`${BASE_URL}/api/sessions/${encodeURIComponent(accountId)}/ready`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
}

async function syncAccountSession() {
  if (running) return;
  running = true;
  try {
    const accountId = await storage.get<string>("matrixSessionAccountId");
    if (!accountId) return;

    const account = await getManagedAccount(accountId);
    if (!account || !isExpectedHost(account.homeUrl)) return;

    const now = Date.now();
    if (account.status === "connected" && lastVerifiedAt && now - lastVerifiedAt < VERIFY_INTERVAL_MS) {
      await markReady(accountId);
      return;
    }

    const info = await refreshAccountInfo(account.platform).catch(() => null);
    if (!info?.username) return;

    await fetch(`${BASE_URL}/api/accounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: account.id,
        platform: account.platform,
        platformLabel: account.platformLabel,
        label: info.username,
        username: info.username,
        purpose: account.purpose,
        owner: account.owner,
        status: "connected",
        homeUrl: account.homeUrl,
      }),
    });

    lastVerifiedAt = now;
    await markReady(accountId);
  } catch {
    // Keep waiting quietly while the user is on a login page or the platform is not ready yet.
  } finally {
    running = false;
  }
}

void syncAccountSession();
window.setInterval(() => void syncAccountSession(), HEARTBEAT_INTERVAL_MS);
