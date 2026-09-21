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

    [STAThread]
    private static void Main()
    {
        try
        {
            var exeDir = AppContext.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar);
            var repoRoot = Directory.GetParent(exeDir)?.FullName ?? exeDir;
            var extensionDir = Path.Combine(repoRoot, "build", "chrome-mv3-prod");
            var browserRoot = Path.Combine(repoRoot, ".social-publisher", "browser");
            var controlProfile = Path.Combine(repoRoot, ".social-publisher", "control-profile");
            var runService = Path.Combine(repoRoot, "run-session-manager.ps1");

            if (!Directory.Exists(extensionDir))
            {
                ShowError("Social Publisher 还没有构建完成。请先运行一次安装脚本。");
                return;
            }

            var chrome = FindChrome(browserRoot);
            if (chrome == null)
            {
                ShowError("没有找到 Social Publisher 专用浏览器。请先运行一次安装脚本。");
                return;
            }

            EnsureService(runService);
            Directory.CreateDirectory(controlProfile);

            var optionsUrl = $"chrome-extension://{ExtensionId}/options.html";
            var psi = new ProcessStartInfo
            {
                FileName = chrome,
                UseShellExecute = false,
                CreateNoWindow = true,
                Arguments = string.Join(" ", new[]
                {
                    Quote($"--user-data-dir={controlProfile}"),
                    Quote($"--load-extension={extensionDir}"),
                    "--no-first-run",
                    "--no-default-browser-check",
                    Quote($"--app={optionsUrl}")
                })
            };

            Process.Start(psi);
        }
        catch (Exception ex)
        {
            ShowError("Social Publisher 启动失败：\n" + ex.Message);
        }
    }

    private static void EnsureService(string runService)
    {
        if (IsHealthy()) return;
        if (!File.Exists(runService)) return;

        var psi = new ProcessStartInfo
        {
            FileName = "powershell.exe",
            Arguments = $"-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File {Quote(runService)}",
            UseShellExecute = false,
            CreateNoWindow = true,
            WindowStyle = ProcessWindowStyle.Hidden
        };
        Process.Start(psi);

        for (var i = 0; i < 20; i++)
        {
            Thread.Sleep(250);
            if (IsHealthy()) break;
        }
    }

    private static bool IsHealthy()
    {
        try
        {
            using var client = new HttpClient { Timeout = TimeSpan.FromMilliseconds(500) };
            var response = client.GetAsync(HealthUrl).GetAwaiter().GetResult();
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    private static string? FindChrome(string root)
    {
        if (!Directory.Exists(root)) return null;
        return Directory.EnumerateFiles(root, "chrome.exe", SearchOption.AllDirectories).FirstOrDefault();
    }

    private static string Quote(string value)
    {
        return value.Contains(' ') || value.Contains('=') ? $"\"{value}\"" : value;
    }

    private static void ShowError(string message)
    {
        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = "powershell.exe",
                Arguments = "-NoProfile -Command " + Quote($"Add-Type -AssemblyName PresentationFramework; [System.Windows.MessageBox]::Show('{message.Replace("'", "''")}','Social Publisher')"),
                UseShellExecute = false,
                CreateNoWindow = true
            };
            Process.Start(psi)?.WaitForExit();
        }
        catch
        {
        }
    }
}
