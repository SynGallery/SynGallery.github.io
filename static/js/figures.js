// Interactive results figures for the SynGallery page. Numbers are the
// paper's Tables 2 and 3 (arXiv 2607.18907). Plain SVG, no libraries; drawn
// at the card's pixel width so text keeps its size on a phone.
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var ACCENT = '#2563eb', NEUTRAL = '#64748b';

  // Table 2: real:synthetic mix at a matched 12,403-image budget, then more renders.
  var MIX = {
    points: [
      { x: '0%', group: 'mix', note: 'all real studio photos' }, { x: '20%', group: 'mix' }, { x: '40%', group: 'mix' },
      { x: '60%', group: 'mix' }, { x: '80%', group: 'mix' }, { x: '100%', group: 'mix', note: 'all SynGallery renders' },
      { x: '15.5k', group: 'scale', note: '15,504 renders' }, { x: '18.6k', group: 'scale', note: '18,604 renders' },
      { x: '24.5k', group: 'scale', note: 'all 24,490 renders' }
    ],
    metrics: [
      { id: 'cgapm', label: 'Closed world GAP⁻', ref: 71.62, values: [67.18, 71.10, 71.97, 72.27, 72.77, 73.47, 73.61, 73.48, 74.38] },
      { id: 'cacc', label: 'Closed world ACC', ref: 72.30, values: [70.27, 73.65, 73.65, 73.65, 74.32, 75.00, 75.00, 75.00, 75.68] },
      { id: 'gap', label: 'Full Met GAP', ref: 35.97, values: [28.83, 30.33, 31.23, 31.26, 32.29, 32.75, 33.26, 33.62, 34.38] },
      { id: 'gapm', label: 'Full Met GAP⁻', ref: 52.14, values: [49.08, 50.41, 50.84, 51.12, 51.85, 52.37, 52.78, 53.18, 53.78] },
      { id: 'acc', label: 'Full Met ACC', ref: 54.64, values: [52.14, 53.44, 53.54, 53.64, 54.34, 54.94, 55.23, 55.73, 56.63] }
    ]
  };

  // Table 3: closed-world ablation, all models trained on synthetic renders only.
  var ABL = {
    ref: { label: 'real photos, 12,403', gapm: 67.18, acc: 70.27 },
    groups: [
      { label: 'Adding randomizations one at a time', rows: [
        ['Fixed scene', 73.78, 75.00], ['+ textures', 73.94, 75.00], ['+ light', 74.42, 75.68],
        ['+ glass', 75.32, 76.35], ['+ frame', 72.61, 73.65], ['+ camera jitter (default)', 74.38, 75.68, 'default']
      ] },
      { label: 'Variations of the default', rows: [
        ['Frame variety frozen', 73.91, 75.00], ['Rendered at 1024²', 75.41, 76.35], ['3 viewpoints (14,694)', 74.31, 75.68],
        ['Frontal only (4,898)', 68.55, 70.27, 'frontal']
      ] }
    ]
  };

  function el(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function html(tag, cls, text, parent) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  function chips(parent, label, items, initial, onPick) {
    var row = html('div', 'chip-row', null, parent);
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', label);
    html('span', 'chip-label', label, row);
    var buttons = items.map(function (it) {
      var b = html('button', 'chip', it.label, row);
      b.type = 'button';
      b.setAttribute('aria-pressed', it.id === initial ? 'true' : 'false');
      b.addEventListener('click', function () {
        buttons.forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        onPick(it.id);
      });
      return b;
    });
  }
  function tooltip(card) {
    var t = html('div', 'viz-tooltip', null, card);
    t.setAttribute('role', 'status');
    return {
      show: function (content, evt) {
        t.innerHTML = content;
        t.classList.add('is-on');
        var box = card.getBoundingClientRect();
        var x = evt.clientX - box.left + 14, y = evt.clientY - box.top + 14;
        if (x + t.offsetWidth > box.width - 8) x = evt.clientX - box.left - t.offsetWidth - 14;
        if (y + t.offsetHeight > box.height - 8) y = evt.clientY - box.top - t.offsetHeight - 14;
        t.style.left = Math.max(8, x) + 'px';
        t.style.top = Math.max(8, y) + 'px';
      },
      hide: function () { t.classList.remove('is-on'); }
    };
  }
  function legend(parent, keys) {
    var lg = html('div', 'viz-legend', null, parent);
    keys.forEach(function (k) {
      var key = html('span', 'key', null, lg);
      var sw = html('span', 'swatch' + (k.shape ? ' ' + k.shape : ''), null, key);
      if (k.shape === 'line' || k.shape === 'dash') sw.style.borderColor = k.color; else sw.style.background = k.color;
      if (k.hollow) { sw.style.background = '#fff'; sw.style.border = '2.5px solid ' + k.color; sw.style.boxSizing = 'border-box'; }
      html('span', null, k.label, key);
    });
  }
  function niceTicks(lo, hi, n) {
    var raw = (hi - lo) / n, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
    var step = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p, out = [];
    for (var v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Math.round(v * 100) / 100);
    return out;
  }

  // ------------------------------------------------------------ mix and scale
  function mix(card, W) {
    var narrow = W < 560;
    var state = card._state || (card._state = { metric: 'cgapm' });
    var H = narrow ? 300 : 340, L = 44, R = narrow ? 52 : 110, T = 20, B = 62;
    chips(card, 'Metric', MIX.metrics.map(function (m) { return { id: m.id, label: m.label }; }), state.metric,
      function (id) { state.metric = id; draw(); });
    var svg = el('svg', { class: 'viz-svg', role: 'img', width: W, height: H, viewBox: '0 0 ' + W + ' ' + H }, card);
    var tip = tooltip(card);
    legend(card, [
      { color: ACCENT, label: 'Real:synthetic mix at a matched 12,403 images, then more renders', shape: 'line' },
      { color: NEUTRAL, label: 'All 397k real training photos', shape: 'dash' }
    ]);
    var insight = html('div', 'viz-insight', null, card);
    insight.setAttribute('aria-live', 'polite');
    html('div', 'viz-note', 'Closed world: 148 real painting queries against the 12,403-image database. Full Met: 1,003 queries plus 18,316 distractors against 397k images. GAP⁻ ignores the distractor queries.', card);

    var n = MIX.points.length, gapAt = 6;
    function X(i) {
      var slots = n + 0.8, s = i + (i >= gapAt ? 0.8 : 0);
      return L + (s + 0.5) / slots * (W - L - R);
    }
    function draw() {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var m = MIX.metrics.filter(function (q) { return q.id === state.metric; })[0];
      var all = m.values.concat([m.ref]);
      var lo = Math.floor(Math.min.apply(null, all) - 1), hi = Math.ceil(Math.max.apply(null, all) + 1);
      function Y(v) { return T + (hi - v) / (hi - lo) * (H - T - B); }
      el('title', {}, svg).textContent = m.label + ' by share of synthetic training images: ' + m.values.join(', ') + '; all real 397k: ' + m.ref;
      niceTicks(lo, hi, narrow ? 4 : 6).forEach(function (v) {
        el('line', { class: 'grid-line', x1: L, x2: W - R, y1: Y(v), y2: Y(v) }, svg);
        el('text', { class: 'tick-label', x: L - 8, y: Y(v) + 4, 'text-anchor': 'end' }, svg).textContent = v;
      });
      // nine category labels collide on a phone: keep the two ends and the largest set
      MIX.points.forEach(function (p, i) {
        if (narrow && [0, 5, 8].indexOf(i) < 0) return;
        el('text', { class: 'tick-label', x: X(i), y: H - B + 18, 'text-anchor': 'middle' }, svg).textContent = p.x;
      });
      el('text', { x: (X(0) + X(5)) / 2, y: H - B + 40, 'text-anchor': 'middle' }, svg).textContent = narrow ? 'synthetic share' : 'synthetic share, 12,403 images';
      el('text', { x: (X(6) + X(8)) / 2, y: H - B + 40, 'text-anchor': 'middle' }, svg).textContent = narrow ? 'renders' : 'synthetic only, more renders';
      el('line', { class: 'ref-line', x1: L, x2: W - R, y1: Y(m.ref), y2: Y(m.ref), style: 'stroke-dasharray:7 5;stroke:' + NEUTRAL }, svg);
      el('text', { class: 'ref-label', x: W - R + 8, y: Y(m.ref) + 4 }, svg).textContent = (narrow ? '' : '397k real ') + m.ref.toFixed(2);
      function seg(a, b, dash) {
        var pts = [];
        for (var i = a; i <= b; i++) pts.push(X(i) + ',' + Y(m.values[i]));
        el('polyline', { points: pts.join(' '), fill: 'none', stroke: ACCENT, 'stroke-width': 2.5, 'stroke-linejoin': 'round', 'stroke-dasharray': dash || 'none' }, svg);
      }
      seg(0, 5); seg(5, 6, '3 4'); seg(6, 8);
      m.values.forEach(function (v, i) {
        var dot = el('circle', { cx: X(i), cy: Y(v), r: i === 0 ? 6 : 5, fill: i === 0 ? '#ffffff' : ACCENT, stroke: i === 0 ? ACCENT : '#ffffff', 'stroke-width': 2.5 }, svg);
        var hit = el('circle', { cx: X(i), cy: Y(v), r: 16, class: 'hit' }, svg);
        var p = MIX.points[i];
        hit.addEventListener('mousemove', function (e) {
          var head = p.group === 'mix' ? p.x + ' synthetic, 12,403 images' : p.note + ', synthetic only';
          tip.show('<strong>' + head + '</strong>' + (p.note && p.group === 'mix' ? '<br>' + p.note : '') + '<br>' + m.label + ' ' + v.toFixed(2) +
            '<br>397k real photos: ' + m.ref.toFixed(2), e);
          dot.setAttribute('r', 7.5);
        });
        hit.addEventListener('mouseleave', function () { tip.hide(); dot.setAttribute('r', i === 0 ? 6 : 5); });
      });
      el('text', { class: 'value-label', x: X(0) + 10, y: Y(m.values[0]) + 16 }, svg).textContent = m.values[0].toFixed(2);
      el('text', { class: 'value-label', x: X(n - 1), y: Y(m.values[n - 1]) - 12, 'text-anchor': 'middle', style: 'font-weight:700' }, svg).textContent = m.values[n - 1].toFixed(2);
      var last = m.values[n - 1], full = m.values[5], base = m.values[0];
      var vsRef = last >= m.ref ? 'above' : 'below';
      insight.innerHTML = 'Swapping studio photos for renders at the same budget takes ' + m.label.charAt(0).toLowerCase() + m.label.slice(1) + ' from ' + base.toFixed(2) + ' to <strong>' + full.toFixed(2) +
        '</strong>; with all 24,490 renders it reaches ' + last.toFixed(2) + ', ' + vsRef + ' the model trained on all 397k real photos (' + m.ref.toFixed(2) + ').' +
        (m.id === 'gap' ? ' Full GAP still trails: the renders contain no distractor classes.' : '');
    }
    draw();
  }

  // ------------------------------------------------------------ ablation
  function ablation(card, W) {
    var narrow = W < 560;
    var state = card._state || (card._state = { metric: 'gapm' });
    var labelW = narrow ? 150 : 220, right = 48, top = 30, rowH = 30, groupH = 30;
    chips(card, 'Metric', [{ id: 'gapm', label: 'GAP⁻' }, { id: 'acc', label: 'ACC' }], state.metric,
      function (id) { state.metric = id; draw(); });
    var svg = el('svg', { class: 'viz-svg', role: 'img' }, card);
    var tip = tooltip(card);
    legend(card, [
      { color: ACCENT, label: 'Default SynGallery' },
      { color: NEUTRAL, label: 'Other variant' },
      { color: NEUTRAL, label: 'Real photos, same budget', shape: 'dash' }
    ]);
    var insight = html('div', 'viz-insight', null, card);
    insight.setAttribute('aria-live', 'polite');
    html('div', 'viz-note', 'Each model is trained on synthetic renders only and evaluated in the closed painting world (148 real queries, 12,403-image database). The axis does not start at zero.', card);

    function draw() {
      var col = state.metric === 'gapm' ? 1 : 2, refv = state.metric === 'gapm' ? ABL.ref.gapm : ABL.ref.acc;
      var rowsN = ABL.groups.reduce(function (a, g) { return a + g.rows.length; }, 0);
      var H = top + ABL.groups.length * groupH + rowsN * rowH + 10;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('width', W); svg.setAttribute('height', H);
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var lo = 66, hi = 78;
      function X(v) { return labelW + (v - lo) / (hi - lo) * (W - labelW - right); }
      el('title', {}, svg).textContent = 'Closed-world ' + (col === 1 ? 'GAP-' : 'ACC') + ' for SynGallery dataset variants';
      (narrow ? [66, 70, 74, 78] : [66, 68, 70, 72, 74, 76, 78]).forEach(function (v) {
        el('line', { class: 'grid-line', x1: X(v), x2: X(v), y1: top - 6, y2: H }, svg);
        el('text', { class: 'tick-label', x: X(v), y: top - 12, 'text-anchor': 'middle' }, svg).textContent = v;
      });
      el('line', { class: 'ref-line', x1: X(refv), x2: X(refv), y1: top - 6, y2: H, style: 'stroke-dasharray:7 5;stroke:' + NEUTRAL }, svg);
      var y = top;
      ABL.groups.forEach(function (g) {
        el('text', { x: 0, y: y + 19, style: 'font-weight:600;fill:var(--text-secondary);font-size:12px' }, svg).textContent = g.label;
        y += groupH;
        g.rows.forEach(function (r) {
          var cy = y + rowH / 2, v = r[col], tag = r[3];
          el('text', { class: 'row-label' + (tag === 'default' ? ' is-ours' : ''), x: labelW - 12, y: cy + 4, 'text-anchor': 'end' }, svg).textContent = narrow ? r[0].replace('camera jitter', 'jitter') : r[0];
          el('line', { x1: X(lo), x2: X(hi), y1: cy, y2: cy, stroke: tag === 'default' ? '#dbeafe' : '#f1f5f9', 'stroke-width': tag === 'default' ? 10 : 1.5, 'stroke-linecap': 'round' }, svg);
          var dot = el('circle', { cx: X(v), cy: cy, r: 7, fill: tag === 'default' ? ACCENT : NEUTRAL, stroke: '#ffffff', 'stroke-width': 2 }, svg);
          el('text', { class: 'value-label', x: X(v) + 12, y: cy + 4, style: tag === 'default' ? 'font-weight:700' : '' }, svg).textContent = v.toFixed(2);
          var hit = el('rect', { class: 'hit', x: 0, y: y, width: W, height: rowH }, svg);
          hit.addEventListener('mousemove', function (e) {
            var d = v - refv;
            tip.show('<strong>' + r[0] + '</strong><br>' + (col === 1 ? 'GAP⁻ ' : 'ACC ') + v.toFixed(2) + '<br>' +
              (d >= 0 ? '+' : '−') + Math.abs(d).toFixed(2) + ' vs. real photos at the same budget', e);
            dot.setAttribute('r', 9);
          });
          hit.addEventListener('mouseleave', function () { tip.hide(); dot.setAttribute('r', 7); });
          y += rowH;
        });
      });
      el('text', { class: 'ref-label', x: X(refv) + 6, y: H - 4 }, svg).textContent = 'real photos ' + refv.toFixed(2);
      var front = ABL.groups[1].rows[3][col], three = ABL.groups[1].rows[2][col], def = ABL.groups[0].rows[5][col];
      insight.innerHTML = 'Viewpoints matter most: one frontal view per painting scores ' + front.toFixed(2) + ', barely above the real photos (' + refv.toFixed(2) +
        '); three or five viewpoints reach ' + three.toFixed(2) + ' and <strong>' + def.toFixed(2) + '</strong>. Scene randomizations shift it by up to about 3 points, in both directions.';
    }
    draw();
  }

  function mount(card, chart) {
    var head = Array.prototype.slice.call(card.children, 0, 2), drawn = 0, timer = null;
    function render() {
      var cs = getComputedStyle(card);
      var w = Math.floor(card.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight));
      if (Math.abs(w - drawn) < 2) return;
      drawn = w;
      Array.prototype.slice.call(card.children).forEach(function (n) { if (head.indexOf(n) < 0) card.removeChild(n); });
      chart(card, Math.max(280, w));
    }
    render();
    // Watch the card itself, not the window: a layout change without a window
    // resize (a viewport switch, a font load, a scrollbar) must redraw too.
    if (window.ResizeObserver) new ResizeObserver(function () { clearTimeout(timer); timer = setTimeout(render, 100); }).observe(card);
    else window.addEventListener('resize', function () { clearTimeout(timer); timer = setTimeout(render, 150); });
  }

  function init() {
    var a = document.getElementById('fig-mix'), b = document.getElementById('fig-ablation');
    if (a) mount(a, mix);
    if (b) mount(b, ablation);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
