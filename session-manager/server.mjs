import http from "node:http";
import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const runtimeRoot = path.join(repoRoot, ".social-publisher");
const sessionsRoot = path.join(runtimeRoot, "sessions");
const statePath = path.join(runtimeRoot, "state.json");
const extensionDir = path.join(repoRoot, "build", "chrome-mv3-prod");
const host = "127.0.0.1";
const port = Number(process.env.SOCIAL_PUBLISHER_PORT || 2663);
const VERSION = "0.1.0";

const emptyState = () => ({
  accounts: [],
  tasks: [],
  sessions: {},
  batches: {},
});

async function ensureRuntime() {
  await mkdir(sessionsRoot, { recursive: true });
  if (!existsSync(statePath)) {
    await writeFile(statePath, JSON.stringify(emptyState(), null, 2), "utf8");
  }
}

async function loadState() {
  await ensureRuntime();
  try {
    const state = JSON.parse(await readFile(statePath, "utf8"));
    state.accounts = Array.isArray(state.accounts) ? state.accounts : [];
    state.tasks = Array.isArray(state.tasks) ? state.tasks : [];
    state.sessions = state.sessions && typeof state.sessions === "object" ? state.sessions : {};
    state.batches = state.batches && typeof state.batches === "object" ? state.batches : {};
    return state;
  } catch {
    const state = emptyState();
    await saveState(state);
    return state;
  }
}

async function saveState(state) {
  await ensureRuntime();
  await writeFile(statePath, JSON.stringify(state, null, 2), "utf8");
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(data));
}

function sendHtml(res, status, html) {
  res.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store",
  });
  res.end(html);
}

async function readJson(req, limitBytes = 512 * 1024 * 1024) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > limitBytes) throw new Error("Request body too large");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function findChromeRecursively(root) {
  if (!root || !existsSync(root)) return null;
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && entry.name.toLowerCase() === "chrome.exe") {
        return full;
      }
    }
  }
  return null;
}

function findChrome() {
  const sessionBrowser = findChromeRecursively(path.join(runtimeRoot, "browser"));
  if (sessionBrowser) return sessionBrowser;

  const candidates = [
    process.env.SOCIAL_PUBLISHER_CHROME,
    process.env.CHROME_PATH,
  ].filter(Boolean);
  return candidates.find((candidate) => existsSync(candidate));
}

function sessionDirFor(accountId) {
  return path.join(sessionsRoot, accountId);
}

async function launchAccountSession(accountId) {
  const state = await loadState();
  const account = state.accounts.find((item) => item.id === accountId);
  if (!account) throw new Error("Account not found");
  const chrome = findChrome();
  if (!chrome) throw new Error("Session browser not found. Run prepare-session-browser.ps1 first.");
  if (!existsSync(extensionDir)) throw new Error(`Extension build not found: ${extensionDir}`);

  const sessionDir = sessionDirFor(accountId);
  await mkdir(sessionDir, { recursive: true });

  state.sessions[accountId] = {
    status: "starting",
    sessionDir,
    updatedAt: Date.now(),
  };
  await saveState(state);

  const bindUrl = `http://${host}:${port}/bind/${encodeURIComponent(accountId)}`;
  const child = spawn(
    chrome,
    [
      `--user-data-dir=${sessionDir}`,
      `--load-extension=${extensionDir}`,
      "--no-first-run",
      "--no-default-browser-check",
      bindUrl,
    ],
    {
      detached: true,
      stdio: "ignore",
    },
  );
  child.unref();

  return { ok: true, sessionDir };
}

function normalizeAccount(input, existing) {
  const now = Date.now();
  return {
    id: input.id || existing?.id || crypto.randomUUID(),
    platform: String(input.platform || existing?.platform || "other"),
    platformLabel: String(input.platformLabel || existing?.platformLabel || input.platform || "其他"),
    label: String(input.label || existing?.label || "").trim(),
    username: String(input.username || existing?.username || "").trim(),
    status: String(input.status || existing?.status || "unknown"),
    homeUrl: String(input.homeUrl || existing?.homeUrl || ""),
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      sendJson(res, 200, { ok: true });
      return;
    }

    const url = new URL(req.url || "/", `http://${host}:${port}`);
    const pathname = url.pathname;

    if (req.method === "GET" && pathname === "/api/health") {
      sendJson(res, 200, { ok: true, version: VERSION });
      return;
    }

    if (req.method === "GET" && pathname === "/api/accounts") {
      const state = await loadState();
      const now = Date.now();
      const accounts = state.accounts.map((account) => {
        const session = state.sessions[account.id];
        const heartbeatAt = Number(session?.heartbeatAt || 0);
        const isReady = heartbeatAt > 0 && now - heartbeatAt < 30000;
        return {
          ...account,
          sessionStatus: isReady ? "ready" : session?.status === "starting" ? "starting" : "offline",
        };
      });
      sendJson(res, 200, accounts);
      return;
    }

    if (req.method === "POST" && pathname === "/api/accounts") {
      const input = await readJson(req);
      const state = await loadState();
      const existingIndex = input.id ? state.accounts.findIndex((item) => item.id === input.id) : -1;
      const existing = existingIndex >= 0 ? state.accounts[existingIndex] : null;
      const account = normalizeAccount(input, existing);
      if (!account.label) throw new Error("Account label is required");
      if (existingIndex >= 0) state.accounts[existingIndex] = account;
      else state.accounts.push(account);
      await saveState(state);
      sendJson(res, 200, account);
      return;
    }

    const accountRead = pathname.match(/^\/api\/accounts\/([^/]+)$/);
    if (req.method === "GET" && accountRead) {
      const id = decodeURIComponent(accountRead[1]);
      const state = await loadState();
      const account = state.accounts.find((item) => item.id === id);
      if (!account) {
        sendJson(res, 404, { error: "Account not found" });
        return;
      }
      sendJson(res, 200, account);
      return;
    }

    const accountDelete = pathname.match(/^\/api\/accounts\/([^/]+)$/);
    if (req.method === "DELETE" && accountDelete) {
      const id = decodeURIComponent(accountDelete[1]);
      const state = await loadState();
      state.accounts = state.accounts.filter((item) => item.id !== id);
      state.tasks = state.tasks.filter((task) => task.accountId !== id || task.status !== "queued");
      delete state.sessions[id];
      await saveState(state);
      sendJson(res, 200, { ok: true });
      return;
    }

    const accountLaunch = pathname.match(/^\/api\/accounts\/([^/]+)\/launch$/);
    if (req.method === "POST" && accountLaunch) {
      const id = decodeURIComponent(accountLaunch[1]);
      sendJson(res, 200, await launchAccountSession(id));
      return;
    }

    const bindMatch = pathname.match(/^\/bind\/([^/]+)$/);
    if (req.method === "GET" && bindMatch) {
      const accountId = decodeURIComponent(bindMatch[1]);
      sendHtml(
        res,
        200,
        `<!doctype html><html><head><meta charset="utf-8"><title>Social Publisher Session</title></head>
        <body style="font-family:system-ui;padding:32px">
          <h2>Social Publisher</h2>
          <p>正在绑定账号会话：<strong>${accountId}</strong></p>
          <p>请保持此窗口打开，完成该平台账号登录。绑定完成后扩展会自动接收发布任务。</p>
          <script>setTimeout(()=>location.reload(),5000)</script>
        </body></html>`,
      );
      return;
    }

    const sessionReady = pathname.match(/^\/api\/sessions\/([^/]+)\/ready$/);
    if (req.method === "POST" && sessionReady) {
      const accountId = decodeURIComponent(sessionReady[1]);
      const state = await loadState();
      state.sessions[accountId] = {
        ...(state.sessions[accountId] || {}),
        status: "ready",
        heartbeatAt: Date.now(),
        updatedAt: Date.now(),
      };
      await saveState(state);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "POST" && pathname === "/api/tasks") {
      const body = await readJson(req);
      const accountIds = Array.isArray(body.accountIds) ? body.accountIds : [];
      const payloadByAccount = body.payloadByAccount || {};
      const state = await loadState();
      const now = Date.now();
      const tasks = accountIds.map((accountId) => {
        const account = state.accounts.find((item) => item.id === accountId);
        if (!account) throw new Error(`Unknown account: ${accountId}`);
        const payload = payloadByAccount[accountId];
        if (!payload) throw new Error(`Missing payload for account: ${accountId}`);
        return {
          id: crypto.randomUUID(),
          accountId,
          platform: account.platform,
          status: "queued",
          createdAt: now,
          updatedAt: now,
          payload,
        };
      });
      state.tasks.push(...tasks);
      await saveState(state);
      sendJson(res, 200, tasks);
      return;
    }

    if (req.method === "POST" && pathname === "/api/tasks/batch") {
      const body = await readJson(req);
      const accountIds = Array.isArray(body.accountIds) ? body.accountIds : [];
      const platformByAccount = body.platformByAccount || {};
      const contentType = body.contentType === "VIDEO" ? "VIDEO" : "DYNAMIC";
      const state = await loadState();
      const now = Date.now();
      const batchId = crypto.randomUUID();
      state.batches[batchId] = {
        id: batchId,
        contentType,
        sharedData: body.sharedData || {},
        createdAt: now,
      };

      const tasks = accountIds.map((accountId) => {
        const account = state.accounts.find((item) => item.id === accountId);
        if (!account) throw new Error(`Unknown account: ${accountId}`);
        const platformInfo = platformByAccount[accountId];
        if (!platformInfo) throw new Error(`Missing platform payload for account: ${accountId}`);
        return {
          id: crypto.randomUUID(),
          accountId,
          platform: account.platform,
          platformInfo,
          batchId,
          contentType,
          status: "queued",
          createdAt: now,
          updatedAt: now,
        };
      });
      state.tasks.push(...tasks);
      await saveState(state);
      sendJson(res, 200, tasks);
      return;
    }

    if (req.method === "GET" && pathname === "/api/tasks") {
      const state = await loadState();
      sendJson(res, 200, state.tasks.slice().sort((a, b) => b.createdAt - a.createdAt));
      return;
    }

    if (req.method === "GET" && pathname === "/api/tasks/next") {
      const accountId = url.searchParams.get("accountId");
      if (!accountId) throw new Error("accountId is required");
      const state = await loadState();
      const now = Date.now();
      const task = state.tasks.find(
        (item) =>
          item.accountId === accountId &&
          item.status === "queued" &&
          (!item.leaseUntil || Number(item.leaseUntil) < now),
      );
      if (!task) {
        sendJson(res, 200, { task: null });
        return;
      }
      task.leasedAt = now;
      task.leaseUntil = now + 2 * 60 * 1000;
      task.updatedAt = now;
      await saveState(state);

      let responseTask = task;
      if (task.batchId) {
        const batch = state.batches[task.batchId];
        if (!batch) throw new Error("Task batch not found");
        responseTask = {
          ...task,
          payload: {
            contentType: task.contentType || batch.contentType,
            syncData: {
              platforms: [task.platformInfo],
              data: batch.sharedData,
              isAutoPublish: false,
            },
          },
        };
      }
      sendJson(res, 200, { task: responseTask });
      return;
    }

    const receiptMatch = pathname.match(/^\/api\/tasks\/([^/]+)\/receipt$/);
    if (req.method === "POST" && receiptMatch) {
      const taskId = decodeURIComponent(receiptMatch[1]);
      const body = await readJson(req);
      const state = await loadState();
      const task = state.tasks.find((item) => item.id === taskId);
      if (!task) throw new Error("Task not found");
      task.status = body.status === "failed" ? "failed" : "dispatched";
      task.error = body.error || "";
      task.leaseUntil = 0;
      task.receipt = {
        ...body,
        at: Date.now(),
      };
      task.updatedAt = Date.now();

      if (task.batchId) {
        const siblings = state.tasks.filter((item) => item.batchId === task.batchId);
        const allFinished = siblings.every((item) => item.status === "dispatched" || item.status === "failed");
        if (allFinished) {
          delete state.batches[task.batchId];
        }
      }

      await saveState(state);
      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    sendJson(res, 500, { error: String(error instanceof Error ? error.message : error) });
  }
});

await ensureRuntime();
server.listen(port, host, () => {
  console.log(`Social Publisher Session Manager ${VERSION}`);
  console.log(`Listening on http://${host}:${port}`);
  console.log(`Extension: ${extensionDir}`);
});
