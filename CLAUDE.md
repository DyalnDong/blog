# 岁末冬至 · 给 Claude Code 的说明书

这是「岁末冬至」博客的源码。用户(博主)以后会把新文章发给你,你负责发布。

## 仓库结构

```
.
├── index.html       静态首页框架(别动)
├── styles.css       样式(别动)
├── app.jsx          React 应用逻辑(别动)
├── tweaks-panel.jsx Tweaks 面板组件(别动)
├── data.js          ⚠️ 自动生成,别手改!
├── posts/           ← 文章源文件,你只需要操作这里
│   ├── 2026-05-07.md
│   └── ...
├── assets/          静态资源(二维码等)
├── build.js         构建脚本:扫 posts/ → 生成 data.js
└── package.json
```

## 用户发新文章给你时,你的工作流

### 1. 创建文章文件

文件名规则:**`posts/YYYY-MM-DD.md`**(同一天多篇就 `YYYY-MM-DD-2.md`)

文件内容模板:

```markdown
---
title: "文章标题"
date: 2026-06-01
cat: life
read: 8
link: https://mp.weixin.qq.com/s/xxxxx
excerpt: "可选,首页卡片摘要"
---

正文内容,支持 Markdown 或 HTML。
```

### 2. 分类 `cat` 必须是以下之一

| id     | 含义       |
|--------|----------|
| tech   | 技术与 AI · OpenClaw · 编程 |
| money  | 投资 · 财务 · 周记 · 复盘 |
| life   | 生活随笔 · 旧文 · 杂感 |
| travel | 旅行行记 |
| books  | 读书笔记 |

不确定分到哪类?根据标题判断,实在拿不准就用 `life`。

### 3. 阅读时长 `read`

按字数估算:中文 ~400 字/分钟。如果用户没说,你估一个数(整数,通常 3-15)。

### 4. 构建 + 部署

```bash
node build.js          # 重新生成 data.js
git add .
git commit -m "新文章: 标题"
git push
```

GitHub Pages / Cloudflare Pages 会在 30 秒到 2 分钟内自动重新部署,完成。

## 常见情况处理

- **用户只发了标题和正文,没说日期** → 用今天的日期
- **用户发了公众号链接** → 写入 `link:` 字段;正文如果他也粘了,就用他的,否则把链接放进 body 让读者跳转过去
- **用户发了图片** → 暂时跳过(博客 v1 不展示图片),正文里图片占位符直接删除
- **用户改旧文章** → 找到对应的 `posts/YYYY-MM-DD*.md` 直接改,然后照常 build + push

## 千万别做

- ❌ 别手动改 `data.js`(会被覆盖)
- ❌ 别改 `index.html` / `styles.css` / `app.jsx`(除非用户明确要求改设计)
- ❌ 别新建 `posts/_drafts/` 之类的子目录 —— `build.js` 只扫 `posts/` 顶层
- ❌ 别用空格、特殊符号做文件名,只用 `YYYY-MM-DD.md` 或 `YYYY-MM-DD-N.md`

## 本地预览(可选)

```bash
python3 -m http.server 8000
# 然后浏览器开 http://localhost:8000
```

或者直接双击 `index.html` 也能跑(没有 build server,纯静态)。
