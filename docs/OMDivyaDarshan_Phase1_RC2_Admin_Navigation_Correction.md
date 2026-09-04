# OMDivyaDarshan Phase-1 RC2 - Complete Admin Navigation Correction

**Decision date:** 5 September 2026  
**Release identifier:** `phase1-uat-rc2`  
**Candidate commit:** `2e644d1806dddd5f44ac9f7700b42448230d0158`  
**Status:** `LOCAL CERTIFICATION PASSED - REMOTE TAG/DEPLOYMENT PENDING`  
**Scope:** Navigation discoverability only; no database, migration, workflow, payment, or production change.

## 1. Reason for RC2

RC1 used the Phase-1 route list as an exact sidebar allowlist. This hid 29 non-core menu links even when the signed-in administrator had permission to use them. The routes and server actions were never deleted, but the hidden navigation made complete backend discovery and staff training impractical.

The Phase-1 lock should identify the core launch path, not conceal authorized backend capabilities. RC2 therefore keeps the public launch scope unchanged while restoring complete role-authorized admin navigation.

## 2. Implemented Behavior

- Removed the Phase-1 sidebar filter that discarded non-core links.
- Retained every existing page-level and role-based authorization boundary.
- Kept all modules in their existing functional groups: Command, Catalog, Merchandising, Operations, Finance, and System.
- Added an `Extended` marker to authorized menu items outside the locked Phase-1 core.
- Kept the restricted Guruji/Astrologer navigation limited to `My Work`.
- Restored discoverability for Hero Slides, Homepage Layout, Services, Tags, Reviews, fulfilment tools, generic operations tools, reports, Roles, Permissions, Settings, and other authorized backend areas.
- Customers remains the user/customer administration entry. Roles and Permissions are visible only to Super Admin. The repository does not currently contain a separate full staff-user provisioning module.

The source defines 47 navigation entries. The 18 locked Phase-1 entries remain unmarked core links; the other 29 are shown as `Extended` when the current role is permitted to use them. Specialized Vendor, Assigned Services, and Support Workbench aliases remain role-scoped because they all resolve to the role-specific `My Work` implementation.

## 3. Security Boundary

RC2 does not show or grant every function to every account. Menu visibility remains aligned to role permissions:

- Super Admin receives the complete administrative and governance navigation.
- Operations Admin receives operations, commerce, customer, audit, and relevant system tools.
- Product Manager receives catalog and merchandising tools.
- Support Agent receives search, customer and support/request tools.
- Guruji/Astrologer remains isolated to assigned Kundli work.
- Vendor and other restricted operational personas retain their scoped workbench.

Direct-route server authorization remains authoritative even if a menu is rendered incorrectly in the future.

## 4. Certification Evidence

| Check | Result |
| --- | --- |
| Focused navigation/role tests | 25 passed |
| Persisted Phase-1 critical path | 7 suites, 33 tests passed |
| Full regression | 23 suites, 119 active tests passed; 4 opt-in suites skipped in the normal pass |
| Prisma schema | Valid |
| Migration status | 40 migrations; database up to date |
| TypeScript | Passed |
| ESLint | Passed |
| Next.js production build | Passed; 77 static pages generated and all dynamic routes compiled |

## 5. Release and Hosted-UAT Rule

RC1 remains immutable. The currently hosted service must not be described as containing this correction until it is deployed from `phase1-uat-rc2`.

Before deployment:

1. Publish the annotated RC2 tag to the approved origin and verify the remote target.
2. Deploy from the RC2 tag/immutable image, not from the moving branch.
3. Correct the existing hosted `APP_ENV` classification to `staging` in the same configuration-only deployment process.
4. Require `/api/health` to return HTTP 200 with `target=hosted-uat` and zero blockers.
5. Visually verify the full sidebar as Super Admin and the restricted sidebar as Guruji, Product Manager, and Support Agent.

This RC2 is synthetic UAT only and does not authorize production.
