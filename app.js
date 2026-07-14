// ===== GNB 전환 (채용 / 이력서 / 고용 이벤트 / 커뮤니티) =====
const gnbButtons = document.querySelectorAll(".gnb-btn");
const gnbPanels = document.querySelectorAll(".gnb-panel");

gnbButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    gnbButtons.forEach(b => b.classList.remove("active"));
    gnbPanels.forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`gnb-${btn.dataset.gnb}`).classList.add("active");

    // 채용 탭으로 돌아왔을 때 지도가 보이는 상태라면 크기 재계산
    if (btn.dataset.gnb === "job" && mapInitialized && document.getElementById("tab-region").classList.contains("active")) {
      setTimeout(() => map.invalidateSize(), 0);
    }
  });
});

// ===== 탭 전환 (채용 내부: 직업 / 지역별) =====
const tabButtons = document.querySelectorAll(".tab-btn");
const tabPanels = document.querySelectorAll(".tab-panel");

tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    tabButtons.forEach(b => b.classList.remove("active"));
    tabPanels.forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add("active");

    // 지역별 탭을 처음 열 때 지도 렌더 (숨겨진 상태에서 초기화하면 크기가 깨지므로 보일 때 초기화)
    if (btn.dataset.tab === "region" && !mapInitialized) {
      initMap();
    } else if (btn.dataset.tab === "region" && mapInitialized) {
      setTimeout(() => map.invalidateSize(), 0);
    }
  });
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
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && searchDrawer.classList.contains("open")) closeSearchDrawer();
});

// ===== 공통: 카드 렌더 =====
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
    <div class="logo">${job.company ? job.company.charAt(0) : "🏢"}</div>
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
      <div class="overlay-detail"><span class="label">마감일</span><span class="value">${formatDueDate(job)}</span></div>
      <div class="overlay-detail"><span class="label">근무지역</span><span class="value">${job.city} ${job.district}</span></div>
      <div class="overlay-detail"><span class="label">직무 태그</span><span class="value">${job.categoryChildren.join(", ")}</span></div>
    </div>
  `;
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

// ===== ① 직업 탭 =====
let jobState = { subcategory: "전체", sort: "latest" };

function renderJobTab() {
  const pillWrap = document.getElementById("job-subcategory-pills");
  pillWrap.innerHTML = "";
  SUBCATEGORIES.forEach(sub => {
    const btn = document.createElement("button");
    btn.className = "pill" + (sub === jobState.subcategory ? " active" : "");
    btn.textContent = sub;
    btn.addEventListener("click", () => {
      jobState.subcategory = sub;
      renderJobTab();
    });
    pillWrap.appendChild(btn);
  });

  fillSelect("job-sort", SORT_OPTIONS, "value", "label");
  document.getElementById("job-sort").value = jobState.sort;
  document.getElementById("job-sort").onchange = (e) => {
    jobState.sort = e.target.value;
    renderJobTab();
  };

  const sectionsWrap = document.getElementById("job-sections");
  const gridWrap = document.getElementById("job-cards");

  if (jobState.subcategory === "전체") {
    document.getElementById("job-count").innerHTML = `총 <b>${POSTINGS.length}건</b>`;
    gridWrap.style.display = "none";
    gridWrap.innerHTML = "";
    sectionsWrap.style.display = "block";
    renderJobSections(sectionsWrap);
  } else {
    const list = sortJobs(POSTINGS.filter(j => j.subcategory === jobState.subcategory), jobState.sort);
    document.getElementById("job-count").innerHTML = `총 <b>${list.length}건</b>`;
    sectionsWrap.style.display = "none";
    sectionsWrap.innerHTML = "";
    gridWrap.style.display = "grid";
    renderCardList(gridWrap, list);
  }
}

// 직무별로 이어지는 섹션(가로 스크롤 행) 뷰 — 전체 선택 시 기본 노출
function renderJobSections(wrap) {
  wrap.innerHTML = "";
  SUBCATEGORIES.filter(sub => sub !== "전체").forEach(sub => {
    const list = sortJobs(POSTINGS.filter(j => j.subcategory === sub), jobState.sort);
    if (list.length === 0) return;

    const section = document.createElement("div");
    section.className = "job-section";
    section.innerHTML = `
      <div class="job-section-head">
        <span class="job-section-title">${sub}<span class="cnt">${list.length}건</span></span>
      </div>
      <div class="job-section-row"></div>
    `;
    const row = section.querySelector(".job-section-row");
    list.forEach(job => row.appendChild(renderJobCard(job)));
    wrap.appendChild(section);
  });
}

// ===== ② 써치 탭 =====
let searchState = { keyword: "", city: "전체", sort: "latest" };

function renderSearchTab() {
  fillSelect("f-city", CITY_OPTIONS);
  fillSelect("search-sort", SORT_OPTIONS, "value", "label");

  document.getElementById("f-city").value = searchState.city;
  document.getElementById("search-sort").value = searchState.sort;

  document.getElementById("search-input").oninput = (e) => {
    searchState.keyword = e.target.value.trim().toLowerCase();
    applySearchFilter();
  };
  document.getElementById("f-city").onchange = (e) => { searchState.city = e.target.value; applySearchFilter(); };
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
  list = sortJobs(list, searchState.sort);

  document.getElementById("search-count").innerHTML = `조건에 맞는 공고 <b>${list.length}건</b>`;
  renderCardList(document.getElementById("search-cards"), list);
}

// ===== ③ 지역별 탭 (지도) =====
let map, mapInitialized = false;
let regionState = { city: null, district: null, sort: "latest" };

function countByCity(list) {
  const map = {};
  list.forEach(j => { map[j.city] = (map[j.city] || 0) + 1; });
  return map;
}

function initMap() {
  map = L.map("map", { scrollWheelZoom: false }).setView([36.3, 127.8], 6.7);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 18,
  }).addTo(map);

  const counts = countByCity(POSTINGS);
  const maxCount = Math.max(...Object.values(counts));

  Object.entries(CITY_COORDS).forEach(([city, coord]) => {
    const cnt = counts[city] || 0;
    if (cnt === 0) return;
    const radius = 14 + (cnt / maxCount) * 26;

    const marker = L.circleMarker(coord, {
      radius,
      color: "#2f6feb",
      weight: 1,
      fillColor: "#2f6feb",
      fillOpacity: 0.45,
    })
      .addTo(map)
      .bindTooltip(`${city} ${cnt}건`, { permanent: false });

    marker.on("click", () => selectCity(city));
  });

  mapInitialized = true;

  const legend = document.getElementById("region-legend");
  legend.innerHTML = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([city, cnt]) => `<span class="legend-item" data-city="${city}"><span class="dot"></span>${city} ${cnt}건</span>`)
    .join("");
  legend.querySelectorAll(".legend-item").forEach(el => {
    el.style.cursor = "pointer";
    el.addEventListener("click", () => selectCity(el.dataset.city));
  });
}

function selectCity(city) {
  regionState.city = city;
  regionState.district = null;
  renderDistrictPills();
  renderRegionCards();
}

function renderDistrictPills() {
  const wrap = document.getElementById("district-pills");
  if (!regionState.city) {
    wrap.style.display = "none";
    return;
  }
  wrap.style.display = "flex";

  const cityJobs = POSTINGS.filter(j => j.city === regionState.city);
  const districts = [...new Set(cityJobs.map(j => j.district))];

  wrap.innerHTML = "";
  const allBtn = document.createElement("button");
  allBtn.className = "pill" + (regionState.district === null ? " active" : "");
  allBtn.textContent = `${regionState.city} 전체`;
  allBtn.addEventListener("click", () => { regionState.district = null; renderDistrictPills(); renderRegionCards(); });
  wrap.appendChild(allBtn);

  districts.forEach(d => {
    const cnt = cityJobs.filter(j => j.district === d).length;
    const btn = document.createElement("button");
    btn.className = "pill" + (regionState.district === d ? " active" : "");
    btn.textContent = `${d} (${cnt})`;
    btn.addEventListener("click", () => { regionState.district = d; renderDistrictPills(); renderRegionCards(); });
    wrap.appendChild(btn);
  });
}

function renderRegionCards() {
  const toolbar = document.getElementById("region-toolbar");
  if (!regionState.city) {
    toolbar.style.display = "none";
    document.getElementById("region-cards").innerHTML = "";
    return;
  }
  toolbar.style.display = "flex";

  fillSelect("region-sort", SORT_OPTIONS, "value", "label");
  document.getElementById("region-sort").value = regionState.sort;
  document.getElementById("region-sort").onchange = (e) => {
    regionState.sort = e.target.value;
    renderRegionCards();
  };

  let list = POSTINGS.filter(j => j.city === regionState.city);
  if (regionState.district) list = list.filter(j => j.district === regionState.district);
  list = sortJobs(list, regionState.sort);

  document.getElementById("region-count").innerHTML = `총 <b>${list.length}건</b>`;
  renderCardList(document.getElementById("region-cards"), list);
}

// ===== ④ 이력서 탭 =====
function renderResumeTab() {
  document.getElementById("resume-name").textContent = RESUME_PROFILE.name;
  document.getElementById("resume-headline").textContent = RESUME_PROFILE.title;
  document.getElementById("resume-progress-fill").style.width = `${RESUME_PROFILE.completeness}%`;
  document.getElementById("resume-progress-label").textContent = `이력서 완성도 ${RESUME_PROFILE.completeness}%`;

  document.getElementById("application-count").innerHTML = `지원 내역 <b>${APPLICATIONS.length}건</b>`;

  const wrap = document.getElementById("application-cards");
  wrap.innerHTML = "";
  APPLICATIONS.forEach(app => {
    const div = document.createElement("div");
    div.className = "job-card";
    div.innerHTML = `
      <p class="name">${app.jobTitle}</p>
      <p class="company">${app.company}</p>
      <div class="meta-row">
        <span class="status-tag status-${statusClass(app.status)}">${app.status}</span>
        <span class="applicants">${app.appliedDaysAgo === 0 ? "오늘 지원" : `${app.appliedDaysAgo}일 전 지원`}</span>
      </div>
    `;
    wrap.appendChild(div);
  });
}

// ===== ⑤ 고용 이벤트 탭 =====
function renderEventTab() {
  document.getElementById("event-count").innerHTML = `예정된 이벤트 <b>${EVENTS.length}건</b>`;

  const wrap = document.getElementById("event-cards");
  wrap.innerHTML = "";
  EVENTS.forEach(ev => {
    const div = document.createElement("div");
    div.className = "job-card";
    div.innerHTML = `
      <div class="event-card-head">
        <span class="tag">${ev.tag}</span>
        <span class="dday-badge">${ev.dday === 0 ? "오늘" : `D-${ev.dday}`}</span>
      </div>
      <p class="name">${ev.title}</p>
      <p class="company">${ev.host}</p>
      <div class="address">📍 ${ev.location}</div>
      <div class="meta-row">
        <span class="salary">${ev.date}</span>
      </div>
    `;
    wrap.appendChild(div);
  });
}

// ===== ⑥ 커뮤니티 탭 =====
let communityState = { category: "전체" };

function renderCommunityTab() {
  const pillWrap = document.getElementById("community-category-pills");
  pillWrap.innerHTML = "";
  COMMUNITY_CATEGORIES.forEach(cat => {
    const btn = document.createElement("button");
    btn.className = "pill" + (cat === communityState.category ? " active" : "");
    btn.textContent = cat;
    btn.addEventListener("click", () => {
      communityState.category = cat;
      renderCommunityTab();
    });
    pillWrap.appendChild(btn);
  });

  const list = communityState.category === "전체"
    ? COMMUNITY_POSTS
    : COMMUNITY_POSTS.filter(p => p.category === communityState.category);

  const listWrap = document.getElementById("community-list");
  listWrap.innerHTML = "";
  if (list.length === 0) {
    listWrap.innerHTML = `<div class="empty-state">게시글이 없습니다.</div>`;
    return;
  }
  list.forEach(post => {
    const row = document.createElement("div");
    row.className = "community-row";
    row.innerHTML = `
      <div class="community-row-main">
        <span class="community-category">${post.category}</span>
        <span class="community-title">${post.title}</span>
        <span class="community-sub">${post.author} · ${post.createdDaysAgo === 0 ? "오늘" : `${post.createdDaysAgo}일 전`}</span>
      </div>
      <div class="community-stats">
        <span>👍 ${post.likes}</span>
        <span>💬 ${post.comments}</span>
      </div>
    `;
    listWrap.appendChild(row);
  });
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
    city: row.location || "기타",
    district: parseDistrict(row.full_location),
    subcategory: (row.category_children && row.category_children[0]) || "기타",
    categoryChildren: row.category_children || [],
    employmentType: row.employment_type,
    dueTime: row.due_time,
    rewardTotal: row.reward_total,
    url: row.url,
  };
}

async function loadJobs() {
  const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const rows = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await client
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

// ===== 초기 렌더 =====
async function init() {
  try {
    POSTINGS = await loadJobs();
  } catch (err) {
    const message = `
      <div class="empty-state">
        채용 공고를 불러오지 못했습니다. (${err.message})
      </div>`;
    document.getElementById("job-cards").innerHTML = message;
    console.error(err);
    return;
  }

  SUBCATEGORIES = ["전체", ...new Set(POSTINGS.map(j => j.subcategory))];
  CITY_OPTIONS = ["전체", ...new Set(POSTINGS.map(j => j.city))];

  renderJobTab();
  renderSearchTab();
  renderResumeTab();
  renderEventTab();
  renderCommunityTab();
}

init();
