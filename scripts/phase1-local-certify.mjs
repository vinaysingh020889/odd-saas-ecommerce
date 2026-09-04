import { spawnSync } from "node:child_process";

const node = process.execPath;
const cwd = process.cwd();

function run(label, modulePath, args = [], env = process.env) {
  process.stdout.write(`\n=== ${label} ===\n`);
  const result = spawnSync(node, [modulePath, ...args], { cwd, env, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const criticalEnv = {
  ...process.env,
  RUN_MEMBERSHIP_UAT: "true",
  RUN_FESTIVAL_COMMERCE_UAT: "true",
  RUN_PHASE1_ROLE_UAT: "true"
};
const regularEnv = { ...process.env };
delete regularEnv.RUN_MEMBERSHIP_UAT;
delete regularEnv.RUN_FESTIVAL_COMMERCE_UAT;
delete regularEnv.RUN_PHASE1_ROLE_UAT;

run("Prisma schema validation", "node_modules/prisma/build/index.js", ["validate"]);
run("Migration status", "node_modules/prisma/build/index.js", ["migrate", "status"]);
run("Persisted Phase-1 critical path", "node_modules/vitest/vitest.mjs", [
  "run",
  "lib/membership-cross-module.uat.test.ts",
  "lib/festival-commerce.uat.test.ts",
  "lib/phase1-role-matrix.uat.test.ts",
  "lib/kundli-assignment-engine.test.ts",
  "lib/kundli-guruji-workspace.test.ts",
  "lib/kundli-report-access.test.ts",
  "lib/kundli-report-review.test.ts"
], criticalEnv);
run("Full regression", "node_modules/vitest/vitest.mjs", ["run"], regularEnv);
run("TypeScript", "node_modules/typescript/bin/tsc", ["--noEmit"]);
run("ESLint", "node_modules/eslint/bin/eslint.js", ["."]);
run("Production build", "node_modules/next/dist/bin/next", ["build"]);

process.stdout.write("\nPHASE-1 LOCAL CERTIFICATION COMMANDS PASSED\n");
