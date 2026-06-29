import { NextResponse } from "next/server";
import { getActiveFestivalCampaigns, serializeFestival } from "@/lib/merchandising";

type RouteProps = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, { params }: RouteProps) {
  const { slug } = await params;
  const [festival] = await getActiveFestivalCampaigns({ slug });

  if (!festival) {
    return NextResponse.json({ error: "Festival campaign not found" }, { status: 404 });
  }

  return NextResponse.json({ festival: serializeFestival(festival) });
}
