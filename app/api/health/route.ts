import { NextResponse } from "next/server";
import { runtimeConfig } from "@/lib/env";
import { assessPhase1LaunchReadiness, type Phase1LaunchTarget } from "@/lib/launch-readiness";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function launchTarget(): Phase1LaunchTarget {
  if (runtimeConfig.appEnv === "production") return "production";
  if (runtimeConfig.appEnv === "staging") return "hosted-uat";
  return "local-uat";
}

export async function GET() {
  const readiness = assessPhase1LaunchReadiness(runtimeConfig, launchTarget());
  let database = "ok";

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = "unavailable";
  }

  const healthy = database === "ok" && readiness.eligible;
  return NextResponse.json(
    {
      status: healthy ? "ok" : "not-ready",
      target: readiness.target,
      database,
      phase1ScopeLocked: runtimeConfig.phase1UatMode,
      release: {
        id: runtimeConfig.releaseId ?? null,
        sha: runtimeConfig.releaseSha ?? null
      },
      checks: readiness.checks.map(({ code, severity, message }) => ({ code, severity, message }))
    },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}
