/* 岁末冬至 v2 — 从 /data.js 读 ARTICLES + CATEGORIES,渲染 Writing 区与分类导航 */

(function () {
  const arts = (window.ARTICLES || []).slice();
  const cats = window.CATEGORIES || [];
  const fmtDate = (d) => d.replace(/-/g, '.');
  const catKey = (c) => `wpost__thumb--cat-${c}`;
  const featKey = (c) => `feat__frame--cat-${c}`;
  const catName = (id) => (cats.find((c) => c.id === id) || { name: id }).name;

  // 「在写」最新一篇标题
  const latestEl = document.getElementById('about-latest');
  if (latestEl && arts[0]) {
    latestEl.textContent = `《${arts[0].title}》· ${fmtDate(arts[0].date)}`;
  }
  // 蓝图角落统计
  const bpCount = document.getElementById('bp-count');
  if (bpCount) bpCount.textContent = `${arts.length} 篇 · ${countYears(arts)} 年`;

  function countYears(list) {
    const ys = new Set(list.map((a) => a.date.slice(0, 4)));
    return ys.size;
  }

  // 分类导航
  const catRow = document.getElementById('cat-row');
  if (catRow) {
    catRow.innerHTML = ''; // 重置
    const items = [{ id: 'all', name: '全部' }, ...cats.filter((c) => c.id !== 'all')];
    items.forEach((c, i) => {
      if (i > 0) {
        const sep = document.createElement('i');
        sep.className = 'dotsep';
        sep.textContent = '·';
        sep.style.cssText = 'margin:0 8px;color:var(--line);font-style:normal;';
        catRow.appendChild(sep);
      }
      const el = document.createElement('span');
      el.className = 'cat';
      el.dataset.cat = c.id;
      el.textContent = c.name;
      if (c.id === 'all') el.classList.add('is-active');
      el.addEventListener('click', () => {
        catRow.querySelectorAll('.cat').forEach((x) => x.classList.remove('is-active'));
        el.classList.add('is-active');
        render(c.id);
      });
      catRow.appendChild(el);
    });
  }

  // 主渲染
  function render(filterCat) {
    const grid = document.getElementById('writing-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const filtered = filterCat && filterCat !== 'all'
      ? arts.filter((a) => a.cat === filterCat)
      : arts;
    const visible = filtered.slice(0, 6); // 首页 v2 只展示 6 篇,完整列表回 classic

    if (visible.length === 0) {
      grid.innerHTML = '<div style="grid-column:1/-1;padding:40px;color:var(--muted);">这个分类下还没有文章</div>';
      return;
    }

    // 头条 (feat) — 第 1 篇
    const head = visible[0];
    const feat = document.createElement('a');
    feat.className = 'feat';
    feat.href = '/?article=' + head.id;
    feat.dataset.reveal = '';
    feat.innerHTML = `
      <span class="feat__frame ${featKey(head.cat)}">
        <span style="font-family:var(--serif);font-size:120px;font-weight:600;letter-spacing:-.02em;color:var(--paper);">01</span>
      </span>
      <div class="feat__body">
        <span class="feat__idx">01</span>
        <h3 class="feat__title">${escape(head.title)}</h3>
        <p class="feat__dek">${escape(head.excerpt || '').slice(0, 90)}${(head.excerpt || '').length > 90 ? '…' : ''}</p>
        <div class="feat__meta">
          <span class="feat__tag">${escape(catName(head.cat))}</span>
          <span class="dotsep">·</span>
          <span>${fmtDate(head.date)}</span>
          <span class="feat__views">阅读 ${head.read} 分钟</span>
        </div>
        <span class="feat__read">阅读 <span class="arr">→</span></span>
      </div>
    `;
    grid.appendChild(feat);

    // 02-06 (wpost 列表)
    const list = document.createElement('div');
    list.className = 'writing__list';
    visible.slice(1).forEach((a, i) => {
      const idx = String(i + 2).padStart(2, '0');
      const wp = document.createElement('a');
      wp.className = 'wpost';
      wp.href = '/?article=' + a.id;
      wp.dataset.reveal = '';
      wp.innerHTML = `
        <span class="wpost__idx">${idx}</span>
        <div class="wpost__body">
          <h3 class="wpost__title">${escape(a.title)}</h3>
          <div class="wpost__meta">
            <span class="wpost__tag">${escape(catName(a.cat))}</span>
            <span class="dotsep">·</span>
            <span>${fmtDate(a.date)}</span>
            <span class="wpost__views">阅读 ${a.read} 分钟</span>
          </div>
        </div>
        <span class="wpost__thumb ${catKey(a.cat)}">${idx}</span>
      `;
      list.appendChild(wp);
    });
    grid.appendChild(list);
  }

  function escape(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  // 启动
  render('all');

  // 揭示动画兜底
  document.documentElement.classList.add('is-ready');
})();
