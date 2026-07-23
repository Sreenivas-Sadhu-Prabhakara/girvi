/* girvi — corpus: RBI (Lending Against Gold and Silver Collateral) Directions, 2025
   + BIS IS 1417 fineness grades + IBJA reference-price mechanism.
   Every fact carries clause reference, source URL and verified-on date.
   The engine (data/engine.js) reads its constants FROM this module — numbers are
   never duplicated in app code. Verified 2026-07-23 against the live RBI page
   (RBI/2025-26/47, updated 29 September 2025) and bis.gov.in. */

'use strict';

var GIRVI_RULES = (function () {

  const RBI_URL = 'https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=12859&Mode=0';
  const RBI_DOC = 'Reserve Bank of India (Lending Against Gold and Silver Collateral) Directions, 2025 (RBI/2025-26/47, 6 June 2025, updated 29 September 2025)';
  const VERIFIED = '2026-07-23';

  /* ---- The 14 clause-cited facts (rendered verbatim in the Rules panel) ---- */
  const FACTS = [
    {
      id: 'tier-85', category: 'ltv', clause: 'Para 19',
      statement: 'Consumption loans up to ₹2.5 lakh: maximum LTV ratio 85 per cent.',
      quote: 'The maximum LTV ratio in respect of consumption loans against the eligible collateral shall not exceed LTV ratios as provided in the table below: ≤ ₹2.5 lakh — 85 per cent.',
      source_name: RBI_DOC, source_url: RBI_URL, verified_on: VERIFIED, confidence: 'verified'
    },
    {
      id: 'tier-80', category: 'ltv', clause: 'Para 19',
      statement: 'Consumption loans above ₹2.5 lakh and up to ₹5 lakh: maximum LTV ratio 80 per cent.',
      quote: '> ₹2.5 lakh & ≤ ₹5 lakh — 80 per cent.',
      source_name: RBI_DOC, source_url: RBI_URL, verified_on: VERIFIED, confidence: 'verified'
    },
    {
      id: 'tier-75', category: 'ltv', clause: 'Para 19',
      statement: 'Consumption loans above ₹5 lakh: maximum LTV ratio 75 per cent.',
      quote: '> ₹5 lakh — 75 per cent.',
      source_name: RBI_DOC, source_url: RBI_URL, verified_on: VERIFIED, confidence: 'verified'
    },
    {
      id: 'tier-aggregate', category: 'ltv', clause: 'Para 19 (table heading)',
      statement: 'The tier is chosen by the TOTAL consumption loan amount per borrower — not per loan. If you already hold a gold loan, a new loan can push your total into a lower-LTV tier.',
      quote: 'Total consumption loan amount per borrower.',
      source_name: RBI_DOC, source_url: RBI_URL, verified_on: VERIFIED, confidence: 'verified'
    },
    {
      id: 'ltv-ongoing', category: 'ltv', clause: 'Para 20',
      statement: 'The LTV cap is not a sanction-day test only — it must hold every day of the loan, so a falling gold price can trigger a margin call.',
      quote: 'The prescribed LTV ratio shall be maintained on an ongoing basis throughout the tenor of the loan.',
      source_name: RBI_DOC, source_url: RBI_URL, verified_on: VERIFIED, confidence: 'verified'
    },
    {
      id: 'bullet-ltv-repayable', category: 'bullet', clause: 'Para 6(v)',
      statement: 'For bullet-repayment loans the LTV is computed on the total amount repayable at maturity (principal + interest), not on the amount disbursed.',
      quote: 'Loan to Value (LTV) ratio on a day means the ratio of the outstanding loan amount to the value of the pledged eligible collateral as on that day. In case of bullet repayment loans, however, the LTV calculation shall take into account the total amount repayable at maturity.',
      source_name: RBI_DOC, source_url: RBI_URL, verified_on: VERIFIED, confidence: 'verified'
    },
    {
      id: 'bullet-tenor-12m', category: 'bullet', clause: 'Para 15',
      statement: 'Consumption loans with bullet repayment are capped at a 12-month tenor (renewal is permitted by the clause; renewal math is out of girvi’s scope).',
      quote: 'Tenor of consumption loans in the nature of bullet repayment loans shall be capped at 12 months, which may be renewed.',
      source_name: RBI_DOC, source_url: RBI_URL, verified_on: VERIFIED, confidence: 'verified'
    },
    {
      id: 'valuation-lower-of', category: 'valuation', clause: 'Para 17',
      statement: 'Collateral is valued at the LOWER of (a) the 30-day average closing price and (b) the previous day’s closing price for that purity, as published by IBJA or a SEBI-regulated commodity exchange.',
      quote: 'Gold or silver accepted as collateral shall be valued based on the reference price corresponding to its actual purity (caratage). For this purpose, the lower of (a) the average closing price for gold or silver, as the case may be, of that specific purity over the preceding 30 days, or (b) the closing price for gold or silver, as the case may be, of that specific purity on the preceding day, as published either by the India Bullion and Jewellers Association Ltd. (IBJA) or by a commodity exchange regulated by the Securities and Exchange Board of India (SEBI) shall be used.',
      source_name: RBI_DOC, source_url: RBI_URL, verified_on: VERIFIED, confidence: 'verified'
    },
    {
      id: 'valuation-nearest-purity', category: 'valuation', clause: 'Para 17',
      statement: 'If no published price exists for your exact purity, the lender uses the nearest published purity, proportionately adjusted — this is the arithmetic girvi uses from your typed 22K (916) rate.',
      quote: 'If price information for the specific purity is not directly available, the lender shall use the published price available for the nearest available purity and proportionately adjust.',
      source_name: RBI_DOC, source_url: RBI_URL, verified_on: VERIFIED, confidence: 'verified'
    },
    {
      id: 'intrinsic-only', category: 'valuation', clause: 'Para 18',
      statement: 'Only the metal counts. Stones, gems and making charges add nothing to the lending value.',
      quote: 'Only the intrinsic value of the gold or silver contained in the eligible collateral shall be reckoned and no other cost elements, such as precious stones or gems, shall be added thereto.',
      source_name: RBI_DOC, source_url: RBI_URL, verified_on: VERIFIED, confidence: 'verified'
    },
    {
      id: 'aggregate-collateral', category: 'limits', clause: 'Para 16',
      statement: 'Across all loans with a lender you may pledge at most 1 kg of gold ornaments and 50 g of gold coins (silver: 10 kg ornaments, 500 g coins).',
      quote: 'The aggregate weight of ornaments pledged for all loans to a borrower shall not exceed 1 kilogram for gold ornaments, and 10 kilograms for silver ornaments … the aggregate weight of coin(s) pledged for all loans to a borrower shall not exceed 50 grams in case of gold coins, and 500 grams in case of silver coins.',
      source_name: RBI_DOC, source_url: RBI_URL, verified_on: VERIFIED, confidence: 'verified'
    },
    {
      id: 'effective-date', category: 'scope', clause: 'Para 4',
      statement: 'The Directions were issued on 6 June 2025 and bind banks, co-operative banks and NBFCs no later than 1 April 2026 — they are in force today.',
      quote: 'Instructions issued vide these Directions shall be complied with as expeditiously as possible but no later than April 1, 2026.',
      source_name: RBI_DOC, source_url: RBI_URL, verified_on: VERIFIED, confidence: 'verified'
    },
    {
      id: 'bis-fineness', category: 'purity', clause: 'IS 1417:2016',
      statement: 'BIS hallmarking recognises six gold fineness grades: 14K (585), 18K (750), 20K (833), 22K (916), 23K (958) and 24K (995) parts per thousand.',
      quote: 'IS 1417:2016 permits hallmarking of six caratage (fineness in ppt) of gold jewellery/artefacts, viz. 14K(585), 18K(750), 20K(833), 22K(916), 23K(958) and 24KS(995).',
      source_name: 'Bureau of Indian Standards — Brief on Hallmarking Scheme / IS 1417:2016',
      source_url: 'https://www.bis.gov.in/wp-content/uploads/2020/12/brief-on-Hallmarking.pdf',
      verified_on: VERIFIED, confidence: 'verified'
    },
    {
      id: 'ibja-mechanism', category: 'valuation', clause: 'reference-price mechanism',
      statement: 'IBJA publishes daily AM/PM gold rates at purities 999, 995, 916 (22K), 750 and 585 — the published benchmark the RBI valuation rule points at. girvi never fetches a live rate; you type the rate, and the no-network CSP makes that a guarantee.',
      quote: 'IBJA publishes daily Gold opening (AM) and closing (PM) Rates. (Site mechanism observed on a dated snapshot; no rate value is shipped.)',
      source_name: 'India Bullion and Jewellers Association — daily rates page (snapshot documenting the mechanism only)',
      source_url: 'https://ibjarates.com',
      verified_on: VERIFIED, confidence: 'verified'
    }
  ];

  /* ---- Engine constants, derived from the facts above ---- */

  // Para 19 tier table, in integer paise. capPct applies while the LOAN sits in the band.
  const TIERS = [
    { maxLoanPaise: 250000 * 100, capPct: 85 },   // ≤ ₹2.5 lakh
    { maxLoanPaise: 500000 * 100, capPct: 80 },   // > ₹2.5 lakh & ≤ ₹5 lakh
    { maxLoanPaise: null,         capPct: 75 }    // > ₹5 lakh
  ];

  // IS 1417:2016 six grades (fineness in parts per thousand). 916 = 22K reference.
  const FINENESS = [
    { label: '14K', ppt: 585 },
    { label: '18K', ppt: 750 },
    { label: '20K', ppt: 833 },
    { label: '22K', ppt: 916 },
    { label: '23K', ppt: 958 },
    { label: '24K', ppt: 995 }
  ];
  const REFERENCE_PPT = 916; // valuation is proportionate to the 22K reference rate the user types

  // Para 16 per-borrower aggregate collateral limits (grams, gold only in this app)
  const LIMITS = { ornamentsMaxG: 1000, coinsMaxG: 50 };

  // Para 15
  const BULLET_MAX_MONTHS = 12;

  const META = {
    doc: RBI_DOC,
    doc_url: RBI_URL,
    issued_on: '2025-06-06',
    binding_from: '2026-04-01',
    verified_on: VERIFIED
  };

  return { FACTS, TIERS, FINENESS, REFERENCE_PPT, LIMITS, BULLET_MAX_MONTHS, META };
})();

if (typeof module !== 'undefined') module.exports = { GIRVI_RULES };
