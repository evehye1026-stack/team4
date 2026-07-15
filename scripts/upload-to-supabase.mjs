// data/wanted-jobs.json 을 배치로 나눠 sync-jobs 엣지 함수로 전송, Supabase jobs 테이블에 upsert한다.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FN_URL = "https://blpilnfdxtdfigmqhyaz.supabase.co/functions/v1/sync-jobs";
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
const BATCH = 300;

if (!ANON_KEY) {
  console.error("SUPABASE_ANON_KEY 환경변수가 필요합니다.");
  process.exit(1);
}

async function main() {
  const rows = JSON.parse(readFileSync(path.join(__dirname, "..", "data", "wanted-jobs.json"), "utf8"));

  let total = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const resp = await fetch(FN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON_KEY}` },
      body: JSON.stringify(chunk),
    });
    const body = await resp.json();
    if (!resp.ok) {
      console.error("배치 실패", i, body);
      process.exit(1);
    }
    total += body.upserted;
    console.log(`배치 ${i}~${i + chunk.length} 완료 (누적 ${total})`);
  }
  console.log(`전체 업로드 완료: ${total}건`);
}

main();
