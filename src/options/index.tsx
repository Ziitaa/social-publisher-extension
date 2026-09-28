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
        <section className="mx-auto max-w-7xl px-6 py-6">
          <Tabs aria-label="矩阵发布工作台" variant="underlined" color="primary" defaultSelectedKey="queue">
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
