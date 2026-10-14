import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const DEFAULT_SUPABASE_URL = "https://annkrblalwfefhyifgzq.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_276rx0e35ICh3xwa7MZ2bw_0IcU94iQ";

const allowedProducts = new Set([
  "ai-side-hustle-kit-2026",
  "creator-blueprint",
  "digital-income-planner",
]);

function bearer(request: Request): string | null {
  const header = request.headers.get("authorization");
  return header?.startsWith("Bearer ") ? header.slice(7).trim() || null : null;
}

function decodeBytea(value: string): Uint8Array {
  if (value.startsWith("\\x")) {
    const hex = value.slice(2);
    if (hex.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(hex)) {
      throw new Error("Invalid bytea value");
    }

    const bytes = new Uint8Array(hex.length / 2);
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Number.parseInt(
        hex.slice(index * 2, index * 2 + 2),
        16,
      );
    }
    return bytes;
  }

  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

export const Route = createFileRoute("/api/download")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const product = url.searchParams.get("product");
        const token = bearer(request);

        if (!product || !allowedProducts.has(product)) {
          return Response.json(
            { error: "Invalid download request." },
            { status: 400 },
          );
        }
        if (!token) {
          return Response.json({ error: "Sign in to download." }, { status: 401 });
        }

        const supabaseUrl = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
        const publishableKey =
          process.env.SUPABASE_PUBLISHABLE_KEY ||
          DEFAULT_SUPABASE_PUBLISHABLE_KEY;
        const authClient = createClient(supabaseUrl, publishableKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: authData, error: authError } =
          await authClient.auth.getUser(token);
        if (authError || !authData.user) {
          return Response.json(
            { error: "Your session has expired. Please sign in again." },
            { status: 401 },
          );
        }

        const db = supabaseAdmin as any;
        const { data: entitlement, error: entitlementError } = await db
          .from("vault_entitlements")
          .select("status")
          .eq("user_id", authData.user.id)
          .eq("product_slug", product)
          .maybeSingle();

        if (entitlementError || entitlement?.status !== "active") {
          return Response.json(
            { error: "An active purchase is required." },
            { status: 403 },
          );
        }

        const { data: file, error: fileError } = await db
          .from("vault_files")
          .select("filename, content_type, file_data")
          .eq("product_slug", product)
          .single();

        if (fileError || !file || typeof file.file_data !== "string") {
          return Response.json(
            { error: "Download unavailable." },
            { status: 500 },
          );
        }

        let bytes: Uint8Array;
        try {
          bytes = decodeBytea(file.file_data);
        } catch (error) {
          console.error("[download] invalid file encoding", error);
          return Response.json(
            { error: "Download unavailable." },
            { status: 500 },
          );
        }

        return new Response(bytes, {
          status: 200,
          headers: {
            "Content-Type": file.content_type || "application/pdf",
            "Content-Disposition": `attachment; filename="${String(file.filename).replace(/["\\\r\n]/g, "_")}"`,
            "Cache-Control": "private, no-store, max-age=0",
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});
