import { Icon } from "@iconify/react";
import type React from "react";

const BRAND_ICON_BY_KEY: Record<string, string> = {
  douyin: "simple-icons:tiktok",
  rednote: "simple-icons:xiaohongshu",
  tiktok: "simple-icons:tiktok",
  x: "simple-icons:x",
  bilibili: "ant-design:bilibili-outlined",
  weixinchannel: "simple-icons:wechat",
  weixin: "simple-icons:wechat",
  weibo: "simple-icons:sinaweibo",
  kuaishou: "simple-icons:kuaishou",
  zhihu: "simple-icons:zhihu",
  toutiao: "simple-icons:toutiao",
  toutiaohao: "simple-icons:toutiao",
  baijiahao: "simple-icons:baidu",
  instagram: "simple-icons:instagram",
  facebook: "simple-icons:facebook",
  linkedin: "simple-icons:linkedin",
  youtube: "simple-icons:youtube",
  pinterest: "simple-icons:pinterest",
  threads: "simple-icons:threads",
  reddit: "simple-icons:reddit",
  bluesky: "simple-icons:bluesky",
  substack: "simple-icons:substack",
  qie: "simple-icons:tencentqq",
  webhook: "mdi:webhook",
};

type PlatformIconProps = {
  platformKey: string;
  iconifyIcon?: string;
  faviconUrl?: string;
  size?: "sm" | "md";
};

const PlatformIcon: React.FC<PlatformIconProps> = ({ platformKey, iconifyIcon, faviconUrl, size = "md" }) => {
  const icon = BRAND_ICON_BY_KEY[platformKey] || iconifyIcon;
  const boxClass = size === "sm" ? "size-4" : "size-6";
  const iconClass = size === "sm" ? "size-3.5" : "size-5";

  return (
    <span className={`flex ${boxClass} shrink-0 items-center justify-center overflow-hidden rounded-md`} aria-hidden="true">
      {icon ? (
        <Icon icon={icon} className={iconClass} />
      ) : faviconUrl ? (
        <img src={faviconUrl} alt="" className={`${iconClass} shrink-0 object-contain`} />
      ) : (
        <span className={`${iconClass} rounded bg-default-200`} />
      )}
    </span>
  );
};

export default PlatformIcon;
