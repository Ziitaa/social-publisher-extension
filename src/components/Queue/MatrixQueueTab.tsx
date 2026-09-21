import {
  Button,
  Card,
  CardBody,
  Checkbox,
  Chip,
  Input,
  Select,
  SelectItem,
  Textarea,
} from "@heroui/react";
import { Play, RefreshCw, Send, Upload, UsersRound } from "lucide-react";
import { Icon } from "@iconify/react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  enqueueMatrixBatch,
  launchSessionAccount,
  listAccountGroups,
  listMatrixTasks,
  listSessionAccounts,
  type AccountGroup,
  type MatrixTask,
  type SessionManagerAccount,
} from "~session-manager-client";
import { getPlatformInfos, isForcedFillPlatform, type FileData, type PlatformInfo, type PublishMode } from "~sync/common";

type ContentType = "DYNAMIC" | "VIDEO";

async function fileToDataUrl(file: File): Promise<FileData> {
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error("文件读取失败"));
    reader.readAsDataURL(file);
  });
  return {
    name: file.name,
    type: file.type,
    size: file.size,
    url,
  };
}

const MatrixQueueTab: React.FC = () => {
  const [accounts, setAccounts] = useState<SessionManagerAccount[]>([]);
  const [tasks, setTasks] = useState<MatrixTask[]>([]);
  const [platforms, setPlatforms] = useState<PlatformInfo[]>([]);
  const [groups, setGroups] = useState<AccountGroup[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [contentType, setContentType] = useState<ContentType>("DYNAMIC");
  const [campaignType, setCampaignType] = useState<"recruitment" | "product" | "b2b" | "custom">("recruitment");
  const [campaignName, setCampaignName] = useState("");
  const [publishMode, setPublishMode] = useState<PublishMode>("fill");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [variantB, setVariantB] = useState("");
  const [variantC, setVariantC] = useState("");
  const [images, setImages] = useState<FileData[]>([]);
  const [video, setVideo] = useState<FileData | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const reload = async () => {
    try {
      const [nextAccounts, nextTasks, nextPlatforms, nextGroups] = await Promise.all([
        listSessionAccounts(),
        listMatrixTasks(),
        getPlatformInfos(contentType),
        listAccountGroups(),
      ]);
      setAccounts(nextAccounts);
      setTasks(nextTasks);
      const unique = new Map<string, PlatformInfo>();
      for (const info of nextPlatforms) {
        if (!unique.has(info.accountKey)) unique.set(info.accountKey, info);
      }
      setPlatforms(Array.from(unique.values()));
      setGroups(nextGroups);
    } catch {
      setMessage("本地发布服务未连接。正式安装后会随 Windows 自动启动。");
    }
  };

  useEffect(() => {
    reload();
    const timer = window.setInterval(reload, 5000);
    return () => window.clearInterval(timer);
  }, [contentType]);

  const platformGroups = useMemo(() => {
    const domesticPriority = [
      "douyin",
      "rednote",
      "weixinchannel",
      "weixin",
      "bilibili",
      "weibo",
      "kuaishou",
      "zhihu",
      "toutiao",
      "toutiaohao",
      "baijiahao",
    ];
    const internationalPriority = [
      "tiktok",
      "instagram",
      "facebook",
      "x",
      "linkedin",
      "youtube",
      "pinterest",
      "threads",
      "reddit",
      "bluesky",
    ];

    const rank = (key: string, priority: string[]) => {
      const index = priority.indexOf(key);
      return index === -1 ? Number.MAX_SAFE_INTEGER : index;
    };

    const decorate = (items: PlatformInfo[]) =>
      items
        .map((platformInfo) => ({
          platformInfo,
          accounts: accounts.filter((account) => account.platform === platformInfo.accountKey),
        }));

    const domestic = platforms.filter((item) => item.tags?.includes("CN"));
    const international = platforms.filter((item) => !item.tags?.includes("CN"));

    const domesticCommon = decorate(domestic.filter((item) => domesticPriority.includes(item.accountKey)))
      .sort((a, b) => rank(a.platformInfo.accountKey, domesticPriority) - rank(b.platformInfo.accountKey, domesticPriority));
    const domesticOther = decorate(domestic.filter((item) => !domesticPriority.includes(item.accountKey)))
      .sort((a, b) => a.platformInfo.platformName.localeCompare(b.platformInfo.platformName, "zh-CN"));

    const internationalCommon = decorate(international.filter((item) => internationalPriority.includes(item.accountKey)))
      .sort((a, b) => rank(a.platformInfo.accountKey, internationalPriority) - rank(b.platformInfo.accountKey, internationalPriority));
    const internationalOther = decorate(international.filter((item) => !internationalPriority.includes(item.accountKey)))
      .sort((a, b) => a.platformInfo.platformName.localeCompare(b.platformInfo.platformName, "en"));

    return [
      { key: "domestic-common", title: "国内常用", items: domesticCommon },
      { key: "domestic-other", title: "国内其他", items: domesticOther },
      { key: "international-common", title: "国际常用", items: internationalCommon },
      { key: "international-other", title: "国际其他", items: internationalOther },
    ].filter((group) => group.items.length > 0);
  }, [accounts, platforms]);

  const toggleAccount = (id: string, checked: boolean) => {
    setSelected((prev) => (checked ? [...new Set([...prev, id])] : prev.filter((item) => item !== id)));
  };

  const selectAll = () => {
    const supportedKeys = new Set(platforms.map((item) => item.accountKey));
    setSelected(accounts.filter((account) => supportedKeys.has(account.platform)).map((account) => account.id));
  };
  const clearSelection = () => setSelected([]);

  const handleImages = async (files: FileList | null) => {
    if (!files) return;
    const next = await Promise.all(Array.from(files).filter((file) => file.type.startsWith("image/")).map(fileToDataUrl));
    setImages(next);
  };

  const handleVideo = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || !file.type.startsWith("video/")) return;
    setVideo(await fileToDataUrl(file));
  };

  const launchSelected = async () => {
    if (!selected.length) return;
    setBusy(true);
    try {
      for (const id of selected) {
        await launchSessionAccount(id);
      }
      setMessage("已启动所选账号会话。第一次使用时请分别在弹出的 Chrome 窗口中完成登录。");
      await reload();
    } catch (error) {
      setMessage(String(error instanceof Error ? error.message : error));
    } finally {
      setBusy(false);
    }
  };

  const enqueue = async () => {
    if (!selected.length) {
      setMessage("请至少选择一个账号。");
      return;
    }
    if (!content.trim() && !title.trim()) {
      setMessage("请先填写内容。");
      return;
    }
    if (contentType === "VIDEO" && !video) {
      setMessage("视频任务需要先上传视频。");
      return;
    }

    setBusy(true);
    try {
      const platformInfos = await getPlatformInfos(contentType);
      const platformByAccount: Record<string, unknown> = {};
      const unsupported: string[] = [];

      for (const id of selected) {
        const account = accounts.find((item) => item.id === id);
        if (!account) continue;

        const platform = platformInfos.find((item) => item.accountKey === account.platform);
        if (!platform) {
          unsupported.push(account.label);
          continue;
        }

        const effectiveMode: PublishMode = isForcedFillPlatform(platform.name) ? "fill" : publishMode;
        platformByAccount[id] = {
          name: platform.name,
          injectUrl: platform.injectUrl,
          extraConfig: platform.extraConfig || {},
          publishMode: effectiveMode,
        };
      }

      const accountIds = selected.filter((id) => platformByAccount[id]);
      if (!accountIds.length) {
        setMessage("所选账号没有匹配当前内容类型的平台适配器。");
        return;
      }

      const sharedData =
        contentType === "VIDEO"
          ? {
              title,
              content,
              video: video!,
            }
          : {
              title,
              content,
              images,
              videos: [],
            };

      const sharedVariants = [
        { title, content },
        ...(variantB.trim() ? [{ title, content: variantB.trim() }] : []),
        ...(variantC.trim() ? [{ title, content: variantC.trim() }] : []),
      ];

      await enqueueMatrixBatch({
        accountIds,
        contentType,
        campaignName: campaignName.trim() || undefined,
        campaignType,
        sharedData,
        sharedVariants,
        platformByAccount,
      });
      setMessage(
        `已加入 ${accountIds.length} 个账号任务。${unsupported.length ? ` 未支持：${unsupported.join("、")}` : ""}`,
      );
      await reload();
    } catch (error) {
      setMessage(String(error instanceof Error ? error.message : error));
    } finally {
      setBusy(false);
    }
  };

  const statusColor = (status: MatrixTask["status"]) => {
    if (status === "failed") return "danger" as const;
    if (status === "dispatched") return "success" as const;
    return "warning" as const;
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="shadow-none bg-default-50">
        <CardBody className="gap-4">
          <div>
            <h3 className="text-lg font-semibold">推广工作台</h3>
            <p className="text-sm text-default-500">
              从推广目标出发创建任务，选择账号组或具体账号；可设置多版文案，系统会在账号间轮换分配。
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Select
              label="推广类型"
              selectedKeys={[campaignType]}
              onSelectionChange={(keys) => {
                const next = Array.from(keys)[0];
                if (next) setCampaignType(String(next) as typeof campaignType);
              }}>
              <SelectItem key="recruitment">招聘推广</SelectItem>
              <SelectItem key="product">产品推广</SelectItem>
              <SelectItem key="b2b">经销商 / B2B</SelectItem>
              <SelectItem key="custom">自定义</SelectItem>
            </Select>
            <Input
              label="推广任务名称"
              placeholder="例如：销售主管招聘 09/21"
              value={campaignName}
              onValueChange={setCampaignName}
            />
            <Select
              label="内容类型"
              selectedKeys={[contentType]}
              onSelectionChange={(keys) => {
                const next = Array.from(keys)[0];
                if (next) setContentType(String(next) as ContentType);
              }}>
              <SelectItem key="DYNAMIC">图文 / 动态</SelectItem>
              <SelectItem key="VIDEO">视频</SelectItem>
            </Select>
          </div>

          {groups.length > 0 && (
            <div>
              <div className="mb-2 text-sm font-medium">账号组</div>
              <div className="flex flex-wrap gap-2">
                {groups.map((group) => (
                  <Button
                    key={group.id}
                    size="sm"
                    variant="flat"
                    onPress={() => {
                      const ids = group.accountIds.filter((id) => accounts.some((account) => account.id === id));
                      setSelected(ids);
                      setMessage(`已选择账号组“${group.name}”，共 ${ids.length} 个账号。`);
                    }}>
                    {group.name} · {group.accountIds.length}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-3">
            <Select
              label="发布模式"
              selectedKeys={[publishMode]}
              onSelectionChange={(keys) => {
                const next = Array.from(keys)[0];
                if (next) setPublishMode(String(next) as PublishMode);
              }}>
              <SelectItem key="fill">仅填充</SelectItem>
              <SelectItem key="auto">自动发布（支持的平台）</SelectItem>
            </Select>
            <div className="flex items-end gap-2">
              <Button variant="flat" onPress={selectAll}>全选可用账号</Button>
              <Button variant="light" onPress={clearSelection}>清空</Button>
            </div>
          </div>

          <Input label="标题" value={title} onValueChange={setTitle} />
          <Textarea label="主文案 A" value={content} onValueChange={setContent} minRows={5} />

          <details className="rounded-xl border border-divider bg-content1 p-3">
            <summary className="cursor-pointer text-sm font-medium">内容变体（可选，用于矩阵轮换）</summary>
            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <Textarea
                label="文案 B"
                placeholder="留空则全部使用 A；填写后账号会在 A / B 之间轮换。"
                value={variantB}
                onValueChange={setVariantB}
                minRows={4}
              />
              <Textarea
                label="文案 C"
                placeholder="可继续增加第三版文案，账号会按 A / B / C 轮换。"
                value={variantC}
                onValueChange={setVariantC}
                minRows={4}
              />
            </div>
          </details>

          {contentType === "DYNAMIC" ? (
            <div>
              <input
                ref={imageRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => handleImages(event.target.files)}
              />
              <Button startContent={<Upload className="size-4" />} variant="flat" onPress={() => imageRef.current?.click()}>
                选择图片{images.length ? `（${images.length} 张）` : ""}
              </Button>
            </div>
          ) : (
            <div>
              <input
                ref={videoRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(event) => handleVideo(event.target.files)}
              />
              <Button startContent={<Upload className="size-4" />} variant="flat" onPress={() => videoRef.current?.click()}>
                {video ? `已选择：${video.name}` : "选择视频"}
              </Button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="flat"
              startContent={<Play className="size-4" />}
              isDisabled={!selected.length || busy}
              onPress={launchSelected}>
              启动所选会话
            </Button>
            <Button
              color="primary"
              startContent={<Send className="size-4" />}
              isDisabled={!selected.length || busy}
              onPress={enqueue}>
              创建推广任务（{selected.length}）
            </Button>
            <Button isIconOnly variant="light" aria-label="刷新" onPress={reload}>
              <RefreshCw className="size-4" />
            </Button>
          </div>
          {message && <div className="text-sm text-default-600">{message}</div>}
        </CardBody>
      </Card>

      <Card className="shadow-none bg-default-50">
        <CardBody className="gap-4">
          <div className="flex items-center gap-2">
            <UsersRound className="size-5" />
            <h4 className="font-semibold">选择账号</h4>
            <span className="text-xs text-default-500">{selected.length}/{accounts.length}</span>
          </div>
          <div className="flex flex-col gap-6">
            {platformGroups.map((group) => (
              <section key={group.key}>
                <div className="mb-3 flex items-center justify-between">
                  <h5 className="text-sm font-semibold text-default-700">{group.title}</h5>
                  <span className="text-xs text-default-400">{group.items.length} 个平台</span>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {group.items.map(({ platformInfo, accounts: items }) => {
                    const selectedCount = items.filter((item) => selected.includes(item.id)).length;
                    return (
                      <div
                        key={platformInfo.accountKey}
                        className={`rounded-xl border p-3 ${items.length ? "border-divider" : "border-divider bg-default-50 opacity-75"}`}>
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <div className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-md bg-default-100">
                              {platformInfo.iconifyIcon ? (
                                <Icon icon={platformInfo.iconifyIcon} className="!size-5" />
                              ) : platformInfo.faviconUrl ? (
                                <img
                                  src={platformInfo.faviconUrl}
                                  alt=""
                                  className="!h-5 !w-5 max-h-5 max-w-5 object-contain"
                                />
                              ) : null}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-medium">{platformInfo.platformName}</div>
                              <div className="text-xs text-default-500">
                                {items.length ? `${items.length} 个账号 · 已选 ${selectedCount}` : "0 个账号 · 去账号池添加"}
                              </div>
                            </div>
                          </div>

                          {items.length > 0 && (
                            <Button
                              size="sm"
                              variant="light"
                              onPress={() => {
                                const ids = items.map((item) => item.id);
                                const allSelected = ids.every((id) => selected.includes(id));
                                setSelected((prev) =>
                                  allSelected
                                    ? prev.filter((id) => !ids.includes(id))
                                    : [...new Set([...prev, ...ids])],
                                );
                              }}>
                              {selectedCount === items.length ? "取消全选" : "全选"}
                            </Button>
                          )}
                        </div>

                        {items.length > 0 ? (
                          <div className="flex flex-col gap-2">
                            {items.map((account) => (
                              <label
                                key={account.id}
                                className="flex cursor-pointer items-center justify-between gap-3 rounded-lg p-2 hover:bg-default-100">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    isSelected={selected.includes(account.id)}
                                    onValueChange={(checked) => toggleAccount(account.id, checked)}
                                  />
                                  <div>
                                    <div className="text-sm font-medium">{account.label}</div>
                                    <div className="text-xs text-default-500">{account.username || "未填写用户名"}</div>
                                  </div>
                                </div>
                                <Chip
                                  size="sm"
                                  variant="flat"
                                  color={account.sessionStatus === "ready" ? "success" : "default"}>
                                  {account.sessionStatus === "ready" ? "会话就绪" : "未启动"}
                                </Chip>
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-lg bg-default-100 p-3 text-xs text-default-500">
                            此平台已支持发布，但还没有加入任何账号。
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
          {!platforms.length && <div className="text-sm text-default-500">暂无可用平台适配器。</div>}
        </CardBody>
      </Card>

      <Card className="shadow-none bg-default-50">
        <CardBody className="gap-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">最近任务</h4>
            <span className="text-xs text-default-500">最近 {Math.min(tasks.length, 30)} 条</span>
          </div>
          <div className="flex flex-col divide-y divide-divider">
            {tasks.slice(0, 30).map((task) => {
              const account = accounts.find((item) => item.id === task.accountId);
              return (
                <div key={task.id} className="flex items-center justify-between gap-4 py-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{account?.label || task.accountId.slice(0, 8)}</div>
                    <div className="text-xs text-default-500">
                      {task.contentType || task.payload?.contentType} · {new Date(task.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <Chip size="sm" variant="flat" color={statusColor(task.status)}>
                    {task.status === "queued" ? "排队中" : task.status === "dispatched" ? "已派发" : "失败"}
                  </Chip>
                </div>
              );
            })}
            {!tasks.length && <div className="py-6 text-center text-sm text-default-500">暂无任务</div>}
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default MatrixQueueTab;
