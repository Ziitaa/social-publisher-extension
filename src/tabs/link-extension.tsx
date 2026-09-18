import "~style.css";
import { HeroUIProvider } from "@heroui/react";

export default function LinkExtension() {
  return (
    <HeroUIProvider>
      <main className="flex min-h-screen items-center justify-center bg-background p-8 text-foreground">
        <div className="max-w-lg rounded-2xl border border-divider bg-content1 p-8 shadow-sm">
          <h1 className="text-xl font-semibold">Social Publisher</h1>
          <p className="mt-3 text-sm text-default-600">
            此独立版本已停用 MultiPost SaaS 的扩展绑定与 API Key 连接。
          </p>
          <p className="mt-2 text-xs text-default-500">
            发布任务请直接从本地扩展工作台创建。
          </p>
        </div>
      </main>
    </HeroUIProvider>
  );
}
