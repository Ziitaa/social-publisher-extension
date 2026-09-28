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

const BRAND_COLOR_BY_KEY: Record<string, string> = {
  douyin: "#111111",
  rednote: "#ff2442",
  tiktok: "#111111",
  x: "#111111",
  bilibili: "#00aeec",
  weixinchannel: "#07c160",
  weixin: "#07c160",
  weibo: "#e6162d",
  kuaishou: "#ff4906",
  zhihu: "#0084ff",
  toutiao: "#f04142",
  toutiaohao: "#f04142",
  baijiahao: "#2932e1",
  instagram: "#e4405f",
  facebook: "#1877f2",
  linkedin: "#0a66c2",
  youtube: "#ff0000",
  pinterest: "#bd081c",
  threads: "#111111",
  reddit: "#ff4500",
  bluesky: "#0285ff",
  substack: "#ff6719",
  qie: "#12b7f5",
};

type PlatformIconProps = {
  platformKey: string;
  iconifyIcon?: string;
  faviconUrl?: string;
  size?: "sm" | "md";
};

const PlatformIcon: React.FC<PlatformIconProps> = ({ platformKey, iconifyIcon, faviconUrl, size = "md" }) => {
  const icon = BRAND_ICON_BY_KEY[platformKey] || iconifyIcon;
  const color = BRAND_COLOR_BY_KEY[platformKey];
  const boxPx = size === "sm" ? 16 : 24;
  const iconPx = size === "sm" ? 14 : 20;

  const boxStyle: React.CSSProperties = {
    width: boxPx,
    height: boxPx,
    minWidth: boxPx,
    minHeight: boxPx,
    maxWidth: boxPx,
    maxHeight: boxPx,
    flex: `0 0 ${boxPx}px`,
    overflow: "hidden",
  };

  const iconStyle: React.CSSProperties = {
    width: iconPx,
    height: iconPx,
    minWidth: iconPx,
    minHeight: iconPx,
    maxWidth: iconPx,
    maxHeight: iconPx,
    objectFit: "contain",
    ...(color ? { color } : {}),
  };

  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-md" style={boxStyle} aria-hidden="true">
      {icon ? (
        <Icon icon={icon} style={iconStyle} />
      ) : faviconUrl ? (
        <img src={faviconUrl} alt="" style={iconStyle} />
      ) : (
        <span className="rounded bg-default-200" style={iconStyle} />
      )}
    </span>
  );
};

export default PlatformIcon;
