# Blueprint Editor (Cocos)

AI 试玩广告自动化流水线（Cocos Creator 版）：蓝图编辑 → AI 编码 → Cocos 构建 → 渠道 HTML。

## 架构
- **前端**: React 19 + @xyflow/react（与 Unity 版共用蓝图编辑器）
- **Worker**: Node.js，轮询任务 → SVN → AI 编码 → Cocos CLI 构建 → 单文件 HTML
- **AI**: Claude Sonnet 4.5（TypeScript 代码生成 + 编译修复循环）
- **构建**: Cocos Creator 3.8+ 命令行构建 Web Mobile

## Worker 文件
| 文件 | 说明 |
|------|------|
| worker-client.js | 任务轮询 + 流程编排 |
| worker-coder.js | AI 编码（Cocos TypeScript） |
| worker-cocos-build.js | Cocos Creator 命令行构建 |
| worker-patch.js | 预构建项目修复 |
| worker-html-converter.js | 构建产物 → 单文件渠道 HTML |

## 部署
见 [docs/cocos-env-setup.md](docs/cocos-env-setup.md)
