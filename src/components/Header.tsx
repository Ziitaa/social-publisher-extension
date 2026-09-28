import type React from "react";

const Header: React.FC = () => {
  return (
    <header className="border-b border-divider bg-background">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold">Social Publisher</h1>
          <p className="text-xs text-default-500">本地安全发布工作台</p>
        </div>
        <span className="rounded-full bg-warning-100 px-3 py-1 text-xs text-warning-700">Safe Publish</span>
      </div>
    </header>
  );
};

export default Header;
