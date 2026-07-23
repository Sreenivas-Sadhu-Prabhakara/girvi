# girvi — corpus citations

Every fact in `data/rules.js` is clause-cited against one of the sources below.
All sources were fetched and verified on **2026-07-23**. The staged files in this
directory are dated text extracts captured at verification time (the RBI PDF and
BIS pages themselves are not redistributed here); the URLs are authoritative.

## 1. RBI (Lending Against Gold and Silver Collateral) Directions, 2025

- **Document:** Reserve Bank of India (Lending Against Gold and Silver Collateral)
  Directions, 2025 — circular **RBI/2025-26/47**, issued **6 June 2025**, updated
  **29 September 2025**, binding on banks, co-operative banks and NBFCs
  **no later than 1 April 2026** (Para 4).
- **URL:** https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=12859&Mode=0
- **Verified:** 2026-07-23 (live fetch of the RBI page; clause text captured in
  `rbi-directions-2025-extracts.md`).
- **Clauses used:** Para 4 (effective date), Para 6(v) (LTV definition + bullet
  repayable-at-maturity rule), Para 15 (12-month bullet tenor cap), Para 16
  (aggregate collateral limits), Para 17 (reference-price valuation), Para 18
  (intrinsic value only), Para 19 (tiered LTV table — note the heading
  “Total consumption loan amount per borrower”), Para 20 (LTV maintained on an
  ongoing basis).
- **Note on Para 17:** the September 2025 update values collateral at the
  reference price **of its actual purity**, falling back to the *nearest published
  purity, proportionately adjusted*, where a purity is not published. girvi's
  arithmetic (typed 22K/916 rate × fineness/916) is that proportionate
  adjustment, and the in-app copy says so.

## 2. Cross-check (secondary)

- **FIG Paper No. 52**, Cyril Amarchand Mangaldas “India Corporate Law” blog,
  November 2025 — independent law-firm summary confirming the tier table, the
  12-month bullet cap, the per-borrower aggregate collateral limits and dates.
- **URL:** https://corporate.cyrilamarchandblogs.com/2025/11/fig-paper-no-52-rbi-directions-on-lending-against-gold-and-silver-collateral-a-harmonised-regulatory-framework/
- **Verified:** 2026-07-23.

## 3. BIS IS 1417:2016 — gold fineness grades

- **Document:** Bureau of Indian Standards, “Brief on Hallmarking Scheme”
  (and the BIS hallmarking FAQ): *“IS 1417:2016 permits hallmarking of six
  caratage (fineness in ppt) of gold jewellery/artefacts, viz. 14K(585),
  18K(750), 20K(833), 22K(916), 23K(958) and 24KS(995).”*
- **URL:** https://www.bis.gov.in/wp-content/uploads/2020/12/brief-on-Hallmarking.pdf
  (FAQ: https://www.bis.gov.in/hallmarking-overview/hallmarking-faqs/hallmarking-faq/)
- **Verified:** 2026-07-23.

## 4. IBJA daily rates page (mechanism only — no rate shipped)

- **Observation (snapshot dated 2026-07-22/23):** ibjarates.com publishes daily
  AM/PM gold rates at purities 999, 995, 916 (22K), 750 and 585, and silver 999,
  per 10 g (gold) — the published benchmark the RBI valuation rule (Para 17)
  points at. girvi ships **no rate value**; the user types the rate.
- **URL:** https://ibjarates.com
- **Verified:** 2026-07-23.
