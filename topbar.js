// 상단바(topbar) 공용 스크립트 — 채용 대시보드(index.html)와 예상면접(interview-questions.html) 등
// 모든 페이지에서 공유한다: 로그인/회원가입, 전역 공고 검색, 공고 카드 렌더링.
// data.js가 먼저 로드되어 있어야 한다 (SUPABASE_URL, POSTINGS, SORT_OPTIONS 등 공용 상수/헬퍼 제공).

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;

// ===== 공지 배너 닫기 =====
document.getElementById("announce-close").addEventListener("click", () => {
  document.getElementById("announce-banner").classList.add("closed");
});

// ===== 전역 검색 드로어 (상단바 우측 돋보기 버튼) =====
const searchDrawer = document.getElementById("search-drawer");
const searchDrawerBackdrop = document.getElementById("search-drawer-backdrop");
const globalSearchBtn = document.getElementById("global-search-btn");

function openSearchDrawer() {
  searchDrawer.classList.add("open");
  searchDrawerBackdrop.classList.add("open");
  searchDrawer.setAttribute("aria-hidden", "false");
  globalSearchBtn.setAttribute("aria-expanded", "true");
  document.getElementById("search-input").focus();
}

function closeSearchDrawer() {
  searchDrawer.classList.remove("open");
  searchDrawerBackdrop.classList.remove("open");
  searchDrawer.setAttribute("aria-hidden", "true");
  globalSearchBtn.setAttribute("aria-expanded", "false");
}

globalSearchBtn.addEventListener("click", () => {
  searchDrawer.classList.contains("open") ? closeSearchDrawer() : openSearchDrawer();
});
document.getElementById("search-drawer-close").addEventListener("click", closeSearchDrawer);
searchDrawerBackdrop.addEventListener("click", closeSearchDrawer);
document.getElementById("hero-search-cta")?.addEventListener("click", openSearchDrawer);

// ===== 로그인/회원가입 드로어 (상단바 우측) =====
const authDrawer = document.getElementById("auth-drawer");
const authDrawerBackdrop = document.getElementById("auth-drawer-backdrop");

function openAuthDrawer() {
  authDrawer.classList.add("open");
  authDrawerBackdrop.classList.add("open");
  authDrawer.setAttribute("aria-hidden", "false");
  document.getElementById("auth-email").focus();
}

function closeAuthDrawer() {
  authDrawer.classList.remove("open");
  authDrawerBackdrop.classList.remove("open");
  authDrawer.setAttribute("aria-hidden", "true");
}

document.getElementById("topbar-login-btn").addEventListener("click", openAuthDrawer);
document.getElementById("topbar-signup-btn").addEventListener("click", openAuthDrawer);
document.getElementById("auth-drawer-close").addEventListener("click", closeAuthDrawer);
authDrawerBackdrop.addEventListener("click", closeAuthDrawer);
document.getElementById("topbar-logout-btn").addEventListener("click", () => supabaseClient.auth.signOut());

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (searchDrawer.classList.contains("open")) closeSearchDrawer();
  if (authDrawer.classList.contains("open")) closeAuthDrawer();
});

function authMessage(text, isError) {
  const el = document.getElementById("auth-message");
  el.textContent = text;
  el.style.color = isError ? "#e5484d" : "";
}

document.getElementById("auth-signup-btn").addEventListener("click", async () => {
  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value;
  if (!email || password.length < 6) {
    authMessage("이메일과 6자 이상 비밀번호를 입력하세요.", true);
    return;
  }
  const { data, error } = await supabaseClient.auth.signUp({ email, password });
  if (error) { authMessage(error.message, true); return; }
  authMessage(data.session ? "가입 완료!" : "가입 확인 이메일을 보냈습니다. 확인 후 로그인해주세요.");
});

document.getElementById("auth-login-btn").addEventListener("click", async () => {
  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value;
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) authMessage(error.message, true);
});

async function renderAuthTab() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  currentUser = session?.user ?? null;

  const guestArea = document.getElementById("topbar-auth-guest");
  const userArea = document.getElementById("topbar-auth-user");

  if (currentUser) {
    guestArea.style.display = "none";
    userArea.style.display = "flex";
    document.getElementById("topbar-account-email").textContent = currentUser.email;
    closeAuthDrawer();
  } else {
    guestArea.style.display = "flex";
    userArea.style.display = "none";
  }
}

supabaseClient.auth.onAuthStateChange(() => {
  renderAuthTab();
});

// ===== 공통: 공고 카드 렌더 =====
function renderJobCard(job) {
  const div = document.createElement("div");
  div.className = "job-card";
  div.tabIndex = 0;
  div.addEventListener("click", () => window.open(job.url, "_blank"));
  div.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); window.open(job.url, "_blank"); }
  });
  const reward = formatReward(job);
  div.innerHTML = `
    <div class="logo">
      <span>${job.company ? job.company.charAt(0) : "🏢"}</span>
      ${job.logoUrl ? `<img class="logo-img" src="${job.logoUrl}" alt="" loading="lazy" onerror="this.remove()">` : ""}
    </div>
    <p class="name">${job.name}</p>
    <p class="company">${job.company}</p>
    <div class="address">📍 ${job.city}${job.district ? " " + job.district : ""}</div>
    <div class="meta-row">
      <span class="salary">${formatDueDate(job)}</span>
      ${reward ? `<span class="applicants">${reward}</span>` : ""}
    </div>
    <div class="tags">
      <span class="tag">${job.subcategory}</span>
      <span class="tag">${employmentTypeLabel(job.employmentType)}</span>
    </div>
    <div class="job-card-overlay">
      <div class="overlay-detail"><span class="label">고용형태</span><span class="value">${employmentTypeLabel(job.employmentType)}</span></div>
      <div class="overlay-detail"><span class="label">경력조건</span><span class="value">${job.careerLevel}</span></div>
      <div class="overlay-detail"><span class="label">마감일</span><span class="value">${formatDueDate(job)}</span></div>
      <div class="overlay-detail"><span class="label">근무지역</span><span class="value">${job.city} ${job.district}</span></div>
      <div class="overlay-detail"><span class="label">직무 태그</span><span class="value">${job.categoryChildren.join(", ")}</span></div>
      <a class="overlay-interview-link" href="interview-questions.html?jobId=${job.id}" target="_blank" rel="noopener">상세보기 →</a>
    </div>
  `;
  div.querySelector(".overlay-interview-link").addEventListener("click", (e) => e.stopPropagation());
  return div;
}

function renderCardList(container, list) {
  container.innerHTML = "";
  if (list.length === 0) {
    container.innerHTML = `<div class="empty-state">조건에 맞는 공고가 없습니다.</div>`;
    return;
  }
  list.forEach(job => container.appendChild(renderJobCard(job)));
}

function fillSelect(id, options, valueKey, labelKey) {
  const sel = document.getElementById(id);
  if (typeof options[0] === "string") {
    sel.innerHTML = options.map(o => `<option value="${o}">${o}</option>`).join("");
  } else {
    sel.innerHTML = options.map(o => `<option value="${o[valueKey]}">${o[labelKey]}</option>`).join("");
  }
}

// ===== 전역 검색 드로어 내부: 필터링된 공고 목록 =====
let searchState = { keyword: "", city: "전체", sort: "latest", career: "경력 전체" };

function renderSearchTab() {
  fillSelect("f-city", CITY_OPTIONS);
  fillSelect("search-career", CAREER_LEVEL_OPTIONS);
  fillSelect("search-sort", SORT_OPTIONS, "value", "label");

  document.getElementById("f-city").value = searchState.city;
  document.getElementById("search-career").value = searchState.career;
  document.getElementById("search-sort").value = searchState.sort;

  document.getElementById("search-input").oninput = (e) => {
    searchState.keyword = e.target.value.trim().toLowerCase();
    applySearchFilter();
  };
  document.getElementById("f-city").onchange = (e) => { searchState.city = e.target.value; applySearchFilter(); };
  document.getElementById("search-career").onchange = (e) => { searchState.career = e.target.value; applySearchFilter(); };
  document.getElementById("search-sort").onchange = (e) => { searchState.sort = e.target.value; applySearchFilter(); };

  applySearchFilter();
}

function applySearchFilter() {
  let list = POSTINGS.filter(job => {
    if (searchState.city !== "전체" && job.city !== searchState.city) return false;
    if (searchState.keyword) {
      const haystack = [job.name, job.company, ...job.categoryChildren].join(" ").toLowerCase();
      if (!haystack.includes(searchState.keyword)) return false;
    }
    return true;
  });
  list = filterByCareer(list, searchState.career);
  list = sortJobs(list, searchState.sort);

  document.getElementById("search-count").innerHTML = `조건에 맞는 공고 <b>${list.length}건</b>`;
  renderCardList(document.getElementById("search-cards"), list);
}

// ===== Supabase 로더 (jobs 테이블 → POSTINGS) =====
// 원티드 full_location은 구조화되어 있지 않아, "OO시/도 다음 토큰"을 구/군(시)으로 best-effort 추출한다.
// 예) "서울특별시 서초구 ..." → "서초구", "경기도 성남시 분당구 ..." → "성남시 분당구"
function parseDistrict(fullLocation) {
  if (!fullLocation) return "";
  const tokens = fullLocation.trim().split(/\s+/);
  if (tokens.length < 2) return "";
  if (/시$/.test(tokens[1]) && tokens[2] && /[구군]$/.test(tokens[2])) {
    return `${tokens[1]} ${tokens[2]}`;
  }
  if (/[구군시]$/.test(tokens[1])) return tokens[1];
  return "";
}

function mapSupabaseRow(row) {
  return {
    id: row.id,
    name: row.name,
    company: row.company_name,
    logoUrl: row.logo_url,
    city: row.location || "기타",
    district: parseDistrict(row.full_location),
    fullLocation: row.full_location || "",
    subcategory: mapToSubcategoryGroup(row.category_children && row.category_children[0]),
    categoryChildren: row.category_children || [],
    careerLevel: parseCareerLevel(row.name),
    employmentType: row.employment_type,
    dueTime: row.due_time,
    rewardTotal: row.reward_total,
    url: row.url,
  };
}

async function loadJobs() {
  const rows = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabaseClient
      .from("jobs")
      .select("*")
      .eq("status", "active")
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data.length) break;
    rows.push(...data);
    if (data.length < pageSize) break;
  }

  return rows.map(mapSupabaseRow);
}

// ===== 초기화: 공고 로드 후 검색 탭 + 로그인 상태 렌더 =====
// 페이지별 스크립트(app.js 등)는 "postings:loaded" / "postings:error" 이벤트로 이어받는다.
async function initTopbar() {
  renderAuthTab();

  try {
    POSTINGS = await loadJobs();
  } catch (err) {
    console.error(err);
    document.getElementById("search-count").innerHTML = `<span style="color:#e5484d">공고를 불러오지 못했습니다.</span>`;
    document.dispatchEvent(new CustomEvent("postings:error", { detail: { error: err } }));
    return;
  }

  SUBCATEGORIES = ["전체", ...new Set(POSTINGS.map(j => j.subcategory))];
  CITY_OPTIONS = ["전체", ...new Set(POSTINGS.map(j => j.city))];

  renderSearchTab();
  document.dispatchEvent(new CustomEvent("postings:loaded", { detail: { postings: POSTINGS } }));
}

initTopbar();
