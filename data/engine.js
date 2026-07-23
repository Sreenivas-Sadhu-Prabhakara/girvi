/* girvi — engine. Pure functions, money in INTEGER PAISE throughout; rupee-facing
   wrappers exist only for the documented fixtures and display. Constants come from
   data/rules.js (the corpus) — never re-typed here. */

'use strict';

var GIRVI_ENGINE = (function (RULES) {

  const TIERS = RULES.TIERS;
  const REF_PPT = RULES.REFERENCE_PPT;

  /* ---------- integer helpers ---------- */

  // round half up on a non-negative rational n/d (both integers, d > 0)
  function roundDiv(n, d) {
    return Math.floor(n / d + 0.5);
  }

  // round a non-negative float to 2 decimals, half up
  function round2(x) {
    return Math.round(x * 100) / 100;
  }

  function toPaise(rupees) {
    return Math.round(rupees * 100);
  }

  /* ---------- valuation (Para 17 + 18 + IS 1417) ---------- */

  // netMg: net metal weight in milligrams; ppt: fineness (585…995);
  // rate22kPaisePerG: the user-typed 22K (916) reference rate in paise per gram.
  // Proportionate adjustment from the 916 reference (Para 17 fallback arithmetic).
  function collateralValuePaise(netMg, ppt, rate22kPaisePerG) {
    if (netMg <= 0 || rate22kPaisePerG <= 0) return 0;
    return roundDiv(netMg * rate22kPaisePerG * ppt, REF_PPT * 1000);
  }

  // rupee-facing fixture wrapper: grams, ppt, ₹/gram → ₹
  function collateralValue22K(netG, ppt, rate22kRupeesPerG) {
    const p = collateralValuePaise(Math.round(netG * 1000), ppt, toPaise(rate22kRupeesPerG));
    return p / 100;
  }

  /* ---------- the tiered ceiling (Para 19, aggregate per borrower) ----------
     The cap is circular: the applicable cap depends on the loan, which depends on
     the cap. A loan L is lawful iff L ≤ V × capPct(tier that L itself falls in).
     The maximum lawful loan is the max over the three tier candidates, each
     clipped to its own band ceiling. Floor division: a cap may never be exceeded. */

  function maxLawfulLoanPaise(valuePaise) {
    if (valuePaise <= 0) return 0;
    let best = 0;
    for (const t of TIERS) {
      let cand = Math.floor(valuePaise * t.capPct / 100);
      if (t.maxLoanPaise !== null && cand > t.maxLoanPaise) cand = t.maxLoanPaise;
      if (cand > best) best = cand;
    }
    return best;
  }

  function maxLawfulLoan(valueRupees) {
    return maxLawfulLoanPaise(toPaise(valueRupees)) / 100;
  }

  // cap percentage applicable to a given loan amount (tier of the LOAN)
  function tierCapPctForLoan(loanPaise) {
    for (const t of TIERS) {
      if (t.maxLoanPaise === null || loanPaise <= t.maxLoanPaise) return t.capPct;
    }
    return TIERS[TIERS.length - 1].capPct;
  }

  /* Plateau detection for the verdict copy. Returns
     { ceilingPaise, capPctAtCeiling, plateau: 0|1|2, exitValuePaise|null }.
     Plateau k means the ceiling is pinned to tier k's band top and more gold
     does not raise it until value crosses exitValuePaise. */
  function ceilingInfo(valuePaise) {
    const ceilingPaise = maxLawfulLoanPaise(valuePaise);
    const info = {
      ceilingPaise,
      capPctAtCeiling: tierCapPctForLoan(ceilingPaise),
      plateau: 0,
      exitValuePaise: null
    };
    for (let k = 0; k < TIERS.length - 1; k++) {
      const t = TIERS[k], next = TIERS[k + 1];
      if (ceilingPaise === t.maxLoanPaise &&
          Math.floor(valuePaise * t.capPct / 100) > t.maxLoanPaise) {
        info.plateau = k + 1;
        // ceiling starts rising again when floor(V × nextCap) exceeds this band top
        info.exitValuePaise = Math.ceil((t.maxLoanPaise + 1) * 100 / next.capPct);
      }
    }
    return info;
  }

  /* ---------- true cost: EMI vs bullet ---------- */

  // closed-form annuity EMI; rupees in, rupees out at 2 dp (paise, half up)
  function emi(principalRupees, annualPct, months) {
    if (months <= 0) return 0;
    const P = principalRupees;
    if (annualPct === 0) return round2(P / months);
    const i = annualPct / 1200;
    const f = Math.pow(1 + i, months);
    return round2(P * i * f / (f - 1));
  }

  function emiTotals(principalRupees, annualPct, months) {
    const m = emi(principalRupees, annualPct, months);
    const total = round2(m * months);
    return { emi: m, total, interest: round2(total - principalRupees) };
  }

  // bullet: simple interest, labelled editable assumption (lenders' rests vary)
  function bulletRepayable(principalRupees, annualPct, months) {
    const pPaise = toPaise(principalRupees);
    const interestPaise = roundDiv(pPaise * annualPct * months, 100 * 12);
    return (pPaise + interestPaise) / 100;
  }

  /* ---------- margin-call gauge (Para 20) ----------
     The % fall in the reference price at which the outstanding loan breaches the
     cap that must hold throughout the tenor. Threshold value V* = L / cap(L);
     drop = (V − V*) / V. Negative → already above the cap at today's value. */
  function marginCallDropPct(loanRupees, valueRupees) {
    const loanPaise = toPaise(loanRupees);
    const valuePaise = toPaise(valueRupees);
    if (loanPaise <= 0 || valuePaise <= 0) return null;
    const cap = tierCapPctForLoan(loanPaise);
    const thresholdPaise = loanPaise * 100 / cap; // exact rational, not floored
    return round2((valuePaise - thresholdPaise) * 100 / valuePaise);
  }

  /* ---------- CSV (RFC 4180) ---------- */

  function csvField(v) {
    const s = String(v == null ? '' : v);
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function toCsv(rows) {
    return rows.map(r => r.map(csvField).join(',')).join('\r\n') + '\r\n';
  }

  /* ---------- display: Indian grouping (lakh/crore), deterministic ---------- */

  function formatINRPaise(paise, opts) {
    const showPaise = opts && opts.paise;
    const neg = paise < 0;
    const abs = Math.abs(paise);
    const rupees = showPaise ? Math.floor(abs / 100) : roundDiv(abs, 100);
    let s = String(rupees);
    if (s.length > 3) {
      let head = s.slice(0, -3), tail = s.slice(-3);
      const parts = [];
      while (head.length > 2) { parts.unshift(head.slice(-2)); head = head.slice(0, -2); }
      if (head) parts.unshift(head);
      s = parts.join(',') + ',' + tail;
    }
    let out = '₹' + s;
    if (showPaise) out += '.' + String(abs % 100).padStart(2, '0');
    return (neg ? '−' : '') + out;
  }

  /* ---------- deterministic PRNG for the property test ---------- */

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  return {
    roundDiv, round2, toPaise,
    collateralValuePaise, collateralValue22K,
    maxLawfulLoanPaise, maxLawfulLoan, tierCapPctForLoan, ceilingInfo,
    emi, emiTotals, bulletRepayable, marginCallDropPct,
    csvField, toCsv, formatINRPaise, mulberry32
  };
})(typeof GIRVI_RULES !== 'undefined' ? GIRVI_RULES : require('./rules.js').GIRVI_RULES);

if (typeof module !== 'undefined') module.exports = { GIRVI_ENGINE };
