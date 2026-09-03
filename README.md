# 如你所愿｜祁煜 AI 文字游戏

一个由玩家自备 API Key 的沉浸式文字游戏。祁煜会依据内置人设进行即时聊天与剧情续写，支持浏览器直连 OpenAI、DeepSeek、Claude 与 Gemini 官方 API。

## 使用方式

1. 打开网站并填写玩家资料。
2. 在“连接 AI 模型”中选择服务商，填写模型名称和自己的 API Key。
3. 网站为纯静态应用，请求由浏览器直接发往玩家填写的官方 API 地址，不经过本站服务器。

API Key 仅保存在当前页面内存；只有玩家主动启用“在此设备记住 Key”时，才会写入该浏览器的本地存储。仓库和网站不包含任何预设 API Key。

## 本地开发

```bash
pnpm install
pnpm dev
```

GitHub Pages 使用 `pnpm run build:github` 生成纯静态前端，并由 `.github/workflows/deploy-pages.yml` 自动发布。能否跨域调用取决于各官方 API 的浏览器 CORS 策略。
