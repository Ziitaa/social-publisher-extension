import { Storage } from "@plasmohq/storage";

export const WORKSPACE_STORAGE_KEY = "social_publisher_workspace";

export interface BrowserWorkspace {
  id: string;
  name: string;
  note?: string;
}

const storage = new Storage({ area: "local" });

export async function getBrowserWorkspace(): Promise<BrowserWorkspace> {
  const existing = await storage.get<BrowserWorkspace>(WORKSPACE_STORAGE_KEY);
  if (existing?.id && existing?.name) return existing;

  const workspace: BrowserWorkspace = {
    id: crypto.randomUUID(),
    name: "默认工作区",
  };
  await storage.set(WORKSPACE_STORAGE_KEY, workspace);
  return workspace;
}

export async function saveBrowserWorkspace(workspace: BrowserWorkspace): Promise<void> {
  await storage.set(WORKSPACE_STORAGE_KEY, workspace);
}
