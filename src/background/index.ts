import { Storage } from "@plasmohq/storage";
import { getAllAccountInfo } from "~sync/account";
import {
  // injectScriptsToTabs,
  type SyncData,
  type SyncDataPlatform,
  createTabsForPlatforms,
  getPlatformInfos,
} from "~sync/common";
import QuantumEntanglementKeepAlive from "../utils/keep-alive";
import {
  addTabsManagerMessages,
  tabsManagerHandleTabRemoved,
  tabsManagerHandleTabUpdated,
  tabsManagerMessageHandler,
} from "./services/tabs";
import { trustDomainMessageHandler } from "./services/trust-domain";

const storage = new Storage({
  area: "local",
});

async function initLocalSecurityState() {
  const trustedDomains = (await storage.get<Array<{ id: string; domain: string }>>("trustedDomains")) || [];
  const localDomains = trustedDomains.filter(({ domain }) => domain !== "multipost.app" && !domain.endsWith(".multipost.app"));
  await storage.set("trustedDomains", localDomains);

  // Legacy SaaS credentials are not used by the standalone fork.
  await storage.remove("apiKey");
  await storage.remove("extensionClientId");
}

chrome.runtime.onInstalled.addListener((object) => {
  if (object.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    chrome.runtime.openOptionsPage();
  }
  initLocalSecurityState();
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
});

initLocalSecurityState();

// Listen Message || 监听消息 || START
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const handled =
    defaultMessageHandler(request, sender, sendResponse) ||
    tabsManagerMessageHandler(request, sender, sendResponse) ||
    trustDomainMessageHandler(request, sender, sendResponse);
  return handled;
});
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  tabsManagerHandleTabUpdated(tabId, changeInfo, tab);
});
chrome.tabs.onRemoved.addListener((tabId) => {
  tabsManagerHandleTabRemoved(tabId);
});
// Listen Message || 监听消息 || END

// Message Handler || 消息处理器 || START
let currentSyncData: SyncData | null = null;
let currentPublishPopup: chrome.windows.Window | null = null;

const SESSION_MANAGER_BASE_URL = "http://127.0.0.1:2663";
let matrixTaskBusy = false;

async function sendMatrixReceipt(taskId: string, body: Record<string, unknown>) {
  await fetch(`${SESSION_MANAGER_BASE_URL}/api/tasks/${encodeURIComponent(taskId)}/receipt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function heartbeatMatrixSession() {
  const accountId = await storage.get<string>("matrixSessionAccountId");
  if (!accountId) return;
  await fetch(`${SESSION_MANAGER_BASE_URL}/api/sessions/${encodeURIComponent(accountId)}/ready`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  }).catch(() => undefined);
}

async function pollMatrixTaskQueue() {
  if (matrixTaskBusy) return;
  const accountId = await storage.get<string>("matrixSessionAccountId");
  if (!accountId) return;

  matrixTaskBusy = true;
  try {
    const response = await fetch(
      `${SESSION_MANAGER_BASE_URL}/api/tasks/next?accountId=${encodeURIComponent(accountId)}`,
      { cache: "no-store" },
    );
    if (!response.ok) return;
    const body = await response.json();
    const task = body?.task;
    if (!task) return;

    try {
      const syncData = task.payload?.syncData as SyncData;
      if (!syncData?.platforms?.length) {
        throw new Error("Task payload missing syncData/platforms");
      }
      const tabs = await createTabsForPlatforms(syncData);
      await sendMatrixReceipt(task.id, {
        status: "dispatched",
        accountId,
        tabs: tabs.map((item) => ({ id: item.tab.id, url: item.tab.url })),
      });
    } catch (error) {
      await sendMatrixReceipt(task.id, {
        status: "failed",
        accountId,
        error: String(error instanceof Error ? error.message : error),
      });
    }
  } catch {
    // Session Manager may be offline; retry on the next interval.
  } finally {
    matrixTaskBusy = false;
  }
}

const defaultMessageHandler = (request, _sender, sendResponse) => {
  if (request.action === "MULTIPOST_EXTENSION_CHECK_SERVICE_STATUS") {
    sendResponse({ extensionId: chrome.runtime.id });
    return true;
  }
  if (request.action === "MULTIPOST_EXTENSION_PUBLISH") {
    const data = request.data as SyncData;
    currentSyncData = data;
    sendResponse({ status: "received", extensionId: chrome.runtime.id });
    (async () => {
      currentPublishPopup = await chrome.windows.create({
        url: chrome.runtime.getURL("tabs/publish.html"),
        type: "popup",
        width: 800,
        height: 600,
      });
    })();
    return true;
  }
  if (request.action === "MULTIPOST_EXTENSION_PLATFORMS") {
    getPlatformInfos()
      .then((platforms) => {
        sendResponse({ platforms });
      })
      .catch((error) => {
        sendResponse({ error: String(error instanceof Error ? error.message : error) });
      });
    return true;
  }
  if (request.action === "MULTIPOST_EXTENSION_GET_ACCOUNT_INFOS") {
    getAllAccountInfo()
      .then((accountInfo) => {
        sendResponse({ accountInfo });
      })
      .catch((error) => {
        sendResponse({ error: String(error instanceof Error ? error.message : error) });
      });
    return true;
  }
  if (request.action === "MULTIPOST_EXTENSION_OPEN_OPTIONS") {
    chrome.runtime.openOptionsPage();
    sendResponse({ extensionId: chrome.runtime.id });
    return true;
  }
  if (request.action === "MULTIPOST_EXTENSION_REFRESH_ACCOUNT_INFOS") {
    chrome.windows.create({
      url: chrome.runtime.getURL("tabs/refresh-accounts.html"),
      type: "popup",
      width: 800,
      height: 600,
      focused: request.data.isFocused || false,
    });
    sendResponse({ status: "ok" });
    return true;
  }
  if (request.action === "MULTIPOST_EXTENSION_PUBLISH_REQUEST_SYNC_DATA") {
    sendResponse({ syncData: currentSyncData });
    return true;
  }
  if (request.action === "MULTIPOST_EXTENSION_PUBLISH_NOW") {
    const data = request.data as SyncData;
    if (Array.isArray(data.platforms) && data.platforms.length > 0) {
      (async () => {
        try {
          const tabs = await createTabsForPlatforms(data);
          // await injectScriptsToTabs(tabs, data);

          addTabsManagerMessages({
            syncData: data,
            tabs: tabs.map((t: { tab: chrome.tabs.Tab; platformInfo: SyncDataPlatform }) => ({
              tab: t.tab,
              platformInfo: t.platformInfo,
            })),
          });

          // for (const t of tabs) {
          //   if (t.tab.id) {
          //     await chrome.tabs.update(t.tab.id, { active: true });
          //     await new Promise((resolve) => setTimeout(resolve, 2000));
          //   }
          // }
          if (currentPublishPopup) {
            await chrome.windows.update(currentPublishPopup.id, { focused: true });
          }

          sendResponse({
            tabs: tabs.map((t: { tab: chrome.tabs.Tab; platformInfo: SyncDataPlatform }) => ({
              tab: t.tab,
              platformInfo: t.platformInfo,
            })),
          });
        } catch (error) {
          // Do not sendResponse here: the publish popup's handlePublishComplete treats ANY
          // callback response as "publish complete", so an error payload would be mis-read as success.
          // Preserve original behavior (log only); success path above sends the tabs response.
          console.error("创建标签页或分组时出错:", error);
        }
      })();
    }
    // Claim this action regardless of platform count, mirroring the original blanket return-true:
    // the success path responds asynchronously; error/empty paths intentionally send no response.
    return true;
  }
  return false;
};
// Message Handler || 消息处理器 || END

setInterval(pollMatrixTaskQueue, 5000);
setInterval(heartbeatMatrixSession, 10000);
heartbeatMatrixSession();
pollMatrixTaskQueue();

// Keep Alive || 保活机制 || START
const quantumKeepAlive = new QuantumEntanglementKeepAlive();
quantumKeepAlive.startEntanglementProcess();
// Keep Alive || 保活机制 || END
