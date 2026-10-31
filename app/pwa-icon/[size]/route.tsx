import { ImageResponse } from "next/og";
import { IconArt } from "@/lib/iconArt";

export async function GET(_req: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params;
  const px = Math.min(1024, Math.max(48, Number(size) || 192));
  return new ImageResponse(<IconArt size={px} />, { width: px, height: px });
}
