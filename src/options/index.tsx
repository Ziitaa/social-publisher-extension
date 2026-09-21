import "~style.css";
import { HeroUIProvider, Tab, Tabs } from "@heroui/react";
import { History, Megaphone, Settings as SettingsIcon, UsersRound } from "lucide-react";
import type React from "react";
import AccountManagerTab from "~components/Accounts/AccountManagerTab";
import PublishHistoryTab from "~components/History/PublishHistoryTab";
import MatrixQueueTab from "~components/Queue/MatrixQueueTab";
import SettingsTab from "~components/Sync/SettingsTab";

const App: React.FC = () => {
  return (
    <HeroUIProvider>
      <main className="min-h-screen bg-background text-foreground">
        <header className="sticky top-0 z-20 border-b border-divider bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
            <div>
              <div className="text-xl font-semibold">Social Publisher</div>
              <div className="text-xs text-default-500">招聘 · 产品 · 经销商/B2B 矩阵推广工作台</div>
            </div>
            <div className="rounded-full bg-warning-100 px-3 py-1 text-xs text-warning-700">
              Safe Publish
            </div>
          </div>
        </header>

        <section className="mx-auto max-w-7xl px-6 py-6">
          <Tabs aria-label="Social Publisher" variant="underlined" color="primary" defaultSelectedKey="queue">

            <Tab
              key="queue"
              title={
                <div className="flex items-center gap-2">
                  <Megaphone className="size-4" />
                  <span>推广工作台</span>
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
                  <span>账号矩阵</span>
                </div>
              }>
              <div className="pt-4">
                <AccountManagerTab />
              </div>
            </Tab>

            <Tab
              key="history"
              title={
                <div className="flex items-center gap-2">
                  <History className="size-4" />
                  <span>发布记录</span>
                </div>
              }>
              <div className="pt-4">
                <PublishHistoryTab />
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
