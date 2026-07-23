'use strict';
/* girvi self-tests — re-derive every core formula and assert the hand-computed
   fixtures exactly (to the paisa), plus a 10,000-case seeded property test. */

const test = require('node:test');
const assert = require('node:assert/strict');

const { GIRVI_RULES } = require('../data/rules.js');
const { GIRVI_ENGINE } = require('../data/engine.js');

const E = GIRVI_ENGINE;

test('tiered ceiling — all eight brief fixtures to the rupee', () => {
  assert.equal(E.maxLawfulLoan(280000), 238000);  // 85% tier
  assert.equal(E.maxLawfulLoan(294000), 249900);  // just under tier-1 edge (0.85×294000)
  assert.equal(E.maxLawfulLoan(300000), 250000);  // plateau 1: 0.85V>2.5L but 0.80V<2.5L
  assert.equal(E.maxLawfulLoan(312500), 250000);  // exact plateau-1 exit: 0.80×312500
  assert.equal(E.maxLawfulLoan(400000), 320000);  // 80% tier
  assert.equal(E.maxLawfulLoan(625000), 500000);  // exact tier-2 top: 0.80×625000
  assert.equal(E.maxLawfulLoan(640000), 500000);  // plateau 2: 0.80V>5L but 0.75V<5L
  assert.equal(E.maxLawfulLoan(800000), 600000);  // 75% tier
});

test('plateau detection and exit values', () => {
  const p0 = E.ceilingInfo(E.toPaise(280000));
  assert.equal(p0.plateau, 0);

  const p1 = E.ceilingInfo(E.toPaise(300000));
  assert.equal(p1.plateau, 1);
  assert.equal(p1.ceilingPaise, 25000000);
  // rises again just past ₹3,12,500
  assert.ok(Math.abs(p1.exitValuePaise - 31250000) <= 200);

  const p2 = E.ceilingInfo(E.toPaise(640000));
  assert.equal(p2.plateau, 2);
  assert.equal(p2.ceilingPaise, 50000000);
  // rises again just past ₹6,66,666.67
  assert.ok(Math.abs(p2.exitValuePaise - 66666667) <= 200);

  // inside-tier values are not plateaus
  assert.equal(E.ceilingInfo(E.toPaise(400000)).plateau, 0);
  assert.equal(E.ceilingInfo(E.toPaise(800000)).plateau, 0);
});

test('valuation — proportionate 22K adjustment (Para 17) to the paisa', () => {
  // 18K net 45.8 g at 22K rate ₹6000/g: 45.8 × 6000 × 750/916
  assert.equal(E.collateralValue22K(45.8, 750, 6000), 225000);
  // 22K at the reference rate is identity
  assert.equal(E.collateralValue22K(10, 916, 6000), 60000);
  // paise-level: 1 mg of 24K at ₹6000/g 22K → round(1 × 600000 × 995/916000) = 652 paise
  assert.equal(E.collateralValuePaise(1, 995, 600000), 652);
  assert.equal(E.collateralValuePaise(0, 916, 600000), 0);
});

test('EMI — closed-form annuity, paise half-up', () => {
  assert.equal(E.emi(200000, 12, 12), 17769.76); // classic 8884.88/lakh at 12%/12m
  assert.equal(E.emi(100000, 12, 12), 8884.88);
  const t = E.emiTotals(200000, 12, 12);
  assert.equal(t.total, 213237.12);
  assert.equal(t.interest, 13237.12);
  // zero-rate edge degenerates to straight division
  assert.equal(E.emi(120000, 0, 12), 10000);
});

test('bullet — simple interest and the repayable-at-maturity cap check', () => {
  assert.equal(E.bulletRepayable(200000, 12, 6), 212000); // 200000 × 0.12 × 0.5
  assert.equal(E.bulletRepayable(200000, 12, 12), 224000);
  assert.equal(E.bulletRepayable(200000, 0, 12), 200000);
  // Para 6(v): the cap tests the repayable amount, not the disbursed principal
  const value = 280000;
  const ceiling = E.maxLawfulLoan(value); // 238000
  assert.ok(E.bulletRepayable(238000, 12, 12) > ceiling); // 266560 breaches
  assert.ok(E.bulletRepayable(210000, 12, 12) <= ceiling); // 235200 fits
  // Para 15 constant comes from the corpus
  assert.equal(GIRVI_RULES.BULLET_MAX_MONTHS, 12);
});

test('margin-call gauge — % reference-price fall to breach (Para 20)', () => {
  // threshold value 200000/0.85 = 235294.12; (280000 − 235294.12)/280000
  assert.equal(E.marginCallDropPct(200000, 280000), 15.97);
  // loan at the exact ceiling of its tier: zero headroom
  assert.equal(E.marginCallDropPct(238000, 280000), 0);
  // loan above the lawful cap → negative (already breached)
  assert.ok(E.marginCallDropPct(250000, 280000) < 0);
  assert.equal(E.marginCallDropPct(0, 280000), null);
});

test('CSV — RFC 4180 quoting and CRLF', () => {
  assert.equal(E.csvField('plain'), 'plain');
  assert.equal(E.csvField('has, comma'), '"has, comma"');
  assert.equal(E.csvField('has "quote"'), '"has ""quote"""');
  assert.equal(
    E.toCsv([['item', 'net g'], ['bangle, gold', '45.8']]),
    'item,net g\r\n"bangle, gold",45.8\r\n'
  );
});

test('Indian grouping display (lakh/crore), deterministic', () => {
  assert.equal(E.formatINRPaise(25000000), '₹2,50,000');
  assert.equal(E.formatINRPaise(66666668), '₹6,66,667');
  assert.equal(E.formatINRPaise(123456789, { paise: true }), '₹12,34,567.89');
  assert.equal(E.formatINRPaise(99900), '₹999');
  assert.equal(E.formatINRPaise(100000000000), '₹1,00,00,00,000');
});

test('property: 10,000 seeded values — monotone, ≤85%V, self-consistent tier cap', () => {
  const rnd = E.mulberry32(20260723);
  const vs = [];
  for (let k = 0; k < 10000; k++) {
    vs.push(Math.round((10000 + rnd() * (2000000 - 10000)) * 100)); // paise
  }
  vs.sort((a, b) => a - b);
  let prev = -1;
  for (const v of vs) {
    const L = E.maxLawfulLoanPaise(v);
    assert.ok(L >= prev, 'non-decreasing in value');
    prev = L;
    assert.ok(L <= v * 0.85 + 1, 'never above 85% of value');
    // the loan must satisfy the cap of its OWN tier (the circular rule)
    const cap = E.tierCapPctForLoan(L);
    assert.ok(L * 100 <= v * cap, 'loan within its own tier cap');
  }
});
