# Cocos Worker 部署指南

## 环境要求
- Windows Server 2025 / Windows 10+
- Node.js v20+
- Cocos Creator 3.8.8
- SVN client

## 部署步骤
1. 将 worker/ 下所有文件复制到 `D:\worker-cocos\`
2. SVN checkout: `svn checkout svn://47.101.191.213:3690/test0213 D:\work\test-cocos`
3. 创建计划任务 `WorkerClientCocos`: `node D:\worker-cocos\worker-client.js`
4. 或用 PM2: `pm2 start ecosystem.config.js`

## 环境变量
| 变量 | 默认值 | 说明 |
|------|--------|------|
| WORKER_ID | workerA-cocos | Worker 标识 |
| BASE_URL | https://playcools.top/blueprintEditorCocos | 服务端地址 |
| COCOS_CREATOR | D:\CocosCreator\CocosCreator.exe | Cocos Creator 路径 |
| LLM_API_KEY | (内置) | AI 编码 API Key |
| LLM_MODEL | claude-sonnet-4-5-20250929 | AI 编码模型 |
