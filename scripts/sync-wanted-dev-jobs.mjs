// 원티드 OpenAPI에서 "개발" 직군(태그ID 518) 하위 직무를 전부 순회하며
// 채용공고를 수집해 data/wanted-jobs.json 으로 저장한다.
//
// V2 /jobs 의 offset 페이지네이션은 10,000건에서 막히기 때문에,
// 직무(subcategory_tags) 단위로 나눠서 조회해 상한을 우회한다.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");

const env = Object.fromEntries(
  readFileSync(path.join(ROOT, ".env"), "utf8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

const CLIENT_ID = env.client_id;
const CLIENT_SECRET = env.client_secret;
const HEADERS = { "wanted-client-id": CLIENT_ID, "wanted-client-secret": CLIENT_SECRET };
const DEV_CATEGORY_TAG = 518;

async function fetchWithRetry(url) {
  for (let attempt = 0; attempt < 8; attempt++) {
    let resp;
    try {
      resp = await fetch(url, { headers: HEADERS });
    } catch (err) {
      const wait = Math.min(2 ** attempt, 30) * 1000;
      console.log(`[fetch] 네트워크 오류(${err}), ${wait / 1000}초 대기 후 재시도`);
      await sleep(wait);
      continue;
    }
    if (resp.status === 429 || resp.status >= 500) {
      const wait = Math.min(2 ** attempt, 30) * 1000;
      console.log(`[fetch] ${resp.status} 응답, ${wait / 1000}초 대기 후 재시도`);
      await sleep(wait);
      continue;
    }
    if (resp.status >= 400) {
      const body = await resp.text();
      throw new Error(`HTTP ${resp.status}: ${body.slice(0, 300)}`);
    }
    return resp.json();
  }
  throw new Error("재시도 횟수 초과");
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchSubcategoryJobs(subTagId, subTagTitle) {
  const jobs = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const url = new URL("https://openapi.wanted.jobs/v2/jobs");
    url.searchParams.set("category_tag", DEV_CATEGORY_TAG);
    url.searchParams.set("subcategory_tags", subTagId);
    url.searchParams.set("sort", "job.latest_order");
    url.searchParams.set("offset", offset);
    url.searchParams.set("limit", limit);

    const body = await fetchWithRetry(url.toString());
    const data = body.data || [];
    if (!data.length) break;

    jobs.push(...data);
    if (data.length < limit) break;

    offset += limit;
    await sleep(150);
  }

  console.log(`[${subTagTitle}] ${jobs.length}건 수집`);
  return jobs;
}

function flattenJob(job) {
  const company = job.company || {};
  const address = job.address || {};
  const reward = job.reward || {};
  const categoryTags = job.category_tags || {};
  const parentTag = categoryTags.parent_tag || {};
  const childTags = categoryTags.child_tags || [];

  return {
    id: job.id,
    name: job.name ?? null,
    status: job.status ?? null,
    due_time: job.due_time ?? null,
    employment_type: job.employment_type ?? null,
    additional_apply_type: job.additional_apply_type ?? [],
    company_id: company.id ?? null,
    company_name: company.name ?? null,
    company_link: company.link ?? null,
    country: address.country ?? null,
    location: address.location ?? null,
    full_location: address.full_location ?? null,
    category_parent: parentTag.title ?? null,
    category_children: childTags.map((t) => t.title || "").filter(Boolean),
    reward_total: reward.total ?? null,
    url: job.url ?? null,
  };
}

async function main() {
  const categories = await fetchWithRetry("https://openapi.wanted.jobs/v1/tags/categories");
  const dev = categories.data.find((c) => c.id === DEV_CATEGORY_TAG);
  if (!dev) throw new Error("개발 직군 태그를 찾지 못했습니다.");

  console.log(`개발 직군 하위 직무 ${dev.sub_tags.length}개를 순회합니다.`);

  const byId = new Map();
  for (const sub of dev.sub_tags) {
    const jobs = await fetchSubcategoryJobs(sub.id, sub.title);
    for (const job of jobs) {
      byId.set(job.id, flattenJob(job));
    }
  }

  const rows = [...byId.values()];
  const outPath = path.join(__dirname, "..", "data", "wanted-jobs.json");
  writeFileSync(outPath, JSON.stringify(rows), "utf8");
  console.log(`완료: 중복 제거 후 총 ${rows.length}건을 ${outPath} 에 저장했습니다.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
