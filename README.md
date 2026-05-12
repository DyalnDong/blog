# 岁末冬至

一个写字、做事、读书的人。

## 这是什么

我的个人博客源码。前端纯静态(HTML/CSS/React via Babel CDN),无后端,文章源文件放在 `posts/` 目录下。

## 写新文章

```bash
# 1. 在 posts/ 新建 markdown 文件
cat > posts/2026-06-01.md <<'EOF'
---
title: "标题"
date: 2026-06-01
cat: life
read: 6
---

正文……
EOF

# 2. 重新生成 data.js
node build.js

# 3. 提交 + 推送
git add .
git commit -m "新文章"
git push
```

或者把文章发给 Claude Code,让它代劳(见 `CLAUDE.md`)。

## 部署

### Cloudflare Pages(推荐,国内访问快)

1. 把仓库推到 GitHub
2. 登录 https://pages.cloudflare.com → Create a project → Connect to Git
3. 选这个仓库 → Build command 留空 → Output directory `/` → Deploy
4. 拿到 `xxx.pages.dev` 域名,完成

### GitHub Pages

1. Settings → Pages → Source: Deploy from a branch → main / root → Save
2. 等 1-2 分钟,访问 `username.github.io/repo-name`

### Netlify

1. https://app.netlify.com/drop 拖整个文件夹上去
2. 或连 GitHub 仓库自动部署

**没有构建步骤**,任何静态托管都能跑。Cloudflare/Netlify/GitHub Pages 不需要设置 build command。

## 本地预览

```bash
python3 -m http.server 8000
```

或直接双击 `index.html`(注意:不同浏览器对 file:// 协议下的 fetch/JSX 行为不同,推荐起本地 server)。

## 技术栈

- HTML + CSS(纯手写,无构建)
- React 18 + Babel(CDN 加载,浏览器内 JIT)
- OpenCC.js(简繁转换)
- Noto Serif SC / Noto Sans SC / IBM Plex Mono(Google Fonts)

## 文件作用

| 文件               | 作用                            |
|------------------|-------------------------------|
| `index.html`     | 入口,加载脚本和字体              |
| `styles.css`     | 全部样式(明暗主题、密度、印章等) |
| `app.jsx`        | React 应用(首页/归档/文章/About) |
| `tweaks-panel.jsx` | 右下角调色面板组件               |
| `data.js`        | 文章数据(由 `build.js` 自动生成) |
| `build.js`       | 把 `posts/*.md` 编译成 `data.js`  |
| `posts/`         | 文章源文件(Markdown + frontmatter)|
| `CLAUDE.md`      | 给 Claude Code 用的指令书         |

## License

文章版权归作者所有,代码部分 MIT。
