/* girvi — UI wiring. All logic lives in data/engine.js; all facts in data/rules.js.
   No inline handlers (CSP), no network (CSP), state in localStorage only. */

'use strict';

(function () {
  const R = GIRVI_RULES;
  const E = GIRVI_ENGINE;

  const LS_STATE = 'girvi:v1:state';
  const LS_THEME = 'girvi:v1:theme';

  const $ = (id) => document.getElementById(id);

  /* ---------- theme ---------- */

  function applyTheme(mode) {
    if (mode === 'light') document.documentElement.setAttribute('data-theme', 'light');
    else document.documentElement.removeAttribute('data-theme');
    const btn = $('themeToggle');
    btn.textContent = mode === 'light' ? 'Switch to dark' : 'Switch to light';
    btn.setAttribute('aria-pressed', mode === 'light' ? 'true' : 'false');
  }

  function initTheme() {
    let mode = null;
    try { mode = localStorage.getItem(LS_THEME); } catch (e) { /* private mode */ }
    if (mode !== 'light' && mode !== 'dark') {
      mode = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    applyTheme(mode);
    $('themeToggle').addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      applyTheme(next);
      try { localStorage.setItem(LS_THEME, next); } catch (e) { /* ignore */ }
    });
  }

  /* ---------- state ---------- */

  let state = { items: [], rate: '', offer: '', loan: '', intRate: '12', months: '12' };

  function loadState() {
    try {
      const raw = localStorage.getItem(LS_STATE);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s && Array.isArray(s.items)) state = Object.assign(state, s);
    } catch (e) { /* corrupted or unavailable — start fresh */ }
  }

  function saveState() {
    try { localStorage.setItem(LS_STATE, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  /* ---------- helpers ---------- */

  const fmt = (paise, p) => E.formatINRPaise(paise, p ? { paise: true } : undefined);
  const fmtR = (rupees, p) => fmt(Math.round(rupees * 100), p);

  function num(v) {
    const n = parseFloat(v);
    return isFinite(n) && n > 0 ? n : 0;
  }

  function fineLabel(ppt) {
    const g = R.FINENESS.find((x) => x.ppt === ppt);
    return g ? g.label + ' (' + g.ppt + ')' : String(ppt);
  }

  /* ---------- derived model ---------- */

  function compute() {
    const ratePaisePerG = Math.round(num(state.rate) * 100);
    let totValuePaise = 0, totNetMg = 0, ornMg = 0, coinMg = 0;
    const rows = state.items.map((it) => {
      const netG = Math.max(0, num(it.grossG) - num(it.deductG));
      const netMg = Math.round(netG * 1000);
      totNetMg += netMg;
      if (it.type === 'coin') coinMg += netMg; else ornMg += netMg;
      const valuePaise = ratePaisePerG > 0 ? E.collateralValuePaise(netMg, it.ppt, ratePaisePerG) : null;
      if (valuePaise) totValuePaise += valuePaise;
      return { it, netG, valuePaise };
    });
    const info = totValuePaise > 0 ? E.ceilingInfo(totValuePaise) : null;
    return { rows, ratePaisePerG, totValuePaise, totNetMg, ornMg, coinMg, info };
  }

  /* ---------- renderers ---------- */

  function renderItems(m) {
    const tbody = $('itemRows');
    tbody.textContent = '';
    m.rows.forEach((r, idx) => {
      const tr = document.createElement('tr');
      const cells = [
        r.it.name || 'Item ' + (idx + 1),
        r.it.type === 'coin' ? 'Coin' : 'Ornament',
        fineLabel(r.it.ppt),
        num(r.it.grossG).toFixed(3).replace(/\.?0+$/, ''),
        r.netG.toFixed(3).replace(/\.?0+$/, ''),
        r.valuePaise != null ? fmt(r.valuePaise) : '— (enter rate)'
      ];
      cells.forEach((c, i) => {
        const td = document.createElement('td');
        if (i >= 3) td.className = 'num';
        td.textContent = c;
        tr.appendChild(td);
      });
      const tdRm = document.createElement('td');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'rm';
      b.dataset.idx = String(idx);
      b.textContent = 'Remove';
      b.setAttribute('aria-label', 'Remove ' + cells[0]);
      tdRm.appendChild(b);
      tr.appendChild(tdRm);
      tbody.appendChild(tr);
    });
    $('emptyHint').hidden = m.rows.length > 0;
    $('totNet').textContent = (m.totNetMg / 1000).toFixed(3).replace(/\.?0+$/, '') + ' g';
    $('totValue').textContent = m.totValuePaise > 0 ? fmt(m.totValuePaise) : '—';

    const warns = [];
    if (m.ornMg > R.LIMITS.ornamentsMaxG * 1000) {
      warns.push('Ornaments total ' + (m.ornMg / 1000).toFixed(1) + ' g — RBI Para 16 caps pledged gold ornaments at ' + R.LIMITS.ornamentsMaxG + ' g per borrower across all loans.');
    }
    if (m.coinMg > R.LIMITS.coinsMaxG * 1000) {
      warns.push('Coins total ' + (m.coinMg / 1000).toFixed(1) + ' g — RBI Para 16 caps pledged gold coins at ' + R.LIMITS.coinsMaxG + ' g per borrower across all loans.');
    }
    const aw = $('aggWarn');
    aw.hidden = warns.length === 0;
    aw.textContent = warns.join(' ');
  }

  function gaugeX(valuePaise) {
    // step x-origins 10/112/214, width 98 — position within the value band
    const b1 = 31250000, b2 = 66666700; // paise ≈ plateau exits
    let i, f;
    if (valuePaise <= b1) { i = 0; f = valuePaise / b1; }
    else if (valuePaise <= b2) { i = 1; f = (valuePaise - b1) / (b2 - b1); }
    else { i = 2; f = Math.min(1, (valuePaise - b2) / b2); }
    return [10, 112, 214][i] + 6 + f * 86;
  }

  function renderVerdict(m) {
    const marker = $('gaugeMarker');
    if (!m.info) {
      $('ceilingOut').textContent = '—';
      $('tierOut').textContent = m.rows.length === 0
        ? 'Add items and a rate to see the ceiling.'
        : 'Type the 22K reference rate above to value the pledge.';
      $('plateauOut').hidden = true;
      marker.hidden = true;
      return null;
    }
    const info = m.info;
    $('ceilingOut').textContent = fmt(info.ceilingPaise);
    $('tierOut').textContent = 'Collateral value ' + fmt(m.totValuePaise) +
      ' · the binding cap here is ' + info.capPctAtCeiling +
      '% (Para 19, tier by total consumption loan per borrower).';
    const pl = $('plateauOut');
    if (info.plateau > 0) {
      pl.hidden = false;
      pl.textContent = 'Plateau zone: more gold here does not raise the ceiling — it stays at ' +
        fmt(info.ceilingPaise) + ' until your collateral value crosses ' +
        fmt(info.exitValuePaise) + '.';
    } else {
      pl.hidden = true;
    }
    const x = gaugeX(m.totValuePaise);
    marker.hidden = false;
    marker.querySelector('line').setAttribute('x1', x);
    marker.querySelector('line').setAttribute('x2', x);
    marker.querySelector('circle').setAttribute('cx', x);
    return info;
  }

  function renderOffer(m) {
    const out = $('offerOut');
    const offer = num(state.offer);
    if (!offer || !m.info) {
      out.textContent = '';
      out.removeAttribute('data-state');
      return;
    }
    const offerPaise = Math.round(offer * 100);
    if (offerPaise <= m.info.ceilingPaise) {
      out.dataset.state = 'ok';
      out.textContent = '✓ Within the legal cap — ' + fmt(offerPaise) + ' is at or under your ceiling of ' + fmt(m.info.ceilingPaise) + '. Offers below the ceiling are lawful; the ceiling is your negotiation maximum.';
    } else {
      out.dataset.state = 'over';
      out.textContent = '✗ Above the legal cap — ' + fmt(offerPaise) + ' exceeds the lawful ceiling of ' + fmt(m.info.ceilingPaise) + ' for this pledge by ' + fmt(offerPaise - m.info.ceilingPaise) + ' (Para 19).';
    }
  }

  function renderCost(m) {
    const L = num(state.loan), r = Math.max(0, parseFloat(state.intRate) || 0), months = Math.max(0, parseInt(state.months, 10) || 0);
    const has = L > 0 && months > 0;
    const bT = $('bulletTotal'), bI = $('bulletInt'), eM = $('emiMonthly'), eT = $('emiTotal'), eI = $('emiInt');
    const tw = $('bulletTenorWarn'), cw = $('bulletCapWarn'), dl = $('costDelta');
    if (!has) {
      [bT, bI, eM, eT, eI].forEach((el) => { el.textContent = '—'; });
      tw.hidden = cw.hidden = dl.hidden = true;
      return { has: false };
    }
    const rep = E.bulletRepayable(L, r, months);
    const bulletInt = E.round2(rep - L);
    const em = E.emiTotals(L, r, months);
    bT.textContent = fmtR(rep, true);
    bI.textContent = fmtR(bulletInt, true);
    eM.textContent = fmtR(em.emi, true);
    eT.textContent = fmtR(em.total, true);
    eI.textContent = fmtR(em.interest, true);

    tw.hidden = months <= R.BULLET_MAX_MONTHS;
    if (!tw.hidden) {
      tw.textContent = 'Para 15 caps bullet-repayment consumption loans at ' + R.BULLET_MAX_MONTHS + ' months — at ' + months + ' months this cannot be a bullet loan.';
    }
    const repPaise = Math.round(rep * 100);
    cw.hidden = !(m.info && repPaise > m.info.ceilingPaise);
    if (!cw.hidden) {
      cw.textContent = 'Para 6(v): bullet LTV is computed on the total repayable at maturity (' + fmt(repPaise) + '), which breaches your ceiling of ' + fmt(m.info.ceilingPaise) + ' — a lender must sanction a smaller bullet loan.';
    }
    dl.hidden = false;
    const diff = E.round2(bulletInt - em.interest);
    if (diff > 0) {
      dl.textContent = 'On these assumptions the EMI route costs ' + fmtR(em.interest, true) + ' in interest vs ' + fmtR(bulletInt, true) + ' bullet — ' + fmtR(diff, true) + ' less, because principal shrinks every month.';
    } else if (diff < 0) {
      dl.textContent = 'On these assumptions the bullet route costs ' + fmtR(bulletInt, true) + ' in interest vs ' + fmtR(em.interest, true) + ' EMI — ' + fmtR(-diff, true) + ' less.';
    } else {
      dl.textContent = 'Both routes cost the same interest on these assumptions: ' + fmtR(bulletInt, true) + '.';
    }
    return { has: true, rep, bulletInt, em, L, r, months };
  }

  function renderMargin(m) {
    const out = $('marginOut');
    const fill = $('mmFill');
    const marker = $('mmMarker');
    const L = num(state.loan) || (m.info ? m.info.ceilingPaise / 100 : 0);
    if (!m.info || !L) {
      out.textContent = 'Enter a pledge, rate and loan amount to see headroom.';
      fill.setAttribute('width', '0');
      marker.hidden = true;
      return null;
    }
    const drop = E.marginCallDropPct(L, m.totValuePaise / 100);
    const cap = E.tierCapPctForLoan(Math.round(L * 100));
    if (drop === null) { out.textContent = '—'; return null; }
    if (drop <= 0) {
      fill.setAttribute('width', '0');
      marker.hidden = true;
      out.textContent = 'A loan of ' + fmtR(L) + ' is already above the ' + cap + '% cap at today’s value — no headroom (Para 20).';
      return drop;
    }
    const w = Math.min(drop, 40) / 40 * 620;
    fill.setAttribute('width', String(w));
    marker.hidden = false;
    const x = 10 + w;
    marker.querySelector('line').setAttribute('x1', x);
    marker.querySelector('line').setAttribute('x2', x);
    out.innerHTML = '';
    const s1 = document.createElement('span');
    s1.textContent = 'If the reference price falls ';
    const b = document.createElement('strong');
    b.textContent = drop.toFixed(2) + '%';
    const s2 = document.createElement('span');
    s2.textContent = ', a loan of ' + fmtR(L) + ' breaches the ' + cap + '% cap that must hold throughout the tenor (Para 20) — the lender can then demand top-up collateral or part-payment.';
    out.append(s1, b, s2);
    return drop;
  }

  /* ---------- rules panel ---------- */

  function renderRules() {
    $('rulesMeta').textContent = 'Source: ' + R.META.doc + ' — issued ' + R.META.issued_on +
      ', binding no later than ' + R.META.binding_from + '. Every fact below verified on ' +
      R.META.verified_on + ' against the linked source.';
    const ol = $('rulesList');
    R.FACTS.forEach((f) => {
      const li = document.createElement('li');
      const head = document.createElement('div');
      head.className = 'r__head';
      const clause = document.createElement('span');
      clause.className = 'r__clause';
      clause.textContent = f.clause;
      const st = document.createElement('span');
      st.className = 'r__state';
      st.textContent = f.statement;
      head.append(clause, st);
      const q = document.createElement('blockquote');
      q.className = 'r__quote';
      q.textContent = '“' + f.quote + '”';
      const src = document.createElement('p');
      src.className = 'r__src';
      const a = document.createElement('a');
      a.href = f.source_url;
      a.rel = 'noopener';
      a.textContent = f.source_name;
      src.append(a, document.createTextNode(' · verified ' + f.verified_on + (f.confidence === 'beta' ? ' · BETA — could not re-verify; treat as indicative' : '')));
      li.append(head, q, src);
      ol.appendChild(li);
    });
  }

  /* ---------- pledge sheet (print + CSV) ---------- */

  function buildSheetRows(m, cost) {
    const rows = [];
    rows.push(['girvi — pledge sheet (informational, not financial advice)']);
    rows.push(['Generated', new Date().toISOString().slice(0, 10)]);
    rows.push(['Rules verified on', R.META.verified_on, R.META.doc]);
    rows.push([]);
    rows.push(['Item', 'Type', 'Purity (IS 1417)', 'Gross g', 'Deduction g', 'Net g', 'Value ₹']);
    m.rows.forEach((r, i) => {
      rows.push([
        r.it.name || 'Item ' + (i + 1),
        r.it.type,
        fineLabel(r.it.ppt),
        num(r.it.grossG),
        num(r.it.deductG),
        r.netG,
        r.valuePaise != null ? (r.valuePaise / 100).toFixed(2) : ''
      ]);
    });
    rows.push([]);
    rows.push(['22K reference rate (typed by user) ₹/g', num(state.rate) || '']);
    rows.push(['Total collateral value ₹', m.totValuePaise ? (m.totValuePaise / 100).toFixed(2) : '']);
    if (m.info) {
      rows.push(['Maximum lawful loan (Para 19) ₹', (m.info.ceilingPaise / 100).toFixed(2)]);
      rows.push(['Binding cap at ceiling', m.info.capPctAtCeiling + '%']);
      if (m.info.plateau) rows.push(['Plateau zone', 'ceiling flat until value crosses ' + (m.info.exitValuePaise / 100).toFixed(2)]);
    }
    if (cost && cost.has) {
      rows.push([]);
      rows.push(['Loan ₹', cost.L, 'Rate % p.a.', cost.r, 'Tenure months', cost.months]);
      rows.push(['Bullet total repayable ₹ (simple interest assumption)', cost.rep.toFixed(2)]);
      rows.push(['EMI ₹/month', cost.em.emi.toFixed(2), 'EMI total ₹', cost.em.total.toFixed(2), 'EMI interest ₹', cost.em.interest.toFixed(2)]);
    }
    rows.push([]);
    rows.push(['Sources']);
    R.FACTS.forEach((f) => rows.push([f.clause, f.statement, f.source_url, 'verified ' + f.verified_on]));
    return rows;
  }

  function renderPrintSheet(m, cost) {
    const el = $('printSheet');
    el.textContent = '';
    const h1 = document.createElement('h1');
    h1.textContent = 'girvi — gold loan pledge sheet';
    const meta = document.createElement('p');
    meta.textContent = 'Generated ' + new Date().toISOString().slice(0, 10) +
      ' · RBI (Lending Against Gold and Silver Collateral) Directions, 2025 — rules verified ' +
      R.META.verified_on + ' · informational only, not financial advice; the ceiling is a legal maximum, not an offer.';
    el.append(h1, meta);

    const t = document.createElement('table');
    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    ['Item', 'Type', 'Purity', 'Gross g', 'Net g', 'Value'].forEach((h) => {
      const th = document.createElement('th');
      th.textContent = h;
      trh.appendChild(th);
    });
    thead.appendChild(trh);
    const tb = document.createElement('tbody');
    m.rows.forEach((r, i) => {
      const tr = document.createElement('tr');
      [r.it.name || 'Item ' + (i + 1), r.it.type, fineLabel(r.it.ppt),
       String(num(r.it.grossG)), String(r.netG), r.valuePaise != null ? fmt(r.valuePaise) : '—'
      ].forEach((c, ci) => {
        const td = document.createElement('td');
        if (ci >= 3) td.className = 'num';
        td.textContent = c;
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
    t.append(thead, tb);
    el.appendChild(t);

    const sum = document.createElement('h2');
    sum.textContent = 'Verdict';
    el.appendChild(sum);
    const lines = [];
    lines.push('22K reference rate (typed): ' + (num(state.rate) ? fmtR(num(state.rate), true) + '/g' : '—'));
    lines.push('Total collateral value: ' + (m.totValuePaise ? fmt(m.totValuePaise) : '—'));
    if (m.info) {
      lines.push('Maximum lawful consumption loan (Para 19, tier by total loan per borrower): ' + fmt(m.info.ceilingPaise) + ' at the ' + m.info.capPctAtCeiling + '% cap.');
      if (m.info.plateau) lines.push('Plateau: ceiling flat until collateral value crosses ' + fmt(m.info.exitValuePaise) + '.');
    }
    if (cost && cost.has) {
      lines.push('Bullet (simple-interest assumption): total repayable ' + fmtR(cost.rep, true) + ' over ' + cost.months + ' months at ' + cost.r + '% p.a.');
      lines.push('EMI: ' + fmtR(cost.em.emi, true) + '/month · total ' + fmtR(cost.em.total, true) + ' · interest ' + fmtR(cost.em.interest, true) + '.');
    }
    lines.forEach((s) => {
      const p = document.createElement('p');
      p.textContent = s;
      el.appendChild(p);
    });

    const fine = document.createElement('p');
    fine.className = 'ps__fine';
    fine.textContent = 'Rules: ' + R.META.doc + ' (' + R.META.doc_url + '), BIS IS 1417:2016 fineness grades (bis.gov.in), IBJA reference-price mechanism (ibjarates.com) — all verified ' +
      R.META.verified_on + '. Lenders value at their own IBJA-based reference price on sanction day; if the borrower already holds a gold loan, the aggregate tier rule (Para 19) may lower the ceiling. girvi runs offline; nothing entered leaves the device.';
    el.appendChild(fine);
  }

  /* ---------- recompute-everything ---------- */

  function recompute() {
    const m = compute();
    renderItems(m);
    renderVerdict(m);
    renderOffer(m);
    const cost = renderCost(m);
    renderMargin(m);
    renderPrintSheet(m, cost);
    saveState();
    return { m, cost };
  }

  /* ---------- wiring ---------- */

  function initForm() {
    const sel = $('fPurity');
    R.FINENESS.forEach((g) => {
      const o = document.createElement('option');
      o.value = String(g.ppt);
      o.textContent = g.label + ' — fineness ' + g.ppt;
      if (g.ppt === 916) o.selected = true;
      sel.appendChild(o);
    });

    $('itemForm').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const gross = num($('fGross').value);
      const deduct = Math.max(0, parseFloat($('fDeduct').value) || 0);
      const err = $('itemErr');
      if (gross <= 0) {
        err.hidden = false;
        err.textContent = 'Enter a gross weight above 0 g.';
        return;
      }
      if (deduct >= gross) {
        err.hidden = false;
        err.textContent = 'The stone/other-metal deduction cannot be the whole weight — net metal must be above 0 g.';
        return;
      }
      err.hidden = true;
      state.items.push({
        name: $('fName').value.trim().slice(0, 40),
        type: $('fType').value === 'coin' ? 'coin' : 'ornament',
        grossG: gross,
        deductG: deduct,
        ppt: parseInt($('fPurity').value, 10)
      });
      $('fName').value = '';
      $('fGross').value = '';
      $('fDeduct').value = '0';
      $('fGross').focus();
      recompute();
    });

    $('itemRows').addEventListener('click', (ev) => {
      const b = ev.target.closest('button.rm');
      if (!b) return;
      state.items.splice(parseInt(b.dataset.idx, 10), 1);
      recompute();
    });

    const bind = (id, key) => {
      $(id).addEventListener('input', () => {
        state[key] = $(id).value;
        recompute();
      });
    };
    bind('fRate', 'rate');
    bind('fOffer', 'offer');
    bind('fLoan', 'loan');
    bind('fInt', 'intRate');
    bind('fMonths', 'months');

    $('useCeiling').addEventListener('click', () => {
      const m = compute();
      if (m.info) {
        state.loan = String(Math.floor(m.info.ceilingPaise / 100));
        $('fLoan').value = state.loan;
        recompute();
      }
    });

    $('printBtn').addEventListener('click', () => {
      recompute();
      window.print();
    });

    $('csvBtn').addEventListener('click', () => {
      const { m, cost } = recompute();
      const csv = E.toCsv(buildSheetRows(m, cost));
      let ok = false;
      try {
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'girvi-pledge-sheet.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        ok = true;
      } catch (e) { ok = false; }
      const box = $('csvFallback');
      box.hidden = false;
      box.value = csv;
      $('csvHint').hidden = ok;
    });

    $('wipeBtn').addEventListener('click', () => {
      if (!window.confirm('Erase all items and inputs from this browser? This cannot be undone.')) return;
      state = { items: [], rate: '', offer: '', loan: '', intRate: '12', months: '12' };
      try { localStorage.removeItem(LS_STATE); } catch (e) { /* ignore */ }
      ['fRate', 'fOffer', 'fLoan'].forEach((id) => { $(id).value = ''; });
      $('fInt').value = '12';
      $('fMonths').value = '12';
      $('csvFallback').hidden = true;
      $('csvHint').hidden = true;
      recompute();
    });
  }

  function restoreInputs() {
    $('fRate').value = state.rate || '';
    $('fOffer').value = state.offer || '';
    $('fLoan').value = state.loan || '';
    $('fInt').value = state.intRate || '12';
    $('fMonths').value = state.months || '12';
  }

  /* ---------- boot ---------- */

  initTheme();
  loadState();
  initForm();
  restoreInputs();
  renderRules();
  recompute();
})();
