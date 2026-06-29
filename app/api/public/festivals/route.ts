import { NextResponse } from "next/server";
import { getActiveFestivalCampaigns, serializeFestival } from "@/lib/merchandising";

export async function GET() {
  const festivals = await getActiveFestivalCampaigns();
  return NextResponse.json({ festivals: festivals.map(serializeFestival) });
}
