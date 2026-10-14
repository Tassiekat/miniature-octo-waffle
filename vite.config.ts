import { defineConfig as lovableDefineConfig } from "@lovable.dev/vite-tanstack-config";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Lovable's default wrapper builds a Cloudflare Worker. Vercel needs Nitro's
// server output so API routes (checkout, capture, and downloads) are deployed.
export default process.env.VERCEL
  ? defineConfig({
      plugins: [
        tsconfigPaths(),
        tanstackStart(),
        nitro({ preset: "vercel" }),
        viteReact(),
        tailwindcss(),
      ],
    })
  : lovableDefineConfig({
      tanstackStart: {
        server: { entry: "server" },
      },
      vite: { plugins: [] },
    });
