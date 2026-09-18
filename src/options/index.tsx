import "~style.css";
import { HeroUIProvider, Tab, Tabs } from "@heroui/react";
import { FileText, Image as ImageIcon, Settings as SettingsIcon, Video } from "lucide-react";
import type React from "react";
import DynamicTab from "~components/Sync/DynamicTab";
import SettingsTab from "~components/Sync/SettingsTab";
import VideoTab from "~components/Sync/VideoTab";
import type { SyncData } from "~sync/common";

const publish = (data: SyncData) => {
  chrome.runtime.sendMessage({
    action: "MULTIPOST_EXTENSION_PUBLISH",
    data,
  });
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
              isDisabled
              title={
                <div className="flex items-center gap-2">
                  <FileText className="size-4" />
                  <span>长文（下一阶段）</span>
                </div>
              }>
              <div />
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
