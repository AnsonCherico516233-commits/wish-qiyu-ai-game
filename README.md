# 如你所愿｜祁煜 AI 文字游戏

一个由玩家自备 API Key 的沉浸式文字游戏。祁煜会依据内置人设进行即时聊天与剧情续写，支持 OpenAI 兼容接口、DeepSeek、Claude、Gemini 和自定义中转站。

## 使用方式

1. 打开网站并填写玩家资料。
2. 在“连接 AI 模型”中选择服务商，填写模型名称和自己的 API Key。
3. 默认使用 HTTPS 安全中转解决浏览器 CORS；若服务商已允许跨域，也可切换为浏览器直连。

API Key 仅保存在当前页面内存；只有玩家主动启用“在此设备记住 Key”时，才会写入该浏览器的本地存储。仓库和网站不包含任何预设 API Key。

## 本地开发

```bash
pnpm install
pnpm dev
```

GitHub Pages 使用 `pnpm run build:github` 生成纯静态前端，并由 `.github/workflows/deploy-pages.yml` 自动发布。跨域中转 API 由动态站点单独提供。
