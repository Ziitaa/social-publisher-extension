import { Button, Card, CardBody, Input, Select, SelectItem } from "@heroui/react";
import { Plus, Trash2, UsersRound } from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  type ManagedAccount,
  type ManagedPlatform,
  listManagedAccounts,
  removeManagedAccount,
  upsertManagedAccount,
} from "~accounts/pool";

const PLATFORM_OPTIONS: Array<{ key: ManagedPlatform; label: string }> = [
  { key: "douyin", label: "抖音" },
  { key: "rednote", label: "小红书" },
  { key: "bilibili", label: "哔哩哔哩" },
  { key: "weibo", label: "微博" },
  { key: "zhihu", label: "知乎" },
  { key: "tiktok", label: "TikTok" },
  { key: "x", label: "X" },
  { key: "youtube", label: "YouTube" },
  { key: "other", label: "其他" },
];

const AccountManagerTab: React.FC = () => {
  const [accounts, setAccounts] = useState<ManagedAccount[]>([]);
  const [platform, setPlatform] = useState<ManagedPlatform>("douyin");
  const [label, setLabel] = useState("");
  const [username, setUsername] = useState("");

  const reload = async () => setAccounts(await listManagedAccounts());

  useEffect(() => {
    reload();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, ManagedAccount[]>();
    for (const account of accounts) {
      const items = map.get(account.platformLabel) || [];
      items.push(account);
      map.set(account.platformLabel, items);
    }
    return [...map.entries()];
  }, [accounts]);

  const handleAdd = async () => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const platformLabel = PLATFORM_OPTIONS.find((item) => item.key === platform)?.label || platform;
    await upsertManagedAccount({
      platform,
      platformLabel,
      label: trimmed,
      username: username.trim(),
      status: "unknown",
    });
    setLabel("");
    setUsername("");
    await reload();
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="shadow-none bg-default-50">
        <CardBody className="gap-3">
          <div>
            <h3 className="text-lg font-semibold">账号池</h3>
            <p className="text-sm text-default-500">
              这里先管理账号记录。真正的独立登录会话将在本地 Session Manager 接入后绑定到每个账号。
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-[180px_1fr_1fr_auto]">
            <Select
              label="平台"
              selectedKeys={[platform]}
              onSelectionChange={(keys) => {
                const next = Array.from(keys)[0] as ManagedPlatform | undefined;
                if (next) setPlatform(next);
              }}>
              {PLATFORM_OPTIONS.map((item) => (
                <SelectItem key={item.key}>{item.label}</SelectItem>
              ))}
            </Select>
            <Input label="账号备注名" placeholder="例如：抖音001" value={label} onValueChange={setLabel} />
            <Input label="平台用户名（可选）" placeholder="@username / 昵称" value={username} onValueChange={setUsername} />
            <Button color="primary" className="self-end" startContent={<Plus className="size-4" />} onPress={handleAdd}>
              添加
            </Button>
          </div>
        </CardBody>
      </Card>

      {accounts.length === 0 ? (
        <Card className="shadow-none bg-default-50">
          <CardBody className="items-center gap-2 py-12 text-center">
            <UsersRound className="size-8 text-default-400" />
            <div className="font-medium">还没有账号</div>
            <div className="text-sm text-default-500">先把你要管理的平台账号批量录进来。</div>
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
                  <div key={account.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <div className="font-medium">{account.label}</div>
                      <div className="text-xs text-default-500">
                        {account.username || "未填写用户名"} · 会话未绑定
                      </div>
                    </div>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      color="danger"
                      aria-label="删除账号"
                      onPress={async () => {
                        await removeManagedAccount(account.id);
                        await reload();
                      }}>
                      <Trash2 className="size-4" />
                    </Button>
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
