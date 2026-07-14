// Supabase Edge Function: scripts/upload-to-supabase.mjs 가 이 함수로 배치 upsert 요청을 보낸다.
// service role 키는 함수 실행 환경에만 존재하고 클라이언트/저장소에는 노출되지 않는다.
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), { status: 405 });
  }

  let rows;
  try {
    rows = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON body" }), { status: 400 });
  }
  if (!Array.isArray(rows)) {
    return new Response(JSON.stringify({ error: "expected a JSON array of rows" }), { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  );

  const { error } = await supabase.from("jobs").upsert(rows, { onConflict: "id" });
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ upserted: rows.length }), {
    headers: { "Content-Type": "application/json" },
  });
});
