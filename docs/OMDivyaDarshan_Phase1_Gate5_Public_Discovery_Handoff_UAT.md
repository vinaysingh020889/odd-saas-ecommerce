# OMDivyaDarshan Phase-1 Gate 5 - Public Discovery and Handoff UAT Evidence

**Evidence date:** 4 September 2026
**Gate:** Public Kundli, Membership, Festival/Shop, and Asthi discovery and handoff
**Status:** CLOSED FOR LOCAL SYNTHETIC CLIENT UAT
**Environment:** Local production build; local PostgreSQL; Phase-1 UAT mode; existing provisional catalog content
**Working branch:** `phase1-uat`

## Scope and Boundary

This gate verifies that the locked Phase-1 public entry points are discoverable, resolve to working rendered routes, and do not advertise deferred general ecommerce or service surfaces. It does not validate final client copy, final festival catalog data, the final Asthi Google Form URL, production domains, external WordPress pages, analytics, payment providers, or production infrastructure.

## Blocking Gaps Corrected

| Gap | Resolution |
| --- | --- |
| Phase-1 primary navigation omitted the required Asthi CTA | Added Asthi Visarjan as the fourth locked public entry point |
| Asthi landing page started the internal mock application | Added `ASTHI_APPLICATION_URL`; Phase-1 opens only a validated HTTP(S) client form and otherwise shows a clear pending-client-input state |
| Festival Hampers navigation opened the full active catalog | Phase-1 `/shop` now queries only products linked to current active homepage festival campaigns |
| Hero slides, promotions, intent categories, services, and category links could rediscover deferred surfaces | Filtered or suppressed those public elements in Phase-1 mode; festival CTAs remain inside the selected festival path |
| Footer advertised broad products, services, a hard-coded festival, and generic support | Replaced it in Phase-1 mode with the four locked public areas plus account destinations |
| Public header exposed Admin only to three role types | Switched to the central admin-role policy so Guruji and Product Manager receive their valid admin handoff |
| Kundli breadcrumb pointed into the deferred general services page | Returned the breadcrumb to Festival Hampers instead |

## Public Destination Matrix

| Entry point | Expected destination/behavior | Result |
| --- | --- | --- |
| Root / logo | Festival-limited `/shop` | PASS |
| Festival Hampers | Active festival campaigns and only their linked active products | PASS |
| Festival campaign | Internal campaign page and product anchor; no deferred service/category discovery | PASS |
| Membership | Active provisional plan matrix and membership workflow | PASS |
| Kundli | Active package discovery and Kundli request CTA | PASS |
| Asthi Visarjan | Informational landing page plus validated external form when configured | PASS |
| Missing final Asthi URL | Explicit client-pending message; no broken or internal mock CTA | PASS |
| Authenticated admin persona | `/admin` handoff visible for every recognized admin role | PASS - automated policy validation |

## Rendered HTTP Smoke Evidence

The verified production build was started locally and each route was requested from its rendered server output.

| Check | Result |
| --- | --- |
| `/shop` | 200; active festival product visible |
| Known non-festival product on `/shop` | Excluded |
| Phase-1 Asthi navigation | Visible |
| Deferred All Services footer link | Excluded |
| `/kundli` | 200; Start Kundli Request visible |
| `/membership` | 200; membership plan surface visible |
| `/services/asthi-visarjan` | 200; pending-client-URL state visible; internal Start Application absent |
| `/festivals/raksha-bandhan-2026` | 200; product anchor visible; festival services excluded |

The in-app browser runtime could not start because the Windows sandbox rejected its process with an ACL error. No application failure was observed. Rendered HTTP inspection against the same production build completed the route and content-state checks; interactive visual browser rehearsal remains part of Gate 6.

## Automated Verification

| Check | Result |
| --- | --- |
| Focused public policy and handoff suite | PASS - 11/11 |
| Full Vitest suite | PASS - 22 files, 112 active tests |
| Opt-in persisted suites in normal runs | SKIPPED BY DEFAULT - explicit synthetic/live flags required |
| TypeScript | PASS |
| Full ESLint | PASS |
| Next.js production build | PASS - 77/77 pages generated |

## Client-Pending Configuration

- `ASTHI_APPLICATION_URL`: final client-owned Google Form or approved equivalent.
- Final festival names, dates, product selections, SKUs, inventory, prices, images, shipping, tax, and CTA copy.
- Final membership plan matrix and benefit wording.
- Final WordPress/public information URLs and content where required.

These inputs do not reopen Gate 5 engineering. They must be inserted and re-smoked before hosted client UAT.

## Closure Decision

Gate 5 is `LOCAL-UAT VALIDATED` and `CLOSED FOR SYNTHETIC CLIENT UAT`. The public Phase-1 discovery surface now matches the locked product direction and handles the missing external Asthi URL honestly without creating a broken link.

## Next Execution Step

Proceed to Gate 6 - Local UAT and Launch Certification: run the full critical path as representative customer, Guruji, Product Manager, Support Agent, and Operations Admin personas; complete configuration, security, migration, operational, rollback, and evidence checks; then decide whether the repository can be frozen as a hosted-UAT release candidate.
