import { Card, CardBody, Chip } from "@heroui/react";
import { History } from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { listMatrixTasks, listSessionAccounts, type MatrixTask, type SessionManagerAccount } from "~session-manager-client";

const PublishHistoryTab: React.FC = () => {
  const [tasks, setTasks] = useState<MatrixTask[]>([]);
  const [accounts, setAccounts] = useState<SessionManagerAccount[]>([]);
  const [message, setMessage] = useState("");

  const reload = async () => {
    try {
      const [nextTasks, nextAccounts] = await Promise.all([listMatrixTasks(), listSessionAccounts()]);
      setTasks(nextTasks);
      setAccounts(nextAccounts);
      setMessage("");
    } catch {
      setMessage("本地发布服务未连接。");
    }
  };

  useEffect(() => {
    reload();
    const timer = window.setInterval(reload, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, MatrixTask[]>();
    for (const task of tasks) {
      const key = task.campaignName || "未命名推广任务";
      const items = map.get(key) || [];
      items.push(task);
      map.set(key, items);
    }
    return [...map.entries()];
  }, [tasks]);

  const typeLabel = (type?: MatrixTask["campaignType"]) => {
    if (type === "recruitment") return "招聘";
    if (type === "product") return "产品";
    if (type === "b2b") return "B2B";
    return "自定义";
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="shadow-none bg-default-50">
        <CardBody className="gap-2">
          <div className="flex items-center gap-2">
            <History className="size-5" />
            <h3 className="text-lg font-semibold">发布记录</h3>
          </div>
          <p className="text-sm text-default-500">按推广任务查看账号分发状态。当前“已派发”表示任务已交给平台适配器，不代表平台最终发布成功。</p>
          {message && <div className="text-sm text-danger">{message}</div>}
        </CardBody>
      </Card>

      {grouped.map(([name, items]) => {
        const queued = items.filter((item) => item.status === "queued").length;
        const dispatched = items.filter((item) => item.status === "dispatched").length;
        const failed = items.filter((item) => item.status === "failed").length;
        const newest = Math.max(...items.map((item) => item.createdAt));
        const campaignType = items[0]?.campaignType;

        return (
          <Card key={name} className="shadow-none bg-default-50">
            <CardBody className="gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{name}</h4>
                    <Chip size="sm" variant="flat">{typeLabel(campaignType)}</Chip>
                  </div>
                  <div className="mt-1 text-xs text-default-500">{new Date(newest).toLocaleString()}</div>
                </div>
                <div className="flex gap-2 text-xs">
                  <Chip size="sm" variant="flat" color="warning">排队 {queued}</Chip>
                  <Chip size="sm" variant="flat" color="success">已派发 {dispatched}</Chip>
                  <Chip size="sm" variant="flat" color="danger">失败 {failed}</Chip>
                </div>
              </div>

              <div className="flex flex-col divide-y divide-divider">
                {items.map((task) => {
                  const account = accounts.find((item) => item.id === task.accountId);
                  return (
                    <div key={task.id} className="flex items-center justify-between gap-4 py-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{account?.label || task.accountId.slice(0, 8)}</div>
                        <div className="text-xs text-default-500">{account?.platformLabel || task.platform}</div>
                      </div>
                      <Chip
                        size="sm"
                        variant="flat"
                        color={task.status === "failed" ? "danger" : task.status === "dispatched" ? "success" : "warning"}>
                        {task.status === "queued" ? "排队中" : task.status === "dispatched" ? "已派发" : "失败"}
                      </Chip>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        );
      })}

      {!tasks.length && (
        <Card className="shadow-none bg-default-50">
          <CardBody className="py-12 text-center text-sm text-default-500">还没有发布记录。</CardBody>
        </Card>
      )}
    </div>
  );
};

export default PublishHistoryTab;
