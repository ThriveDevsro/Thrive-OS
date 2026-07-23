import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return { name: "Thrive OS", short_name: "Thrive OS", description: "Thrive Dev company operating system", start_url: "/dashboard", display: "standalone", background_color: "#f7f8fb", theme_color: "#000000", orientation: "any", icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }] };
}
