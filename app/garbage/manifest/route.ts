export const dynamic = "force-static";

/** Separate install: "Garbage Day" gets its own home-screen icon and opens straight to /garbage. */
export function GET() {
  return Response.json(
    {
      name: "Garbage Day",
      short_name: "Garbage",
      description: "Who takes the garbage out today?",
      start_url: "/garbage",
      scope: "/garbage",
      display: "standalone",
      orientation: "portrait",
      background_color: "#EAF8EF",
      theme_color: "#1F9D63",
      icons: [
        { src: "/pwa-icon/192?k=garbage", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/pwa-icon/512?k=garbage", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/pwa-icon/512?k=garbage", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json" } },
  );
}
