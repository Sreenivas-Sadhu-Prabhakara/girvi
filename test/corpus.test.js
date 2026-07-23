'use strict';
/* girvi corpus invariants — the 14 clause-cited facts, and the guarantee that the
   engine's constants are read FROM the corpus (no re-typed numbers). */

const test = require('node:test');
const assert = require('node:assert/strict');

const { GIRVI_RULES } = require('../data/rules.js');
const { GIRVI_ENGINE } = require('../data/engine.js');

const R = GIRVI_RULES;

test('exactly 14 facts, unique ids, full provenance on every one', () => {
  assert.equal(R.FACTS.length, 14);
  const ids = new Set();
  for (const f of R.FACTS) {
    assert.ok(f.id && !ids.has(f.id), 'unique id: ' + f.id);
    ids.add(f.id);
    assert.ok(f.clause && f.clause.length > 0, f.id + ' has clause ref');
    assert.ok(f.statement && f.statement.length > 10, f.id + ' has statement');
    assert.ok(f.quote && f.quote.length > 0, f.id + ' has quote');
    assert.ok(/^https:\/\//.test(f.source_url), f.id + ' has https source_url');
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(f.verified_on), f.id + ' has ISO verified_on');
    assert.ok(['verified', 'beta'].includes(f.confidence), f.id + ' confidence labelled');
  }
});

test('all statutory facts are verified (nothing shipped beta in this corpus)', () => {
  for (const f of R.FACTS) assert.equal(f.confidence, 'verified', f.id);
});

test('tier constants match the cited Para 19 quotes', () => {
  assert.equal(R.TIERS.length, 3);
  assert.deepEqual(R.TIERS.map(t => t.capPct), [85, 80, 75]);
  assert.equal(R.TIERS[0].maxLoanPaise, 25000000);   // ₹2.5 lakh
  assert.equal(R.TIERS[1].maxLoanPaise, 50000000);   // ₹5 lakh
  assert.equal(R.TIERS[2].maxLoanPaise, null);
  const q = R.FACTS.filter(f => f.category === 'ltv').map(f => f.quote).join(' ');
  assert.ok(q.includes('85 per cent') && q.includes('80 per cent') && q.includes('75 per cent'));
  assert.ok(q.includes('₹2.5 lakh') && q.includes('₹5 lakh'));
});

test('tiers cover (0, ∞) with descending caps and ascending band tops', () => {
  for (let i = 1; i < R.TIERS.length; i++) {
    assert.ok(R.TIERS[i].capPct < R.TIERS[i - 1].capPct, 'caps strictly descend');
    if (R.TIERS[i].maxLoanPaise !== null) {
      assert.ok(R.TIERS[i].maxLoanPaise > R.TIERS[i - 1].maxLoanPaise, 'band tops ascend');
    }
  }
  assert.equal(R.TIERS[R.TIERS.length - 1].maxLoanPaise, null, 'last tier unbounded');
});

test('the aggregate-per-borrower clause is present verbatim (adversarial amendment)', () => {
  const f = R.FACTS.find(x => x.id === 'tier-aggregate');
  assert.equal(f.quote, 'Total consumption loan amount per borrower.');
});

test('BIS IS 1417 fineness grades — six, ascending, 916 is the reference', () => {
  assert.equal(R.FINENESS.length, 6);
  assert.deepEqual(R.FINENESS.map(g => g.ppt), [585, 750, 833, 916, 958, 995]);
  assert.ok(R.FINENESS.every(g => g.ppt >= 585 && g.ppt <= 999));
  assert.equal(R.REFERENCE_PPT, 916);
  const bis = R.FACTS.find(f => f.id === 'bis-fineness');
  for (const g of R.FINENESS) assert.ok(bis.quote.includes(String(g.ppt)));
});

test('Para 16 limits and Para 15 tenor constants match their quotes', () => {
  assert.equal(R.LIMITS.ornamentsMaxG, 1000);
  assert.equal(R.LIMITS.coinsMaxG, 50);
  const f16 = R.FACTS.find(f => f.id === 'aggregate-collateral');
  assert.ok(f16.quote.includes('1 kilogram') && f16.quote.includes('50 grams'));
  const f15 = R.FACTS.find(f => f.id === 'bullet-tenor-12m');
  assert.ok(f15.quote.includes('12 months'));
  assert.equal(R.BULLET_MAX_MONTHS, 12);
});

test('dates: issued 2025-06-06, binding 2026-04-01 — and the engine is downstream of the corpus', () => {
  assert.equal(R.META.issued_on, '2025-06-06');
  assert.equal(R.META.binding_from, '2026-04-01');
  // engine constants ARE the corpus constants (same derivation, no duplication):
  // 85% of ₹2,00,000 stays in tier 1; band top pins the plateau exactly at ₹2.5L
  assert.equal(GIRVI_ENGINE.maxLawfulLoanPaise(R.TIERS[0].maxLoanPaise * 100 / R.TIERS[0].capPct + 500000), R.TIERS[0].maxLoanPaise);
  assert.equal(GIRVI_ENGINE.tierCapPctForLoan(R.TIERS[0].maxLoanPaise), R.TIERS[0].capPct);
  assert.equal(GIRVI_ENGINE.tierCapPctForLoan(R.TIERS[0].maxLoanPaise + 1), R.TIERS[1].capPct);
});
