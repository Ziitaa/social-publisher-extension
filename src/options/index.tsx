import "~style.css";
import { HeroUIProvider, Tab, Tabs } from "@heroui/react";
import { FileText, Image as ImageIcon, ListChecks, Settings as SettingsIcon, UsersRound, Video } from "lucide-react";
import type React from "react";
import ArticleTab from "~components/Sync/ArticleTab";
import DynamicTab from "~components/Sync/DynamicTab";
import AccountManagerTab from "~components/Accounts/AccountManagerTab";
import MatrixQueueTab from "~components/Queue/MatrixQueueTab";
import SettingsTab from "~components/Sync/SettingsTab";
import VideoTab from "~components/Sync/VideoTab";
import type { SyncData } from "~sync/common";

const publish = (data: SyncData) => {
  chrome.runtime.sendMessage({
    action: "MULTIPOST_EXTENSION_PUBLISH",
    data,
  });
};

const waitForTabComplete = (tabId: number, timeoutMs = 20000) =>
  new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error("页面加载超时"));
    }, timeoutMs);

    const listener = (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        window.clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };

    chrome.tabs.onUpdated.addListener(listener);
  });

const scrapePage = async (url: string) => {
  const tab = await chrome.tabs.create({ url, active: false });
  if (!tab.id) {
    throw new Error("无法创建内容导入标签页");
  }

  try {
    if (tab.status !== "complete") {
      await waitForTabComplete(tab.id);
    }

    const result = await chrome.tabs.sendMessage(tab.id, {
      type: "MULTIPOST_EXTENSION_REQUEST_SCRAPER_START",
    });

    if (!result || result.error) {
      throw new Error(result?.error || "无法读取该页面内容");
    }
    return result;
  } finally {
    await chrome.tabs.remove(tab.id).catch(() => undefined);
  }
};

const App: React.FC = () => {
  return (
    <HeroUIProvider>
      <main className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-20 border-b border-divider bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <div>
              <div className="text-xl font-semibold">Social Publisher</div>
              <div className="text-xs text-default-500">本地发布工作台 · 默认仅填充 · 小红书固定仅填充</div>
            </div>
            <div className="rounded-full bg-warning-100 px-3 py-1 text-xs text-warning-700">
              Safe Publish
            </div>
          </div>
        </header>

        <section className="mx-auto max-w-7xl px-6 py-6">
          <Tabs aria-label="Social Publisher" variant="underlined" color="primary">
            <Tab
              key="dynamic"
              title={
                <div className="flex items-center gap-2">
                  <ImageIcon className="size-4" />
                  <span>图文 / 动态</span>
                </div>
              }>
              <div className="pt-4">
                <DynamicTab funcPublish={publish} />
              </div>
            </Tab>

            <Tab
              key="video"
              title={
                <div className="flex items-center gap-2">
                  <Video className="size-4" />
                  <span>视频</span>
                </div>
              }>
              <div className="pt-4">
                <VideoTab funcPublish={publish} />
              </div>
            </Tab>

            <Tab
              key="article"
              title={
                <div className="flex items-center gap-2">
                  <FileText className="size-4" />
                  <span>长文</span>
                </div>
              }>
              <div className="pt-4">
                <ArticleTab funcPublish={publish} funcScraper={scrapePage} />
              </div>
            </Tab>

            <Tab
              key="queue"
              title={
                <div className="flex items-center gap-2">
                  <ListChecks className="size-4" />
                  <span>批量队列</span>
                </div>
              }>
              <div className="pt-4">
                <MatrixQueueTab />
              </div>
            </Tab>

            <Tab
              key="accounts"
              title={
                <div className="flex items-center gap-2">
                  <UsersRound className="size-4" />
                  <span>账号池</span>
                </div>
              }>
              <div className="pt-4">
                <AccountManagerTab />
              </div>
            </Tab>

            <Tab
              key="settings"
              title={
                <div className="flex items-center gap-2">
                  <SettingsIcon className="size-4" />
                  <span>设置</span>
                </div>
              }>
              <div className="pt-4">
                <SettingsTab />
              </div>
            </Tab>
          </Tabs>
        </section>
      </main>
    </HeroUIProvider>
  );
};

export default App;
