import { Storage } from "@plasmohq/storage";
import type { PlasmoCSConfig } from "plasmo";

export const config: PlasmoCSConfig = {
  matches: ["http://127.0.0.1:2663/bind/*", "http://localhost:2663/bind/*"],
  run_at: "document_start",
};

const storage = new Storage({ area: "local" });

async function bindSession() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  const accountId = parts[parts.length - 1];
  if (!accountId) return;

  await storage.set("matrixSessionAccountId", accountId);

  const account = await fetch(`http://127.0.0.1:2663/api/accounts/${encodeURIComponent(accountId)}`)
    .then((response) => (response.ok ? response.json() : null))
    .catch(() => null);

  const homeUrl = account?.homeUrl || null;
  if (homeUrl) {
    window.location.replace(homeUrl);
    return;
  }

  const marker = document.createElement("div");
  marker.textContent = "账号会话已创建，请关闭此页并重新打开账号登录。";
  marker.style.cssText =
    "position:fixed;left:24px;right:24px;bottom:24px;z-index:2147483647;padding:14px 16px;border-radius:12px;background:#111;color:#fff;font:14px system-ui;box-shadow:0 8px 30px #0003";
  document.documentElement.appendChild(marker);
}

bindSession().catch(console.error);
