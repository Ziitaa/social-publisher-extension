using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Threading;

internal static class Program
{
    private const string ExtensionId = "clbmikkopbocinhhmckloddbepkmccce";
    private const string HealthUrl = "http://127.0.0.1:2663/api/health";
    private const string LauncherMutexName = "SocialPublisherDesktopLauncher";
    private const string ProductName = "矩阵发布工作台";

    [STAThread]
    private static void Main()
    {
        bool ownsMutex = false;
        using (Mutex mutex = new Mutex(false, LauncherMutexName))
        {
            try
            {
                try
                {
                    ownsMutex = mutex.WaitOne(0, false);
                }
                catch (AbandonedMutexException)
                {
                    ownsMutex = true;
                }

                if (!ownsMutex) return;

                string exeDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar);
                DirectoryInfo parent = Directory.GetParent(exeDir);
                string repoRoot = parent != null ? parent.FullName : exeDir;
                string extensionDir = Path.Combine(repoRoot, "build", "chrome-mv3-prod");
                string browserRoot = Path.Combine(repoRoot, ".social-publisher", "browser");
                string controlProfile = Path.Combine(repoRoot, ".social-publisher", "control-profile");
                string runService = Path.Combine(repoRoot, "run-session-manager.ps1");

                if (!Directory.Exists(extensionDir))
                {
                    ShowError("发布工作台还没有构建完成。请先运行一次安装脚本。");
                    return;
                }

                string chrome = FindChrome(browserRoot);
                if (string.IsNullOrEmpty(chrome))
                {
                    ShowError("没有找到发布工作台专用浏览器。请先运行一次安装脚本。");
                    return;
                }

                EnsureService(runService);
                Directory.CreateDirectory(controlProfile);

                string optionsUrl = "chrome-extension://" + ExtensionId + "/options.html";
                ProcessStartInfo psi = new ProcessStartInfo();
                psi.FileName = chrome;
                psi.UseShellExecute = false;
                psi.CreateNoWindow = true;
                psi.Arguments = string.Join(" ", new string[]
                {
                    Quote("--user-data-dir=" + controlProfile),
                    Quote("--disable-extensions-except=" + extensionDir),
                    Quote("--load-extension=" + extensionDir),
                    "--no-first-run",
                    "--no-default-browser-check",
                    "--disable-session-crashed-bubble",
                    "--disable-background-mode",
                    "--new-window",
                    Quote(optionsUrl)
                });

                Process.Start(psi);
                Thread.Sleep(1500);
            }
            catch (Exception ex)
            {
                ShowError("启动失败：\n" + ex.Message);
            }
            finally
            {
                if (ownsMutex)
                {
                    try { mutex.ReleaseMutex(); } catch { }
                }
            }
        }
    }

    private static void EnsureService(string runService)
    {
        if (IsHealthy()) return;
        if (!File.Exists(runService)) return;

        ProcessStartInfo psi = new ProcessStartInfo();
        psi.FileName = "powershell.exe";
        psi.Arguments = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File " + Quote(runService);
        psi.UseShellExecute = false;
        psi.CreateNoWindow = true;
        psi.WindowStyle = ProcessWindowStyle.Hidden;
        Process.Start(psi);

        for (int i = 0; i < 20; i++)
        {
            Thread.Sleep(250);
            if (IsHealthy()) break;
        }
    }

    private static bool IsHealthy()
    {
        try
        {
            using (HttpClient client = new HttpClient())
            {
                client.Timeout = TimeSpan.FromMilliseconds(500);
                HttpResponseMessage response = client.GetAsync(HealthUrl).GetAwaiter().GetResult();
                return response.IsSuccessStatusCode;
            }
        }
        catch
        {
            return false;
        }
    }

    private static string FindChrome(string root)
    {
        if (!Directory.Exists(root)) return null;
        return Directory.EnumerateFiles(root, "chrome.exe", SearchOption.AllDirectories).FirstOrDefault();
    }

    private static string Quote(string value)
    {
        if (value.IndexOf(' ') >= 0 || value.IndexOf('=') >= 0)
        {
            return "\"" + value.Replace("\"", "\\\"") + "\"";
        }
        return value;
    }

    private static void ShowError(string message)
    {
        try
        {
            string escaped = message.Replace("'", "''").Replace("\r", " ").Replace("\n", " ");
            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = "powershell.exe";
            psi.Arguments = "-NoProfile -Command " + Quote("Add-Type -AssemblyName PresentationFramework; [System.Windows.MessageBox]::Show('" + escaped + "','" + ProductName + "')");
            psi.UseShellExecute = false;
            psi.CreateNoWindow = true;
            Process process = Process.Start(psi);
            if (process != null) process.WaitForExit();
        }
        catch
        {
        }
    }
}
