import { getAccountInfoFromPlatformInfo, getAccountInfoFromPlatformInfos } from "./account";
import { ArticleInfoMap } from "./article";
import { DynamicInfoMap } from "./dynamic";
import { getExtraConfigFromPlatformInfo, getExtraConfigFromPlatformInfos } from "./extraconfig";
import { PodcastInfoMap } from "./podcast";
import { VideoInfoMap } from "./video";

export type PublishMode = "fill" | "auto";

export interface SyncDataPlatform {
  name: string;
  injectUrl?: string;
  publishMode?: PublishMode;
  extraConfig?:
    | {
        customInjectUrls?: string[];
      }
    | unknown;
}

export interface SyncData {
  platforms: SyncDataPlatform[];
  isAutoPublish: boolean;
  data: DynamicData | ArticleData | VideoData | PodcastData;
  origin?: DynamicData | ArticleData | VideoData | PodcastData;
}

export interface DynamicData {
  title: string;
  content: string;
  images: FileData[];
  videos: FileData[];
  tags?: string[];
  scheduledPublishTime?: number;
}

export interface PodcastData {
  title: string;
  description: string;
  audio: FileData;
  cover?: FileData;
  tags?: string[];
  category?: string | number;
}

export interface FileData {
  name: string;
  url: string;
  type?: string;
  size?: number;
}

export interface ArticleData {
  title: string;
  digest: string;
  cover: FileData;
  htmlContent: string;
  markdownContent: string;
  images?: FileData[];
  tags?: string[];
  category?: string | number;
  original?: boolean;
  allowComment?: boolean;
  wordFileData?: FileData;
  scheduledPublishTime?: number;
}

export interface VideoData {
  title: string;
  content: string;
  video: FileData;
  tags?: string[];
  cover?: FileData;
  verticalCover?: FileData;
  horizontalCover?: FileData;
  videoFile?: File;
  scheduledPublishTime?: number;
  category?: string | number;
  original?: boolean;
  collectionId?: string | number;
  description?: string;
}

export interface PlatformInfo {
  type: "DYNAMIC" | "VIDEO" | "ARTICLE" | "PODCAST";
  name: string;
  homeUrl: string;
  faviconUrl?: string;
  iconifyIcon?: string;
  platformName: string;
  injectUrl: string;
  injectFunction: (data: SyncData) => Promise<void>;
  tags?: string[];
  accountKey: string;
  accountInfo?: AccountInfo;
  extraConfig?: unknown;
}

export interface AccountInfo {
  provider: string;
  accountId: string;
  username: string;
  description?: string;
  profileUrl?: string;
  avatarUrl?: string;
  extraData: unknown;
}

const BRAND_ICON_BY_ACCOUNT_KEY: Record<string, string> = {
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

function normalizePlatformVisual(info: PlatformInfo): PlatformInfo {
  return {
    ...info,
    iconifyIcon: BRAND_ICON_BY_ACCOUNT_KEY[info.accountKey] || info.iconifyIcon,
  };
}

export const infoMap: Record<string, PlatformInfo> = {
  ...DynamicInfoMap,
  ...ArticleInfoMap,
  ...VideoInfoMap,
  ...PodcastInfoMap,
};

export function isForcedFillPlatform(platformName: string): boolean {
  return platformName.includes("REDNOTE");
}

export function getPlatformPublishMode(platform: SyncDataPlatform): PublishMode {
  if (isForcedFillPlatform(platform.name)) return "fill";
  return platform.publishMode === "auto" ? "auto" : "fill";
}

export function getPlatformSyncData(data: SyncData, platform: SyncDataPlatform): SyncData {
  const publishMode = getPlatformPublishMode(platform);
  return {
    ...data,
    platforms: [{ ...platform, publishMode }],
    isAutoPublish: publishMode === "auto",
  };
}

export async function getPlatformInfo(platform: string): Promise<PlatformInfo | null> {
  const platformInfo = infoMap[platform];
  if (platformInfo) {
    return normalizePlatformVisual(await getExtraConfigFromPlatformInfo(await getAccountInfoFromPlatformInfo(platformInfo)));
  }
  return null;
}

export function getRawPlatformInfo(platform: string): PlatformInfo | null {
  const info = infoMap[platform];
  return info ? normalizePlatformVisual(info) : null;
}

export async function getPlatformInfos(type?: "DYNAMIC" | "VIDEO" | "ARTICLE" | "PODCAST"): Promise<PlatformInfo[]> {
  const platformInfos: PlatformInfo[] = [];
  for (const info of Object.values(infoMap)) {
    if (type && info.type !== type) continue;
    platformInfos.push(normalizePlatformVisual(info));
  }

  const hydrated = await getExtraConfigFromPlatformInfos(await getAccountInfoFromPlatformInfos(platformInfos));
  return hydrated.map(normalizePlatformVisual);
}

export async function createTabsForPlatforms(data: SyncData) {
  const tabs: { tab: chrome.tabs.Tab; platformInfo: SyncDataPlatform }[] = [];
  let groupId: number | undefined;

  for (const info of data.platforms) {
    let tab: chrome.tabs.Tab | null = null;
    if (info) {
      const extraConfig = info.extraConfig as { customInjectUrls?: string[] };
      if (extraConfig?.customInjectUrls && extraConfig.customInjectUrls.length > 0) {
        for (const url of extraConfig.customInjectUrls) {
          tab = await chrome.tabs.create({ url });
          info.injectUrl = url;
          await new Promise<void>((resolve) => {
            chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
              if (tabId === tab!.id && info.status === "complete") {
                chrome.tabs.onUpdated.removeListener(listener);
                resolve();
              }
            });
          });
        }
      } else {
        if (info.injectUrl) {
          tab = await chrome.tabs.create({ url: info.injectUrl });
        } else {
          const platformInfo = infoMap[info.name];
          if (platformInfo) {
            tab = await chrome.tabs.create({ url: platformInfo.injectUrl });
          }
        }
        if (tab) {
          await injectScriptsToTabs([{ tab, platformInfo: info }], data);
          await chrome.tabs.update(tab.id!, { active: true });
          tabs.push({
            tab,
            platformInfo: info,
          });

          if (!groupId) {
            groupId = await chrome.tabs.group({ tabIds: [tab.id!] });
            await chrome.tabGroups.update(groupId, {
              color: "blue",
              title: `矩阵发布-${new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`,
            });
          } else {
            await chrome.tabs.group({ tabIds: [tab.id!], groupId });
          }
          await new Promise<void>((resolve) => {
            chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
              if (tabId === tab!.id && info.status === "complete") {
                chrome.tabs.onUpdated.removeListener(listener);
                resolve();
              }
            });
          });
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }
    }
  }

  return tabs;
}

export async function injectScriptsToTabs(
  tabs: { tab: chrome.tabs.Tab; platformInfo: SyncDataPlatform }[],
  data: SyncData,
) {
  for (const t of tabs) {
    const tab = t.tab;
    const platform = t.platformInfo;
    if (tab.id) {
      chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
        if (tabId === tab.id && info.status === "complete") {
          chrome.tabs.onUpdated.removeListener(listener);
          getPlatformInfo(platform.name).then((info) => {
            if (info) {
              chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: info.injectFunction,
                args: [getPlatformSyncData(data, platform)],
              });
            }
          });
        }
      });
    }
  }
}
