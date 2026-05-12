/* global React, ReactDOM */
const { useState, useEffect, useMemo, useRef, useLayoutEffect } = React;

// ---------- Locale (简 / 繁) ----------
let _conv = null;
function getConverter() {
  if (_conv) return _conv;
  if (window.OpenCC && window.OpenCC.Converter) {
    try { _conv = window.OpenCC.Converter({ from: 'cn', to: 'tw' }); } catch(e) { _conv = null; }
  }
  return _conv;
}

function useLocaleDOM(locale) {
  useLayoutEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const p = n.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        if (p.closest('script, style, input, textarea, .locale-toggle, .seal')) return NodeFilter.FILTER_REJECT;
        if (!n.nodeValue || !/[\u4e00-\u9fff]/.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let n;
    const conv = locale === 'tw' ? getConverter() : null;
    while ((n = walker.nextNode())) {
      if (n.__orig === undefined) n.__orig = n.nodeValue;
      const target = conv ? conv(n.__orig) : n.__orig;
      if (n.nodeValue !== target) n.nodeValue = target;
    }
  });
}

// ---------- helpers ----------
const fmtDate = (s) => {
  const [y, m, d] = s.split("-");
  return { y, md: `${m}.${d}`, full: `${y}年${parseInt(m)}月${parseInt(d)}日` };
};
const catOf = (id) => window.CATEGORIES.find((c) => c.id === id) || { name: id, en: id };

// ---------- Header / Nav ----------
function TopBar({ view, setView, onSearch, locale, setLocale }) {
  return (
    <header className="topbar">
      <div className="brand" onClick={() => setView({ name: "home" })}>
        <div className="brand-mark">岁末冬至</div>
        <div className="brand-sub">Solstice Notes</div>
      </div>
      <nav className="nav">
        <button className={view.name === "home" ? "active" : ""} onClick={() => setView({ name: "home" })}>文章</button>
        <button className={view.name === "archive" ? "active" : ""} onClick={() => setView({ name: "archive" })}>归档</button>
        <button className={view.name === "about" ? "active" : ""} onClick={() => setView({ name: "about" })}>关于</button>
        <button onClick={onSearch} aria-label="搜索">搜索</button>
        <div className="locale-toggle" role="group" aria-label="语言切换">
          <button className={locale === 'cn' ? 'on' : ''} onClick={() => setLocale('cn')}>简</button>
          <span className="sep">·</span>
          <button className={locale === 'tw' ? 'on' : ''} onClick={() => setLocale('tw')}>繁</button>
        </div>
      </nav>
    </header>
  );
}

function Footer({ setView }) {
  return (
    <footer className="shell footer">
      <div>© 岁末冬至 · 写于香港</div>
      <div className="links">
        <a onClick={() => setView({ name: "about" })}>公众号</a>
      </div>
    </footer>
  );
}

// ---------- Home ----------
function Home({ articles, setView }) {
  const [activeCat, setActiveCat] = useState("all");
  const [limit, setLimit] = useState(20);

  const counts = useMemo(() => {
    const out = { all: articles.length };
    for (const a of articles) out[a.cat] = (out[a.cat] || 0) + 1;
    return out;
  }, [articles]);

  const filtered = useMemo(() => {
    const list = activeCat === "all" ? articles : articles.filter((a) => a.cat === activeCat);
    return [...list].sort((a, b) => b.date.localeCompare(a.date));
  }, [articles, activeCat]);

  const pinned = filtered[0];
  const rest = filtered.slice(1, limit);

  return (
    <main className="shell">
      <section className="hero">
        <div className="hero-eyebrow">A Personal Journal · Since 2017</div>
        <h1 className="hero-title">
          岁末冬至<span className="seal">董</span>
        </h1>
        <p className="hero-lead">一个写字、做事、读书的人。</p>
        <p className="hero-sub">这里记录我做过的事、读过的书、走过的路，以及一些没想明白的问题。</p>
        <div className="hero-meta">
          <span>{articles.length} 篇</span>
          <span>2017 — 至今</span>
          <span>香港 · 每周四更新</span>
        </div>
      </section>

      <nav className="cat-strip" aria-label="分类">
        {window.CATEGORIES.map((c) => (
          <button
            key={c.id}
            className={"cat-chip " + (activeCat === c.id ? "active" : "")}
            onClick={() => { setActiveCat(c.id); setLimit(20); }}
          >
            {c.name}<span className="count">{counts[c.id] || 0}</span>
          </button>
        ))}
      </nav>

      {pinned && (
        <>
          <div className="section-head">
            <div className="section-title">最近一篇</div>
            <div className="section-aside">{fmtDate(pinned.date).full}</div>
          </div>
          <article className="pinned" onClick={() => setView({ name: "article", id: pinned.id })}>
            <div className="pin-date">
              <span className="y">{fmtDate(pinned.date).y}</span>
              {fmtDate(pinned.date).md}
            </div>
            <div>
              <div className="pin-cat">{catOf(pinned.cat).name}</div>
              <h2 className="pin-title">{pinned.title}</h2>
              <p className="pin-excerpt">{pinned.excerpt || "在写。在改。等一段觉得可以拿出来的话。"}</p>
              <div className="pin-meta">阅读约 {pinned.read} 分钟</div>
            </div>
          </article>
        </>
      )}

      <div className="section-head">
        <div className="section-title">{activeCat === "all" ? "全部文章" : catOf(activeCat).name}</div>
        <div className="section-aside">{filtered.length} 篇 · 按时间倒序</div>
      </div>

      {rest.length === 0 ? (
        <div className="empty">这个分类下还没有写够多东西。</div>
      ) : (
        <ul className="article-list">
          {rest.map((a) => (
            <li key={a.id} className="article-row" onClick={() => setView({ name: "article", id: a.id })}>
              <div className="row-date">{fmtDate(a.date).y}.{fmtDate(a.date).md}</div>
              <div className="row-main">
                <div className="row-cat">{catOf(a.cat).name}</div>
                <h3 className="row-title">{a.title}</h3>
              </div>
              <div className="row-read">{a.read} min</div>
            </li>
          ))}
        </ul>
      )}

      {filtered.length > limit && (
        <button className="list-more" onClick={() => setLimit(limit + 20)}>
          再看 {Math.min(20, filtered.length - limit)} 篇 →
        </button>
      )}
    </main>
  );
}

// ---------- Article ----------
function Article({ article, all, setView }) {
  const [progress, setProgress] = useState(0);
  const [activeH, setActiveH] = useState(null);
  const proseRef = useRef(null);

  // build TOC from real article body
  const rawHtml = article.html || "<p>(原文待补)</p>";
  const toc = useMemo(() => {
    const div = document.createElement("div");
    div.innerHTML = rawHtml;
    return Array.from(div.querySelectorAll("h2, h3")).map((h, i) => ({
      id: `h-${i}`, text: h.textContent, level: h.tagName.toLowerCase(),
    }));
  }, [rawHtml]);

  const bodyWithIds = useMemo(() => {
    let i = 0;
    return rawHtml.replace(/<(h2|h3)>/g, (_, tag) => `<${tag} id="h-${i++}">`);
  }, [rawHtml]);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const scrolled = h.scrollTop;
      const total = h.scrollHeight - h.clientHeight;
      setProgress(total > 0 ? Math.min(100, (scrolled / total) * 100) : 0);

      // active TOC
      if (proseRef.current) {
        const hs = proseRef.current.querySelectorAll("h2");
        let cur = null;
        hs.forEach((h2) => {
          if (h2.getBoundingClientRect().top < 120) cur = h2.id;
        });
        setActiveH(cur);
      }
    };
    window.addEventListener("scroll", onScroll);
    window.scrollTo(0, 0);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [article.id]);

  // prev / next
  const sorted = useMemo(() => [...all].sort((a, b) => b.date.localeCompare(a.date)), [all]);
  const idx = sorted.findIndex((a) => a.id === article.id);
  const prev = sorted[idx + 1];
  const next = sorted[idx - 1];

  return (
    <>
      <div className="progress" style={{ width: `${progress}%` }} />
      <main className="shell">
        <article className="article">
          <div className="article-eyebrow">{catOf(article.cat).name}</div>
          <h1 className="article-title">{article.title}</h1>
          <div className="article-meta">
            <span>{fmtDate(article.date).full}</span>
            <span>阅读约 {article.read} 分钟</span>
            <span>香港</span>
          </div>
          <div className="prose" ref={proseRef} dangerouslySetInnerHTML={{ __html: bodyWithIds }} />

          <div className="article-foot">
            <div style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--muted)", letterSpacing: "0.18em", textTransform: "uppercase" }}>
              END
            </div>
            {article.link && (
              <p style={{ fontFamily: "var(--sans)", fontSize: 12, color: "var(--muted)", marginTop: 18 }}>
                原文首发于公众号 · <a href={article.link} target="_blank" rel="noopener" style={{ color: "var(--seal)" }}>在微信中打开 ↗</a>
              </p>
            )}
            <nav className="article-nav">
              {prev ? (
                <a onClick={() => setView({ name: "article", id: prev.id })}>
                  <span className="nav-label">← 上一篇</span>
                  <span className="nav-title">{prev.title}</span>
                </a>
              ) : <span />}
              {next ? (
                <a onClick={() => setView({ name: "article", id: next.id })}>
                  <span className="nav-label">下一篇 →</span>
                  <span className="nav-title">{next.title}</span>
                </a>
              ) : <span />}
            </nav>
          </div>
        </article>
      </main>

      {toc.length > 0 && (
        <aside className="toc">
          <div className="toc-label">目录</div>
          {toc.map((t) => (
            <a key={t.id} href={`#${t.id}`} className={activeH === t.id ? "active" : ""}>
              {t.text}
            </a>
          ))}
        </aside>
      )}
    </>
  );
}

// ---------- About ----------
function About() {
  return (
    <main className="shell about">
      <h1 className="about-title">关于</h1>
      <div className="about-prose">
        <p className="lead">在香港生活的内地人。</p>
        <p>这里记录我做过的事、读过的书、走过的路,以及一些没想明白的问题。文字大部分写得很慢,有时也写得很轻。</p>
        <p>2017 年开始动笔,中间断过两次,最长一次断了一年多。后来想想,断掉的那段时间反而是变化最多的——只是当时没有力气写。</p>
      </div>

      <ul className="about-list">
        <li><span className="k">在做</span><span>读书 · 写字</span></li>
        <li><span className="k">在写</span><span>技术与 AI · 投资与财务 · 旅行 · 读书笔记 · 生活随笔</span></li>
        <li><span className="k">在地</span><span>香港 · 但世界到处跑</span></li>
        <li><span className="k">联系</span><span>下方公众号</span></li>
      </ul>

      <aside className="wechat-card">
        <div className="wechat-inner">
          <div className="wechat-text">
            <div className="wc-eyebrow">看更多</div>
            <h3>你也可以在微信上看我 · <span className="wc-handle">岁末冬至</span></h3>
            <p>博客上的文章会先在公众号发。另外还有一些不会放到博客上的 · 更短、更随手的片段，以及读书摘抄、生活小事——都在那里。</p>
            <div className="wc-meta">
              <span>微信搜：岁末冬至</span>
              <span>每周四更新</span>
            </div>
          </div>
          <div className="qr-wrap">
            <div className="qr-frame">
              <span className="c1"></span><span className="c2"></span>
              <img src="assets/wechat-qr.jpg" alt="公众号二维码" />
            </div>
            <div className="qr-caption">扫码关注</div>
          </div>
        </div>
      </aside>
    </main>
  );
}

// ---------- Archive ----------
function Archive({ articles, setView }) {
  const byYear = useMemo(() => {
    const out = {};
    for (const a of articles) {
      const y = a.date.slice(0, 4);
      (out[y] ||= []).push(a);
    }
    for (const y in out) out[y].sort((a, b) => b.date.localeCompare(a.date));
    return out;
  }, [articles]);
  const years = Object.keys(byYear).sort((a, b) => b.localeCompare(a));
  const [activeYear, setActiveYear] = useState('all');

  const visibleYears = activeYear === 'all' ? years : [activeYear];

  return (
    <main className="shell">
      <header className="archive-head">
        <h1 className="archive-title">归档</h1>
        <div className="archive-sub">{articles.length} 篇文章 · 从 {years[years.length - 1]} 写到 {years[0]}</div>
      </header>

      <nav className="year-tabs" aria-label="年份筛选">
        <button className={'year-tab ' + (activeYear === 'all' ? 'active' : '')} onClick={() => setActiveYear('all')}>
          全部<span className="yt-count">{articles.length}</span>
        </button>
        {years.map((y) => (
          <button key={y}
            className={'year-tab ' + (activeYear === y ? 'active' : '')}
            onClick={() => setActiveYear(y)}>
            {y}<span className="yt-count">{byYear[y].length}</span>
          </button>
        ))}
      </nav>

      {visibleYears.map((y) => (
        <section className="year-block" key={y}>
          <div className="year-head">
            <div className="year-num">{y}</div>
            <div className="year-meta">{byYear[y].length} 篇</div>
          </div>
          <ul className="article-list">
            {byYear[y].map((a) => (
              <li key={a.id} className="article-row" onClick={() => setView({ name: "article", id: a.id })}>
                <div className="row-date">{fmtDate(a.date).md}</div>
                <div className="row-main">
                  <div className="row-cat">{catOf(a.cat).name}</div>
                  <h3 className="row-title">{a.title}</h3>
                </div>
                <div className="row-read">{a.read} min</div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}

// ---------- Search ----------
function SearchOverlay({ articles, onClose, setView }) {
  const [q, setQ] = useState("");
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const results = useMemo(() => {
    if (!q.trim()) return articles.slice(0, 8);
    const s = q.toLowerCase();
    return articles.filter((a) =>
      a.title.toLowerCase().includes(s) || catOf(a.cat).name.includes(q)
    ).slice(0, 12);
  }, [q, articles]);

  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="search-box" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="search-input"
          placeholder="搜索标题或分类…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="search-results">
          {results.map((a) => (
            <div key={a.id} className="search-result" onClick={() => { setView({ name: "article", id: a.id }); onClose(); }}>
              <div className="sr-cat">{catOf(a.cat).name} · {a.date}</div>
              <div className="sr-title">{a.title}</div>
            </div>
          ))}
        </div>
        <div className="search-hint">按 ESC 关闭</div>
      </div>
    </div>
  );
}

// ---------- Tweaks ----------
function MyTweaks() {
  const defaults = /*EDITMODE-BEGIN*/{
    "theme": "light",
    "density": "default",
    "accent": "#9a3220",
    "fontSize": 17,
    "serif": "noto-serif"
  }/*EDITMODE-END*/;

  const { TweaksPanel, useTweaks, TweakSection, TweakRadio, TweakColor, TweakSlider, TweakSelect } = window;
  const [t, setTweak] = useTweaks(defaults);

  useEffect(() => {
    document.documentElement.dataset.theme = t.theme;
    document.documentElement.dataset.density = t.density;
    document.documentElement.style.setProperty("--seal", t.accent);
    document.documentElement.style.setProperty("--accent", t.accent);
    document.documentElement.style.setProperty("--base-size", `${t.fontSize}px`);
    const fontMap = {
      "noto-serif": '"Noto Serif SC", "Source Han Serif SC", "Songti SC", "STSong", serif',
      "noto-sans":  '"Noto Sans SC", "PingFang SC", system-ui, sans-serif',
      "mix":        '"Noto Serif SC", "Songti SC", serif',
    };
    document.documentElement.style.setProperty("--serif", fontMap[t.serif] || fontMap["noto-serif"]);
  }, [t]);

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="主题">
        <TweakRadio label="模式" value={t.theme} onChange={(v) => setTweak("theme", v)}
          options={[{ value: "light", label: "明亮" }, { value: "dark", label: "深色" }]} />
      </TweakSection>
      <TweakSection label="阅读">
        <TweakSlider label="正文字号" value={t.fontSize} min={15} max={20} step={1} onChange={(v) => setTweak("fontSize", v)} />
        <TweakRadio label="行距" value={t.density} onChange={(v) => setTweak("density", v)}
          options={[{ value: "compact", label: "紧" }, { value: "default", label: "默认" }, { value: "relaxed", label: "宽" }]} />
        <TweakSelect label="字体倾向" value={t.serif} onChange={(v) => setTweak("serif", v)}
          options={[
            { value: "noto-serif", label: "宋体(衬线)" },
            { value: "noto-sans",  label: "黑体(无衬线)" },
            { value: "mix",        label: "标题宋体" },
          ]} />
      </TweakSection>
      <TweakSection label="点缀">
        <TweakColor label="印章/重音色" value={t.accent} onChange={(v) => setTweak("accent", v)}
          options={["#9a3220", "#1a1612", "#2c5530", "#8b6914", "#1f3a5f"]} />
      </TweakSection>
    </TweaksPanel>
  );
}

// ---------- App ----------
function App() {
  const [view, setView] = useState({ name: "home" });
  const [searchOpen, setSearchOpen] = useState(false);
  const [locale, setLocaleState] = useState(() => {
    const v = localStorage.getItem('locale') || 'cn';
    return v === 'en' ? 'cn' : v;
  });
  const setLocale = (l) => { localStorage.setItem('locale', l); setLocaleState(l); };
  const articles = window.ARTICLES;
  useLocaleDOM(locale);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  let body;
  if (view.name === "home") body = <Home articles={articles} setView={setView} />;
  else if (view.name === "about") body = <About />;
  else if (view.name === "archive") body = <Archive articles={articles} setView={setView} />;
  else if (view.name === "article") {
    const a = articles.find((x) => x.id === view.id) || articles[0];
    body = <Article article={a} all={articles} setView={setView} />;
  }

  return (
    <>
      <div className="shell">
        <TopBar view={view} setView={setView} onSearch={() => setSearchOpen(true)} locale={locale} setLocale={setLocale} />
      </div>
      {body}
      <Footer setView={setView} />
      {searchOpen && <SearchOverlay articles={articles} onClose={() => setSearchOpen(false)} setView={setView} />}
      <MyTweaks />
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
