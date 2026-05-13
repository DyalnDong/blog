#!/usr/bin/env python3
"""
import-wechat.py —— 从微信公众号文章 URL 抓取内容,生成 posts/YYYY-MM-DD.md

用法:
    python3 tools/import-wechat.py <URL> [--cat CAT] [--read MIN] [--date YYYY-MM-DD]

参数:
    URL         必填,公众号文章链接 https://mp.weixin.qq.com/s/xxx
    --cat       分类 id (tech/money/life/travel/books),默认 life
    --read      阅读分钟数,默认按 500 字/分钟自动估算
    --date      文章日期 YYYY-MM-DD,默认从 WeChat 的发布时间戳推断
    --excerpt   摘要,默认取正文第一段前 120 字
    --dry-run   只预览,不写入文件

示例:
    python3 tools/import-wechat.py https://mp.weixin.qq.com/s/abc123 --cat life
"""

import argparse, datetime, re, sys, os
from pathlib import Path

try:
    import requests
    from bs4 import BeautifulSoup, NavigableString
except ImportError:
    print("缺少依赖,请运行: pip3 install --user requests beautifulsoup4", file=sys.stderr)
    sys.exit(1)

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"

# 保留的标签 → 转换成博客需要的标签
KEEP_TAGS = {
    "p": "p", "br": "br",
    "h1": "h2", "h2": "h2", "h3": "h3", "h4": "h3",
    "blockquote": "blockquote",
    "ul": "ul", "ol": "ol", "li": "li",
    "strong": "strong", "b": "strong",
    "em": "em", "i": "em",
    "a": "a",
}

VALID_CATS = {"tech", "money", "life", "travel", "books"}

def fetch(url):
    r = requests.get(url, headers={"User-Agent": UA}, timeout=20)
    r.raise_for_status()
    return r.text

def parse(html):
    soup = BeautifulSoup(html, "html.parser")
    title_el = soup.find("h1", class_="rich_media_title")
    if not title_el:
        raise RuntimeError("找不到标题(rich_media_title),可能不是公众号文章页或被反爬")
    title = title_el.get_text(strip=True)

    content_el = soup.find("div", id="js_content")
    if not content_el:
        raise RuntimeError("找不到正文(js_content)")

    # 发布时间:优先用 JS 里的 var ct (Unix 时间戳)
    ts_match = re.search(r'var ct = "(\d+)"', html)
    if ts_match:
        date = datetime.datetime.fromtimestamp(int(ts_match.group(1))).strftime("%Y-%m-%d")
    else:
        date = datetime.datetime.now().strftime("%Y-%m-%d")

    body_html = clean_body(content_el)
    return title, date, body_html

def clean_body(root):
    """提取并清洗正文为干净 HTML"""
    # 删除图片、视频、嵌入式内容(注意:不删 section,新版公众号每段都裹在 section 里)
    for tag in root.find_all(["img", "iframe", "video", "audio", "script", "style", "svg"]):
        tag.decompose()
    # 删除 mpvoice / qqmusic / share_ 等公众号专有组件
    for tag in root.find_all(attrs={"class": re.compile(r"^(mpvoice|qqmusic|share_)")}):
        tag.decompose()

    out_parts = []
    walk(root, out_parts)
    raw = "".join(out_parts)

    # 公众号现在大量使用 <section> 包裹段落而非 <p>,我们的 walk 已经把 section
    # 当成透明容器展开了。如果展开后正文里全是裸文本(没有 <p>),包一层 <p>
    if "<p>" not in raw and raw.strip():
        # 按双换行/<br> 切段
        parts = re.split(r"(?:<br\s*/?>\s*){1,}|\n{2,}", raw)
        raw = "\n".join(f"<p>{p.strip()}</p>" for p in parts if p.strip())

    # 后处理:压缩多空白、删空标签
    raw = re.sub(r"\s+", " ", raw)
    raw = re.sub(r"<p>\s*</p>", "", raw)
    raw = re.sub(r"<(h[23])>\s*</\1>", "", raw)
    # 删除单字符段
    raw = re.sub(r"<p>[。，、；：\s]</p>", "", raw)
    # 行间换行
    raw = re.sub(r"(<(/p|/h[23]|/blockquote|/ul|/ol|/li)>)", r"\1\n", raw)
    return raw.strip()

def walk(node, out):
    """递归把节点扁平化成保留标签的 HTML"""
    for child in list(node.children):
        if isinstance(child, NavigableString):
            text = str(child)
            if text.strip():
                out.append(text)
            continue
        name = child.name.lower() if child.name else ""
        if name in KEEP_TAGS:
            target = KEEP_TAGS[name]
            if name == "a":
                href = child.get("href", "")
                inner = []
                walk(child, inner)
                out.append(f'<a href="{href}" target="_blank" rel="noopener">{"".join(inner)}</a>')
            elif name == "br":
                out.append("<br>")
            else:
                out.append(f"<{target}>")
                walk(child, out)
                out.append(f"</{target}>")
        elif name in ("div", "span", "section", "article", "font"):
            # 透明:递归内容,丢容器
            walk(child, out)
        # 其他标签整体丢弃

def estimate_read(body_html):
    text = re.sub(r"<[^>]+>", "", body_html)
    text = re.sub(r"\s+", "", text)
    return max(2, round(len(text) / 500))

def make_excerpt(body_html, max_chars=120):
    # 去 HTML 标签,保留空格(英文中文混排时空格不能丢)
    text = re.sub(r"<[^>]+>", " ", body_html)
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) <= max_chars:
        return text
    # 在句号/逗号附近截断,尽量自然
    cut = text[:max_chars]
    for punct in "。!？.!?":
        idx = cut.rfind(punct)
        if idx > max_chars // 2:
            return text[:idx + 1]
    return cut + "……"

def safe_filename(posts_dir, date):
    base = posts_dir / f"{date}.md"
    if not base.exists():
        return base
    for i in range(2, 20):
        p = posts_dir / f"{date}-{i}.md"
        if not p.exists():
            return p
    raise RuntimeError(f"同日太多文章,放弃: {date}")

def main():
    ap = argparse.ArgumentParser(description="导入微信公众号文章到博客")
    ap.add_argument("url", help="公众号文章链接")
    ap.add_argument("--cat", default="life", choices=sorted(VALID_CATS))
    ap.add_argument("--read", type=int, help="阅读分钟,默认按 500 字/分自动估算")
    ap.add_argument("--date", help="日期 YYYY-MM-DD,默认从公众号时间戳推断")
    ap.add_argument("--excerpt", help="摘要,默认取正文首段前 120 字")
    ap.add_argument("--dry-run", action="store_true", help="只预览,不写文件")
    args = ap.parse_args()

    print(f"⏳ 抓取 {args.url}", file=sys.stderr)
    html = fetch(args.url)
    title, parsed_date, body_html = parse(html)
    date = args.date or parsed_date
    read = args.read or estimate_read(body_html)
    excerpt = args.excerpt or make_excerpt(body_html)

    bs = '\\'  # avoid backslash in f-string expression
    title_esc = title.replace('"', bs + '"')
    excerpt_esc = excerpt.replace('"', bs + '"')
    fm = (
        "---\n"
        f'title: "{title_esc}"\n'
        f"date: {date}\n"
        f"cat: {args.cat}\n"
        f"read: {read}\n"
        f"link: {args.url}\n"
        f'excerpt: "{excerpt_esc}"\n'
        "---\n"
    )
    out = fm + "\n" + body_html + "\n"

    print(f"标题: {title}", file=sys.stderr)
    print(f"日期: {date}", file=sys.stderr)
    print(f"分类: {args.cat}  阅读: {read} 分钟", file=sys.stderr)
    print(f"摘要: {excerpt}", file=sys.stderr)

    if args.dry_run:
        print("\n=== 预览(未写入)===\n", file=sys.stderr)
        print(out)
        return

    posts_dir = Path(__file__).parent.parent / "posts"
    posts_dir.mkdir(exist_ok=True)
    target = safe_filename(posts_dir, date)
    target.write_text(out, encoding="utf-8")
    print(f"✅ 已写入 {target.relative_to(Path(__file__).parent.parent)}", file=sys.stderr)

if __name__ == "__main__":
    main()
