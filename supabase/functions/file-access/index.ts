import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OWNER_EMAIL = "tobopandey2309@gmail.com";
const BUCKET = "shared-files";
const LINK_TTL_SECONDS = 3600;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const KNOWN_ERRORS: Array<{ code: string; status: number }> = [
  { code: "password_required", status: 401 },
  { code: "invalid_password", status: 403 },
  { code: "not_authorized", status: 403 },
  { code: "not_found", status: 404 },
];

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function classifyError(message: string): { code: string; status: number } | null {
  return KNOWN_ERRORS.find((known) => message.includes(known.code)) ?? null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const action = body?.action;
    const fileId = body?.fileId;
    const folderId = body?.folderId;
    const download = body?.download === true;
    const password = typeof body?.password === "string" && body.password.length > 0
      ? body.password.slice(0, 72)
      : null;

    if (
      !["link", "delete", "delete-folder"].includes(action) ||
      (action === "delete-folder" ? !UUID_PATTERN.test(folderId ?? "") : !UUID_PATTERN.test(fileId ?? ""))
    ) {
      return jsonResponse({ error: "invalid_request" }, 400);
    }

    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: userData } = token ? await admin.auth.getUser(token) : { data: { user: null } };
    const isOwner = userData.user?.email === OWNER_EMAIL;

    const db = isOwner
      ? createClient(url, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false },
      })
      : admin;

    if (action === "link") {
      const { data, error } = await db.rpc("get_file_storage_path", {
        p_file_id: fileId,
        p_password: password,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : null;
      if (!row) return jsonResponse({ error: "not_found" }, 404);

      const { data: signed, error: signError } = await admin.storage
        .from(BUCKET)
        .createSignedUrl(row.out_storage_path, LINK_TTL_SECONDS, download ? { download: row.out_name } : undefined);
      if (signError || !signed?.signedUrl) throw signError ?? new Error("Could not sign file URL");
      return jsonResponse({ url: signed.signedUrl });
    }

    if (action === "delete") {
      const { data, error } = await db.rpc("delete_shared_file", {
        p_file_id: fileId,
        p_password: password,
      });
      if (error) throw error;
      const { error: removeError } = await admin.storage.from(BUCKET).remove([data as string]);
      if (removeError) return jsonResponse({ error: "cleanup_failed" }, 500);
      return jsonResponse({ ok: true });
    }

    const { data, error } = await db.rpc("delete_folder", {
      p_folder_id: folderId,
      p_password: password,
    });
    if (error) throw error;
    const paths = (data ?? []) as string[];
    if (paths.length > 0) {
      const { error: removeError } = await admin.storage.from(BUCKET).remove(paths);
      if (removeError) return jsonResponse({ error: "cleanup_failed" }, 500);
    }
    return jsonResponse({ ok: true });
  } catch (error) {
    const message = String((error as { message?: unknown })?.message ?? error);
    const known = classifyError(message);
    if (known) return jsonResponse({ error: known.code }, known.status);
    console.error("file-access failed:", message);
    return jsonResponse({ error: "server_error" }, 500);
  }
});
