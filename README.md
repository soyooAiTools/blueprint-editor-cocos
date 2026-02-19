# Blueprint Editor (Cocos)

AI 试玩广告自动化流水线（Cocos Creator 版）：蓝图编辑 → AI 编码 → Cocos 构建 → 渠道 HTML。

## 架构

```
前端蓝图编辑器 → 后端 API (ECS) → Worker (Win Server)
                                     ├── SVN checkout
                                     ├── AI 编码 (Claude Sonnet)
                                     ├── Cocos Creator CLI 构建
                                     ├── PNG→WebP + zlib 压缩
                                     └── 单文件 HTML 上传
```

- **后端**: Node.js (PM2), port 3902, Nginx 反代 `playcools.top/blueprintEditorCocos/`
- **Worker**: Node.js on Windows Server, 轮询任务队列
- **AI**: Claude Sonnet 4.5 (`crs.mindrix.app/v1`)
- **构建**: Cocos Creator 3.8.8 命令行构建 Web Mobile
- **压缩**: PNG→WebP (94% 节省) + JSON/JS/BIN zlib deflate, 产出单文件 HTML

## E2E 流程 (实测 107s)

| 步骤 | 模块 | 说明 | 耗时 |
|------|------|------|------|
| 1. Poll | worker-client.js | 从后端拉取待处理任务 | <1s |
| 2. SVN | worker-client.js | checkout/update 项目资源 | ~1s |
| 3. Scene detect | worker-patch.js | 扫描 .scene 文件, 修复 project settings | <1s |
| 4. Build | worker-cocos-build.js | Cocos Creator CLI `--build` | ~16s |
| 5. HTML convert | worker-html-converter.js | PNG→WebP + zlib + 单文件打包 | ~3s |
| 6. Upload | worker-client.js | 上传 HTML 到后端 | ~85s |

## Worker 文件

| 文件 | 说明 |
|------|------|
| `worker-client.js` | 任务轮询 + 流程编排（主入口） |
| `worker-coder.js` | AI 编码（Cocos TypeScript, Claude API） |
| `worker-cocos-build.js` | Cocos Creator 命令行构建, exit code 36 容错 |
| `worker-patch.js` | 预构建修复（场景检测, project settings） |
| `worker-html-converter.js` | 构建产物 → 单文件渠道 HTML（支持 appLovin/facebook/google/tiktok/mintegral/preview） |

## HTML 转换策略

原始 Cocos 构建产物 ~38MB, 转换后单文件 HTML ~11.5MB:

- **PNG→WebP**: sharp 库, quality 85, 节省 94% (21.9MB → 1.3MB)
- **JSON/JS/BIN**: zlib deflate level 9, 客户端用 DecompressionStream 解压
- **图片/音频**: 直接 base64 (已压缩格式, zlib 无收益)
- **XHR 拦截**: 劫持 XMLHttpRequest, 从内存字典返回资源
- **渠道脚本**: CTA 跳转逻辑按渠道注入 (mraid/FbPlayableAd/ExitApi 等)

## 部署

### 后端 (ECS 120.55.70.226)
- 路径: `/opt/blueprint-editor-cocos/`
- PM2: `blueprint-cocos` (id=15), port 3902
- Nginx: `playcools.top/blueprintEditorCocos/` → `127.0.0.1:3902`
- 任务队列: `/opt/autoCoding-tasks-cocos/queue/`

### Worker (Win Server 42.121.160.107)
- 路径: `D:\worker-cocos\`
- Cocos Creator: `D:\CocosCreator-v3.8.8-win-121518\CocosCreator.exe`
- SVN 项目: `D:\work\<project-dir>\`
- 依赖: `npm install sharp` (PNG→WebP)

### API 路由
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/worker/poll?workerId=X` | Worker 拉取任务 |
| POST | `/api/worker/status` | Worker 上报状态 |
| POST | `/api/tasks/:id/upload-html` | 上传单文件 HTML |
| POST | `/api/tasks/:id/upload-build` | 上传构建 zip (可选) |

详细环境搭建见 [docs/cocos-env-setup.md](docs/cocos-env-setup.md)
