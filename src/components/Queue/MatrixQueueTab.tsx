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
  listMatrixTasks,
  listSessionAccounts,
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
  const [selected, setSelected] = useState<string[]>([]);
  const [contentType, setContentType] = useState<ContentType>("DYNAMIC");
  const [publishMode, setPublishMode] = useState<PublishMode>("fill");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<FileData[]>([]);
  const [video, setVideo] = useState<FileData | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const reload = async () => {
    try {
      const [nextAccounts, nextTasks, nextPlatforms] = await Promise.all([
        listSessionAccounts(),
        listMatrixTasks(),
        getPlatformInfos(contentType),
      ]);
      setAccounts(nextAccounts);
      setTasks(nextTasks);
      const unique = new Map<string, PlatformInfo>();
      for (const info of nextPlatforms) {
        if (!unique.has(info.accountKey)) unique.set(info.accountKey, info);
      }
      setPlatforms(Array.from(unique.values()));
    } catch {
      setMessage("本地发布服务未连接。正式安装后会随 Windows 自动启动。");
    }
  };

  useEffect(() => {
    reload();
    const timer = window.setInterval(reload, 5000);
    return () => window.clearInterval(timer);
  }, [contentType]);

  const grouped = useMemo(() => {
    return platforms.map((platformInfo) => ({
      platformInfo,
      accounts: accounts.filter((account) => account.platform === platformInfo.accountKey),
    }));
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

      await enqueueMatrixBatch({
        accountIds,
        contentType,
        sharedData,
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
            <h3 className="text-lg font-semibold">批量发布队列</h3>
            <p className="text-sm text-default-500">
              选择多个账号后创建任务。每个账号由自己的独立 Chrome 会话领取任务，不共享登录状态。
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
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
              <Button variant="flat" onPress={selectAll}>全选账号</Button>
              <Button variant="light" onPress={clearSelection}>清空</Button>
            </div>
          </div>

          <Input label="标题" value={title} onValueChange={setTitle} />
          <Textarea label="正文" value={content} onValueChange={setContent} minRows={5} />

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
              加入发布队列（{selected.length}）
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
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {grouped.map(({ platformInfo, accounts: items }) => {
              const selectedCount = items.filter((item) => selected.includes(item.id)).length;
              return (
                <div
                  key={platformInfo.accountKey}
                  className={`rounded-xl border p-3 ${items.length ? "border-divider" : "border-divider bg-default-50 opacity-70"}`}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {platformInfo.iconifyIcon ? (
                        <Icon icon={platformInfo.iconifyIcon} className="size-5" />
                      ) : platformInfo.faviconUrl ? (
                        <img src={platformInfo.faviconUrl} alt="" className="size-5 rounded-sm" />
                      ) : null}
                      <div>
                        <div className="font-medium">{platformInfo.platformName}</div>
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
                        <label key={account.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg p-2 hover:bg-default-100">
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
