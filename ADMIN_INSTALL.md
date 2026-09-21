# 行政安装与分发

当前内部测试版建议用 **解压 + Chrome 开发者模式加载** 的方式分发。

## 生成行政安装包

在项目目录运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\package-admin-win.ps1
```

生成文件：

```
dist\Social-Publisher-<version>-admin.zip
```

压缩包内包含：

- `extension\`：Chrome 未打包扩展目录
- `安装说明.txt`：给行政同事的安装步骤

## 当前可交付范围

可以给行政使用：

- 图文 / 动态
- 视频
- 长文
- 当前 Chrome 登录账号发布
- 默认仅填充
- 小红书固定仅填充
- 账号池记录

尚未完成：

- 一个平台多个账号的独立 Session 绑定
- 批量账号选择
- 多账号发布任务队列
- 账号登录状态集中管理

因此，当前行政版适合作为单账号 / 单浏览器环境的内部使用版；多账号矩阵版完成 Session Manager 后再升级。
