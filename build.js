#!/usr/bin/env node
/* eslint-disable */
/**
 * build.js —— 把 posts/*.md 扫一遍,生成 data.js
 *
 * 用法:
 *   node build.js
 *
 * 每个 .md 文件结构:
 *   ---
 *   title: "文章标题"
 *   date: 2026-05-07         # 必填,格式 YYYY-MM-DD
 *   cat: tech                # 必填,见下方列表
 *   read: 8                  # 选填,阅读分钟,默认 5
 *   link: https://...        # 选填,公众号原文链接
 *   excerpt: "..."           # 选填,摘要
 *   ---
 *
 *   <正文>  ← 可以是 HTML 也可以是 Markdown
 *
 * 分类 cat 取值:
 *   tech    技术与 AI
 *   money   投资与财务
 *   life    生活随笔
 *   travel  旅行行记
 *   books   读书笔记
 */

const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.join(__dirname, 'posts');
const OUT_FILE  = path.join(__dirname, 'data.js');

const CATEGORIES = `window.CATEGORIES = [
  { id: "all",    name: "全部",      en: "All" },
  { id: "tech",   name: "技术与 AI", en: "Tech & AI" },
  { id: "money",  name: "投资与财务", en: "Money & Investing" },
  { id: "life",   name: "生活随笔",   en: "Life Notes" },
  { id: "travel", name: "旅行行记",   en: "Travel" },
  { id: "books",  name: "读书笔记",   en: "Reading" },
];`;

// --- minimal YAML frontmatter parser (key: value lines) ---
function parseFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: text };
  const meta = {};
  for (const line of m[1].split(/\r?\n/)) {
    const mm = line.match(/^(\w+):\s*(.*)$/);
    if (!mm) continue;
    let v = mm[2].trim();
    // strip surrounding quotes
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1).replace(/\\"/g, '"');
    }
    meta[mm[1]] = v;
  }
  return { meta, body: m[2] };
}

// --- minimal Markdown → HTML (only what blog needs) ---
// If body already starts with `<`, treat as raw HTML and pass through.
function mdToHtml(src) {
  if (src.trim().startsWith('<')) return src.trim();

  const lines = src.split(/\r?\n/);
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // blank line
    if (!line.trim()) { i++; continue; }
    // headings
    let h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const level = h[1].length + 1;  // # → h2, ## → h3, ### → h4
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      i++; continue;
    }
    // blockquote
    if (line.startsWith('> ')) {
      const buf = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        buf.push(lines[i].slice(2));
        i++;
      }
      out.push(`<blockquote><p>${inline(buf.join(' '))}</p></blockquote>`);
      continue;
    }
    // unordered list
    if (/^[-*]\s+/.test(line)) {
      const buf = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        buf.push(`<li>${inline(lines[i].replace(/^[-*]\s+/, ''))}</li>`);
        i++;
      }
      out.push(`<ul>${buf.join('')}</ul>`);
      continue;
    }
    // ordered list
    if (/^\d+\.\s+/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        buf.push(`<li>${inline(lines[i].replace(/^\d+\.\s+/, ''))}</li>`);
        i++;
      }
      out.push(`<ol>${buf.join('')}</ol>`);
      continue;
    }
    // horizontal rule
    if (/^---+$/.test(line)) { out.push('<hr/>'); i++; continue; }
    // paragraph (consume until blank line)
    const buf = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|>\s|[-*]\s|\d+\.\s|---+$)/.test(lines[i])) {
      buf.push(lines[i]); i++;
    }
    out.push(`<p>${inline(buf.join(' '))}</p>`);
  }
  return out.join('\n');
}

function inline(s) {
  // **bold**
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // *italic*
  s = s.replace(/(^|[^*])\*(?!\s)([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>');
  // `code`
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
  // [text](url)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return s;
}

// --- main ---
function main() {
  if (!fs.existsSync(POSTS_DIR)) {
    console.error('posts/ 不存在');
    process.exit(1);
  }
  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
  const articles = [];
  for (const f of files) {
    const raw = fs.readFileSync(path.join(POSTS_DIR, f), 'utf8');
    const { meta, body } = parseFrontmatter(raw);
    if (!meta.title || !meta.date || !meta.cat) {
      console.warn(`⚠️  跳过 ${f}: 缺 title/date/cat`);
      continue;
    }
    const html = mdToHtml(body);
    articles.push({
      title: meta.title,
      date: meta.date,
      cat: meta.cat,
      read: parseInt(meta.read || '5', 10),
      link: meta.link || '',
      excerpt: meta.excerpt || '',
      html,
    });
  }
  // sort newest first & assign IDs
  articles.sort((a, b) => b.date.localeCompare(a.date));
  articles.forEach((a, i) => (a.id = 'a' + (i + 1)));

  let out = '// 文章数据 —— 由 build.js 从 posts/*.md 自动生成。请勿手改。\n';
  out += CATEGORIES + '\n\n';
  out += 'window.ARTICLES = [\n';
  for (const a of articles) {
    const obj = {
      id: a.id, title: a.title, date: a.date, cat: a.cat, read: a.read,
      ...(a.link ? { link: a.link } : {}),
      ...(a.excerpt ? { excerpt: a.excerpt } : {}),
      html: a.html,
    };
    out += '  ' + JSON.stringify(obj) + ',\n';
  }
  out += '];\n';

  fs.writeFileSync(OUT_FILE, out, 'utf8');
  console.log(`✅ 写入 ${articles.length} 篇 → data.js`);
  const yearMap = {};
  for (const a of articles) {
    const y = a.date.slice(0, 4);
    yearMap[y] = (yearMap[y] || 0) + 1;
  }
  console.log('   ' + Object.entries(yearMap).sort((a,b) => b[0].localeCompare(a[0])).map(([y,n]) => `${y}: ${n}`).join('  '));
}

main();
