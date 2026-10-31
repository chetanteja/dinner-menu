import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dinner Menu",
    short_name: "Dinner",
    description: "Decide tonight's dinner together.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFF7EA",
    theme_color: "#EF6A2B",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
