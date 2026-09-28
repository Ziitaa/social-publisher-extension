import { Card, CardBody } from "@heroui/react";
import type React from "react";

const AboutTab: React.FC = () => {
  return (
    <div className="flex flex-col gap-4">
      <Card className="shadow-none bg-default-50">
        <CardBody className="gap-4">
          <div>
            <h2 className="text-2xl font-bold">Social Publisher</h2>
            <p className="text-sm text-foreground/60">v{chrome.runtime.getManifest().version}</p>
          </div>
          <p className="text-sm text-foreground/80">
            基于 MultiPost-Extension 的独立安全发布版本。发布工作台运行在本地扩展中，不依赖 MultiPost SaaS。
          </p>
          <p className="text-xs text-default-500">
            默认仅填充；小红书固定仅填充。平台适配器仍来自上游开源项目并按 Apache-2.0 许可保留归属。
          </p>
        </CardBody>
      </Card>
    </div>
  );
};

export default AboutTab;
