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
  await fetch(`http://127.0.0.1:2663/api/sessions/${encodeURIComponent(accountId)}/ready`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  }).catch(() => undefined);

  const markerId = "social-publisher-bind-status";
  if (!document.getElementById(markerId)) {
    const marker = document.createElement("div");
    marker.id = markerId;
    marker.textContent = "Social Publisher 会话已绑定。请在此浏览器窗口中登录对应平台账号，然后保持此窗口环境供任务使用。";
    marker.style.cssText =
      "position:fixed;left:24px;right:24px;bottom:24px;z-index:2147483647;padding:14px 16px;border-radius:12px;background:#111;color:#fff;font:14px system-ui;box-shadow:0 8px 30px #0003";
    document.documentElement.appendChild(marker);
  }

  const account = await fetch(`http://127.0.0.1:2663/api/accounts/${encodeURIComponent(accountId)}`)
    .then((response) => (response.ok ? response.json() : null))
    .catch(() => null);

  const homeByPlatform: Record<string, string> = {
    douyin: "https://creator.douyin.com/",
    rednote: "https://creator.xiaohongshu.com/",
    bilibili: "https://member.bilibili.com/",
    weibo: "https://weibo.com/",
    zhihu: "https://www.zhihu.com/",
    tiktok: "https://www.tiktok.com/",
    x: "https://x.com/",
    youtube: "https://studio.youtube.com/",
  };
  const homeUrl = account?.platform ? homeByPlatform[account.platform] : null;
  if (homeUrl) {
    window.setTimeout(() => window.location.replace(homeUrl), 1200);
  }
}

bindSession().catch(console.error);
