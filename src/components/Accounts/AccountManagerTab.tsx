import { Button, Card, CardBody, Checkbox, Chip, Input, Select, SelectItem } from "@heroui/react";
import { Play, Plus, RefreshCw, Trash2, UsersRound } from "lucide-react";
import { Icon } from "@iconify/react";
import type React from "react";
import { listManagedAccounts, saveManagedAccounts } from "~accounts/pool";
import { useEffect, useMemo, useState } from "react";
import { refreshAccountInfoMap } from "~sync/account";
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

const PLATFORM_PRIORITY = ["douyin", "rednote", "tiktok", "x", "bilibili", "qie", "chejiahao", "dewu"];

const AccountManagerTab: React.FC = () => {
  const [accounts, setAccounts] = useState<SessionManagerAccount[]>([]);
  const [groups, setGroups] = useState<AccountGroup[]>([]);
  const [platform, setPlatform] = useState("douyin");
  const [platformOptions, setPlatformOptions] = useState<PlatformOption[]>([]);
  const [purpose, setPurpose] = useState<"recruitment" | "product" | "b2b" | "general">("recruitment");
  const [owner, setOwner] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupAccountIds, setGroupAccountIds] = useState<string[]>([]);
  const [online, setOnline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

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
        const connectableKeys = new Set(Object.keys(refreshAccountInfoMap));
        const map = new Map<string, PlatformOption>();
        for (const info of infos) {
          if (!connectableKeys.has(info.accountKey)) continue;
          const current = map.get(info.accountKey);
          map.set(info.accountKey, {
            key: info.accountKey,
            label: info.platformName || info.accountKey,
            iconifyIcon: current?.iconifyIcon || info.iconifyIcon,
            faviconUrl: current?.faviconUrl || info.faviconUrl,
            tags: Array.from(new Set([...(current?.tags || []), ...(info.tags || [])])),
            homeUrl: refreshAccountInfoMap[info.accountKey]?.homeUrl || current?.homeUrl || info.homeUrl,
          });
        }
        const options = Array.from(map.values()).sort((a, b) => {
          const ai = PLATFORM_PRIORITY.indexOf(a.key);
          const bi = PLATFORM_PRIORITY.indexOf(b.key);
          if (ai !== -1 || bi !== -1) {
            if (ai === -1) return 1;
            if (bi === -1) return -1;
            return ai - bi;
          }
          return a.label.localeCompare(b.label, "zh-CN");
        });
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

  const selectedPlatform = platformOptions.find((item) => item.key === platform);

  const handleConnect = async () => {
    if (!online || !selectedPlatform) return;
    const id = crypto.randomUUID();
    setBusy(true);
    try {
      await upsertSessionAccount({
        id,
        platform: selectedPlatform.key,
        platformLabel: selectedPlatform.label,
        label: `待识别的${selectedPlatform.label}账号`,
        username: "",
        purpose,
        owner: owner.trim(),
        status: "pending_login",
        homeUrl: selectedPlatform.homeUrl,
      });
      await launchSessionAccount(id);
      setMessage(`已打开 ${selectedPlatform.label} 登录窗口。请扫码或登录，成功后系统会自动识别账号并保存。`);
      await reload();
    } catch (error) {
      await deleteSessionAccount(id).catch(() => undefined);
      setMessage(String(error instanceof Error ? error.message : error));
    } finally {
      setBusy(false);
    }
  };

  const statusChip = (account: SessionManagerAccount) => {
    if (account.sessionStatus === "ready") return <Chip size="sm" color="success" variant="flat">可使用</Chip>;
    if (account.sessionStatus === "starting") return <Chip size="sm" color="warning" variant="flat">等待登录</Chip>;
    if (account.status === "connected") return <Chip size="sm" color="success" variant="flat">已绑定</Chip>;
    return <Chip size="sm" variant="flat">待登录</Chip>;
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="shadow-none bg-default-50">
        <CardBody className="gap-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">账号矩阵</h3>
              <p className="text-sm text-default-500">选择平台并完成一次登录。系统会自动识别账号，之后保留独立登录状态。</p>
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

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[220px_180px_1fr_auto]">
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
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center overflow-hidden">
                      {item.iconifyIcon ? (
                        <Icon icon={item.iconifyIcon} className="h-3.5 w-3.5 shrink-0" />
                      ) : item.faviconUrl ? (
                        <img src={item.faviconUrl} alt="" className="h-3.5 w-3.5 shrink-0 object-contain" />
                      ) : null}
                    </span>
                  }>
                  {item.label}
                </SelectItem>
              ))}
            </Select>
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
            <Input label="负责人（可选）" value={owner} onValueChange={setOwner} />
            <Button
              color="primary"
              className="self-end"
              isDisabled={!online || busy || !selectedPlatform}
              startContent={<Plus className="size-4" />}
              onPress={handleConnect}>
              接入账号
            </Button>
          </div>
          <div className="text-xs text-default-500">接入时会打开独立浏览器窗口。扫码或登录成功后，账号昵称会自动回填。</div>
          {message && <div className="text-xs text-default-600">{message}</div>}

          <div className="mt-2 border-t border-divider pt-4">
            <div className="mb-3 text-sm font-medium">账号组</div>
            <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
              <Input label="新建账号组" value={groupName} onValueChange={setGroupName} />
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
        </CardBody>
      </Card>

      {accounts.length === 0 ? (
        <Card className="shadow-none bg-default-50">
          <CardBody className="items-center gap-2 py-12 text-center">
            <UsersRound className="size-8 text-default-400" />
            <div className="font-medium">{online ? "还没有账号" : "等待 Session Manager"}</div>
            <div className="text-sm text-default-500">
              {online ? "选择一个平台并接入账号，完成扫码后会自动加入账号矩阵。" : "启动后账号池会自动连接本地服务。"}
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
                        {statusChip(account)}
                      </div>
                      <div className="mt-1 text-xs text-default-500">{account.username || "等待自动识别账号"}</div>
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
                            setMessage(account.status === "connected" ? "账号窗口已打开。" : "请在账号窗口完成扫码或登录，系统会自动识别账号。" );
                            await reload();
                          } catch (error) {
                            setMessage(String(error instanceof Error ? error.message : error));
                          }
                        }}>
                        {account.status === "connected" ? "打开账号" : "继续登录"}
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
