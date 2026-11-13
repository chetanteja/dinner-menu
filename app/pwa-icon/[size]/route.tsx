import { ImageResponse } from "next/og";
import { GarbageIconArt, IconArt } from "@/lib/iconArt";

export async function GET(req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  const px = Math.min(1024, Math.max(48, Number(size) || 192));
  const garbage = new URL(req.url).searchParams.get("k") === "garbage";
  return new ImageResponse(garbage ? <GarbageIconArt size={px} /> : <IconArt size={px} />, { width: px, height: px });
}
