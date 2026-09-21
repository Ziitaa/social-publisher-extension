import { Button, Card, CardBody, Checkbox, Chip, Input, Select, SelectItem, Textarea } from "@heroui/react";
import { Play, Plus, RefreshCw, Trash2, UsersRound } from "lucide-react";
import { Icon } from "@iconify/react";
import type React from "react";
import { listManagedAccounts, saveManagedAccounts } from "~accounts/pool";
import { useEffect, useMemo, useState } from "react";
import { getPlatformInfos } from "~sync/common";
import {
  deleteAccountGroup,
  deleteSessionAccount,
  getSessionManagerHealth,
  launchSessionAccount,
  listAccountGroups,
  listSessionAccounts,
  saveAccountGroup,
  type AccountGroup,
  type SessionManagerAccount,
  upsertSessionAccount,
} from "~session-manager-client";

type PlatformOption = {
  key: string;
  label: string;
  iconifyIcon?: string;
  faviconUrl?: string;
  tags: string[];
  homeUrl?: string;
};



const AccountManagerTab: React.FC = () => {
  const [accounts, setAccounts] = useState<SessionManagerAccount[]>([]);
  const [groups, setGroups] = useState<AccountGroup[]>([]);
  const [platform, setPlatform] = useState("douyin");
  const [platformOptions, setPlatformOptions] = useState<PlatformOption[]>([]);
  const [label, setLabel] = useState("");
  const [username, setUsername] = useState("");
  const [purpose, setPurpose] = useState<"recruitment" | "product" | "b2b" | "general">("recruitment");
  const [owner, setOwner] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupAccountIds, setGroupAccountIds] = useState<string[]>([]);
  const [online, setOnline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [bulkText, setBulkText] = useState("");

  const reload = async () => {
    try {
      await getSessionManagerHealth();
      setOnline(true);
      let remoteAccounts = await listSessionAccounts();
      const remoteGroups = await listAccountGroups();
      if (remoteAccounts.length === 0) {
        const legacyAccounts = await listManagedAccounts();
        if (legacyAccounts.length > 0) {
          for (const legacy of legacyAccounts) {
            await upsertSessionAccount({
              id: legacy.id,
              platform: legacy.platform,
              platformLabel: legacy.platformLabel,
              label: legacy.label,
              username: legacy.username || "",
              status: legacy.status || "unknown",
            });
          }
          await saveManagedAccounts([]);
          remoteAccounts = await listSessionAccounts();
        }
      }
      setAccounts(remoteAccounts);
      setGroups(remoteGroups);
    } catch {
      setOnline(false);
      setAccounts([]);
    }
  };

  useEffect(() => {
    getPlatformInfos()
      .then((infos) => {
        const map = new Map<string, PlatformOption>();
        for (const info of infos) {
          const current = map.get(info.accountKey);
          map.set(info.accountKey, {
            key: info.accountKey,
            label: info.platformName || info.accountKey,
            iconifyIcon: current?.iconifyIcon || info.iconifyIcon,
            faviconUrl: current?.faviconUrl || info.faviconUrl,
            tags: Array.from(new Set([...(current?.tags || []), ...(info.tags || [])])),
            homeUrl: current?.homeUrl || info.homeUrl,
          });
        }
        const options = Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, "zh-CN"));
        setPlatformOptions(options);
        if (options.length && !options.some((item) => item.key === platform)) {
          setPlatform(options[0].key);
        }
      })
      .catch(console.error);

    reload();
    const timer = window.setInterval(reload, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, SessionManagerAccount[]>();
    for (const account of accounts) {
      const items = map.get(account.platformLabel) || [];
      items.push(account);
      map.set(account.platformLabel, items);
    }
    return [...map.entries()];
  }, [accounts]);

  const handleAdd = async () => {
    const trimmed = label.trim();
    if (!trimmed || !online) return;
    const platformLabel = platformOptions.find((item) => item.key === platform)?.label || platform;
    setBusy(true);
    try {
      await upsertSessionAccount({
        id: crypto.randomUUID(),
        platform,
        platformLabel,
        label: trimmed,
        username: username.trim(),
        purpose,
        owner: owner.trim(),
        status: "unknown",
        homeUrl: platformOptions.find((item) => item.key === platform)?.homeUrl,
      });
      setLabel("");
      setUsername("");
      setOwner("");
      setMessage("账号已加入账号矩阵。下一步打开账号并完成首次登录。");
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const handleBulkImport = async () => {
    if (!online) return;
    const lines = bulkText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) return;

    const keyByLabel = new Map<string, string>();
    for (const item of platformOptions) {
      keyByLabel.set(item.key.toLowerCase(), item.key);
      keyByLabel.set(item.label.toLowerCase(), item.key);
    }

    setBusy(true);
    let imported = 0;
    const skipped: string[] = [];
    try {
      for (const line of lines) {
        const parts = line.split(/[\t,，]/).map((part) => part.trim());
        const rawPlatform = (parts[0] || "").toLowerCase();
        const accountLabel = parts[1] || "";
        const accountUsername = parts[2] || "";
        const platformKey = keyByLabel.get(rawPlatform);
        if (!platformKey || !accountLabel) {
          skipped.push(line);
          continue;
        }
        const platformLabel = platformOptions.find((item) => item.key === platformKey)?.label || platformKey;
        await upsertSessionAccount({
          id: crypto.randomUUID(),
          platform: platformKey,
          platformLabel,
          label: accountLabel,
          username: accountUsername,
          status: "unknown",
          homeUrl: platformOptions.find((item) => item.key === platformKey)?.homeUrl,
        });
        imported += 1;
      }
      setBulkText("");
      setMessage(`已批量导入 ${imported} 个账号。${skipped.length ? ` 跳过 ${skipped.length} 行格式错误数据。` : ""}`);
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const statusChip = (status?: string) => {
    if (status === "ready") return <Chip size="sm" color="success" variant="flat">可使用</Chip>;
    if (status === "starting") return <Chip size="sm" color="warning" variant="flat">打开中</Chip>;
    return <Chip size="sm" variant="flat">需登录</Chip>;
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="shadow-none bg-default-50">
        <CardBody className="gap-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">账号矩阵</h3>
              <p className="text-sm text-default-500">
                集中管理各平台账号、用途、负责人和账号组。首次使用某个账号时完成一次登录，之后会保留登录状态。
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Chip color={online ? "success" : "danger"} variant="flat" size="sm">
                {online ? "服务正常" : "服务未连接"}
              </Chip>
              <Button isIconOnly size="sm" variant="light" onPress={reload} aria-label="刷新">
                <RefreshCw className="size-4" />
              </Button>
            </div>
          </div>

          {!online && (
            <div className="rounded-xl border border-warning-200 bg-warning-50 p-3 text-sm">
              本地发布服务未连接，请重新打开 Social Publisher；如果仍未恢复再联系维护人员。
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[180px_1fr_1fr_180px_1fr_auto]">
            <Select
              label="平台"
              selectedKeys={[platform]}
              onSelectionChange={(keys) => {
                const next = Array.from(keys)[0];
                if (next) setPlatform(String(next));
              }}>
              {platformOptions.map((item) => (
                <SelectItem
                  key={item.key}
                  startContent={
                    item.iconifyIcon ? (
                      <Icon icon={item.iconifyIcon} className="size-4" />
                    ) : item.faviconUrl ? (
                      <img src={item.faviconUrl} alt="" className="size-4 rounded-sm" />
                    ) : undefined
                  }>
                  {item.label}
                </SelectItem>
              ))}
            </Select>
            <Input label="账号备注名" placeholder="例如：抖音001" value={label} onValueChange={setLabel} />
            <Input label="平台用户名（可选）" placeholder="@username / 昵称" value={username} onValueChange={setUsername} />
            <Select
              label="用途"
              selectedKeys={[purpose]}
              onSelectionChange={(keys) => {
                const next = Array.from(keys)[0];
                if (next) setPurpose(String(next) as typeof purpose);
              }}>
              <SelectItem key="recruitment">招聘</SelectItem>
              <SelectItem key="product">产品推广</SelectItem>
              <SelectItem key="b2b">经销商 / B2B</SelectItem>
              <SelectItem key="general">通用</SelectItem>
            </Select>
            <Input label="负责人（可选）" placeholder="例如：行政 / Elaine" value={owner} onValueChange={setOwner} />
            <Button
              color="primary"
              className="self-end"
              isDisabled={!online || busy}
              startContent={<Plus className="size-4" />}
              onPress={handleAdd}>
              添加
            </Button>
          </div>
          {message && <div className="text-xs text-default-500">{message}</div>}

          <div className="mt-2 border-t border-divider pt-4">
            <div className="mb-3 text-sm font-medium">账号组</div>
            <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
              <Input label="新建账号组" placeholder="例如：招聘矩阵 / 产品推广矩阵 / 海外矩阵" value={groupName} onValueChange={setGroupName} />
              <Button
                className="self-end"
                variant="flat"
                isDisabled={!online || !groupName.trim() || groupAccountIds.length === 0}
                onPress={async () => {
                  await saveAccountGroup({
                    name: groupName.trim(),
                    accountIds: groupAccountIds,
                  });
                  setGroupName("");
                  setGroupAccountIds([]);
                  setMessage("账号组已保存，可在推广工作台一键选择。");
                  await reload();
                }}>
                保存账号组（{groupAccountIds.length}）
              </Button>
            </div>

            {accounts.length > 0 && (
              <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {accounts.map((account) => (
                  <label key={account.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-divider p-2">
                    <Checkbox
                      isSelected={groupAccountIds.includes(account.id)}
                      onValueChange={(checked) =>
                        setGroupAccountIds((prev) =>
                          checked ? [...new Set([...prev, account.id])] : prev.filter((id) => id !== account.id),
                        )
                      }
                    />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{account.label}</div>
                      <div className="truncate text-xs text-default-500">{account.platformLabel}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {groups.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {groups.map((group) => (
                  <Chip
                    key={group.id}
                    variant="flat"
                    onClose={async () => {
                      await deleteAccountGroup(group.id);
                      await reload();
                    }}>
                    {group.name} · {group.accountIds.length}
                  </Chip>
                ))}
              </div>
            )}
          </div>

          <div className="mt-2 border-t border-divider pt-4">
            <div className="mb-2 text-sm font-medium">批量导入账号</div>
            <div className="mb-2 text-xs text-default-500">
              支持全部已适配平台。每行：平台,账号备注名,平台用户名（用户名可留空）。例如：抖音,抖音001,@user01
            </div>
            <Textarea
              value={bulkText}
              onValueChange={setBulkText}
              minRows={4}
              placeholder={"抖音,抖音001,@user01\n抖音,抖音002,@user02\n小红书,小红书001,昵称"}
            />
            <Button className="mt-2" variant="flat" isDisabled={!online || busy || !bulkText.trim()} onPress={handleBulkImport}>
              批量导入
            </Button>
          </div>
        </CardBody>
      </Card>

      {accounts.length === 0 ? (
        <Card className="shadow-none bg-default-50">
          <CardBody className="items-center gap-2 py-12 text-center">
            <UsersRound className="size-8 text-default-400" />
            <div className="font-medium">{online ? "还没有账号" : "等待 Session Manager"}</div>
            <div className="text-sm text-default-500">
              {online ? "先把你要管理的平台账号录进来，再逐个绑定独立会话。" : "启动后账号池会自动连接本地服务。"}
            </div>
          </CardBody>
        </Card>
      ) : (
        grouped.map(([platformName, items]) => (
          <Card key={platformName} className="shadow-none bg-default-50">
            <CardBody className="gap-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">{platformName}</h4>
                <span className="text-xs text-default-500">{items.length} 个账号</span>
              </div>
              <div className="flex flex-col divide-y divide-divider">
                {items.map((account) => (
                  <div key={account.id} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{account.label}</div>
                        {statusChip(account.sessionStatus)}
                      </div>
                      <div className="mt-1 text-xs text-default-500">
                        {account.username || "未填写用户名"} · {account.id.slice(0, 8)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="flat"
                        color={account.sessionStatus === "ready" ? "success" : "primary"}
                        startContent={<Play className="size-4" />}
                        onPress={async () => {
                          setMessage(`正在打开 ${account.label}…`);
                          try {
                            await launchSessionAccount(account.id);
                            setMessage("账号窗口已打开。第一次使用请完成平台登录，以后会保留登录状态。");
                            await reload();
                          } catch (error) {
                            setMessage(String(error instanceof Error ? error.message : error));
                          }
                        }}>
                        {account.sessionStatus === "ready" ? "打开账号" : "登录账号"}
                      </Button>

                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="danger"
                        aria-label="删除账号"
                        onPress={async () => {
                          await deleteSessionAccount(account.id);
                          await reload();
                        }}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        ))
      )}
    </div>
  );
};

export default AccountManagerTab;
