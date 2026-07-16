# Clearlist

一个清晰、移动端友好的分区 Todo List。数据保存在 `data/todos.json`。

## 本地编辑

```bash
npm run dev
```

打开 `http://localhost:3000`。添加、完成或删除任务后会自动写回 JSON，之后正常提交并推送代码即可更新线上内容。

## 在线只读

```bash
npm start
```

`npm start` 会设置 `READ_ONLY=true`，页面隐藏编辑入口，同时服务端拒绝所有写入请求。生产环境设置 `NODE_ENV=production` 也会自动启用只读。

如需指定端口：`PORT=8080 npm run dev`。

## 部署到 GitHub Pages

仓库已经包含 `.github/workflows/pages.yml`。首次部署需要在 GitHub 仓库中打开：

1. **Settings → Pages**
2. 在 **Build and deployment** 下把 **Source** 设为 **GitHub Actions**
3. 将代码推送到 `main`

Actions 会把 `public` 页面和 `data/todos.json` 组装为静态站点并部署。线上页面始终为只读；本地运行 `npm run dev` 修改任务，确认后提交并推送，线上数据便会随部署更新。
