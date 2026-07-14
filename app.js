// Supabase 클라이언트는 앱 전체에서 하나만 공유 (채용공고 조회 + 이력서 탭 로그인/CRUD)
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
  if (e.key === "Escape" && authDrawer.classList.contains("open")) closeAuthDrawer();
});

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

// ===== ④ 이력서 탭 (Supabase Auth 로그인 + 이력서/지원내역 CRUD) =====
// 원티드 API에는 개인 지원 내역이 없어 사용자가 직접 기록하는 트래커로 대체했다.
let currentUser = null;

function authMessage(text, isError) {
  const el = document.getElementById("auth-message");
  el.textContent = text;
  el.style.color = isError ? "#e5484d" : "";
}

let latestEducation = [];
let latestExperience = [];
let latestProjects = [];

function computeCompleteness(resume) {
  const fields = [
    resume?.name,
    resume?.headline,
    resume?.bio,
    resume?.phone,
    resume?.career_type,
    resume?.skills?.length ? "y" : "",
    resume?.github_url || resume?.notion_url || resume?.portfolio_url,
    latestEducation.length ? "y" : "",
  ];
  const filled = fields.filter(v => v && String(v).trim()).length;
  return Math.round((filled / fields.length) * 100);
}

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

async function renderResumeTab() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  currentUser = session?.user ?? null;

  const locked = document.getElementById("resume-locked");
  const content = document.getElementById("resume-content");

  if (!currentUser) {
    locked.style.display = "block";
    content.style.display = "none";
    return;
  }

  locked.style.display = "none";
  content.style.display = "block";

  const { data: resume } = await supabaseClient
    .from("resumes")
    .select("*")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  document.getElementById("resume-name-input").value = resume?.name || "";
  document.getElementById("resume-headline-input").value = resume?.headline || "";
  document.getElementById("resume-phone-input").value = resume?.phone || "";
  document.getElementById("resume-career-type-input").value = resume?.career_type || "";
  document.getElementById("resume-career-years-input").value = resume?.career_years ?? "";
  document.getElementById("resume-bio-input").value = resume?.bio || "";
  document.getElementById("resume-skills-input").value = (resume?.skills || []).join(", ");
  document.getElementById("resume-github-input").value = resume?.github_url || "";
  document.getElementById("resume-notion-input").value = resume?.notion_url || "";
  document.getElementById("resume-portfolio-input").value = resume?.portfolio_url || "";

  await renderEducation();
  await renderExperience();
  await renderProjects();
  await renderApplications();

  const completeness = computeCompleteness(resume);
  document.getElementById("resume-progress-fill").style.width = `${completeness}%`;
  document.getElementById("resume-progress-label").textContent = `이력서 완성도 ${completeness}%`;

  renderPrintView(resume);
}

async function renderEducation() {
  const { data, error } = await supabaseClient
    .from("resume_education")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) { console.error(error); return; }
  latestEducation = data;

  document.getElementById("education-count").innerHTML = `학력 <b>${data.length}건</b>`;

  const wrap = document.getElementById("education-cards");
  wrap.innerHTML = "";
  if (data.length === 0) {
    wrap.innerHTML = `<div class="empty-state">아직 등록한 학력이 없습니다.</div>`;
    return;
  }

  data.forEach(edu => {
    const div = document.createElement("div");
    div.className = "job-card";
    div.innerHTML = `
      <p class="name">${edu.school}</p>
      <p class="company">${[edu.major, edu.degree].filter(Boolean).join(" · ")}</p>
      <div class="meta-row">
        ${edu.status ? `<span class="status-tag status-pending">${edu.status}</span>` : ""}
        ${edu.period ? `<span class="applicants">${edu.period}</span>` : ""}
      </div>
      <button type="button" class="app-delete-btn" aria-label="삭제">✕</button>
    `;
    div.querySelector(".app-delete-btn").addEventListener("click", async (e) => {
      e.stopPropagation();
      await supabaseClient.from("resume_education").delete().eq("id", edu.id);
      await renderEducation();
      renderPrintView();
    });
    wrap.appendChild(div);
  });
}

async function renderExperience() {
  const { data, error } = await supabaseClient
    .from("resume_experience")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) { console.error(error); return; }
  latestExperience = data;

  document.getElementById("experience-count").innerHTML = `경력 <b>${data.length}건</b>`;

  const wrap = document.getElementById("experience-cards");
  wrap.innerHTML = "";
  if (data.length === 0) {
    wrap.innerHTML = `<div class="empty-state">아직 등록한 경력이 없습니다.</div>`;
    return;
  }

  data.forEach(exp => {
    const div = document.createElement("div");
    div.className = "job-card";
    div.innerHTML = `
      <p class="name">${exp.company}</p>
      <p class="company">${[exp.position, exp.period].filter(Boolean).join(" · ")}</p>
      ${exp.description ? `<p class="intro">${exp.description}</p>` : ""}
      <button type="button" class="app-delete-btn" aria-label="삭제">✕</button>
    `;
    div.querySelector(".app-delete-btn").addEventListener("click", async (e) => {
      e.stopPropagation();
      await supabaseClient.from("resume_experience").delete().eq("id", exp.id);
      await renderExperience();
      renderPrintView();
    });
    wrap.appendChild(div);
  });
}

function renderPrintView(resume) {
  document.getElementById("print-name").textContent = document.getElementById("resume-name-input").value || "이름 미입력";
  document.getElementById("print-headline").textContent = document.getElementById("resume-headline-input").value;

  const phone = document.getElementById("resume-phone-input").value;
  const contactParts = [currentUser?.email, phone].filter(Boolean);
  document.getElementById("print-contact").textContent = contactParts.join(" · ");

  document.getElementById("print-bio").textContent = document.getElementById("resume-bio-input").value;
  document.getElementById("print-skills").textContent = document.getElementById("resume-skills-input").value;

  const careerType = document.getElementById("resume-career-type-input").value;
  const careerYears = document.getElementById("resume-career-years-input").value;
  document.getElementById("print-career-summary").textContent = careerType
    ? `${careerType}${careerType === "경력" && careerYears ? ` · ${careerYears}년차` : ""}`
    : "";

  document.getElementById("print-education").innerHTML = latestEducation.map(edu => `
    <div class="print-entry">
      <div class="print-entry-head"><span>${edu.school}</span><span>${edu.period || ""}</span></div>
      <div class="print-entry-sub">${[edu.major, edu.degree, edu.status].filter(Boolean).join(" · ")}</div>
    </div>
  `).join("") || "<p class=\"print-entry-sub\">등록된 학력이 없습니다.</p>";

  document.getElementById("print-experience").innerHTML = latestExperience.map(exp => `
    <div class="print-entry">
      <div class="print-entry-head"><span>${exp.company}</span><span>${exp.period || ""}</span></div>
      <div class="print-entry-sub">${exp.position || ""}</div>
      ${exp.description ? `<div class="print-entry-desc">${exp.description}</div>` : ""}
    </div>
  `).join("") || "";

  document.getElementById("print-projects").innerHTML = latestProjects.map(proj => `
    <div class="print-entry">
      <div class="print-entry-head"><span>${proj.title}</span><span>${proj.period || ""}</span></div>
      ${proj.description ? `<div class="print-entry-desc">${proj.description}</div>` : ""}
      ${(proj.tech_stack || []).length ? `<div class="print-tags">${proj.tech_stack.join(", ")}</div>` : ""}
    </div>
  `).join("") || "<p class=\"print-entry-sub\">등록된 프로젝트가 없습니다.</p>";
}

async function renderProjects() {
  const { data: projects, error } = await supabaseClient
    .from("resume_projects")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) { console.error(error); return; }
  latestProjects = projects;

  document.getElementById("project-count").innerHTML = `프로젝트 <b>${projects.length}건</b>`;

  const wrap = document.getElementById("project-cards");
  wrap.innerHTML = "";
  if (projects.length === 0) {
    wrap.innerHTML = `<div class="empty-state">아직 등록한 프로젝트가 없습니다.</div>`;
    return;
  }

  projects.forEach(proj => {
    const div = document.createElement("div");
    div.className = "job-card";
    div.innerHTML = `
      <p class="name">${proj.title}</p>
      ${proj.period ? `<p class="company">${proj.period}</p>` : ""}
      ${proj.description ? `<p class="intro">${proj.description}</p>` : ""}
      <div class="tags">
        ${(proj.tech_stack || []).map(t => `<span class="tag">${t}</span>`).join("")}
      </div>
      ${proj.project_url ? `<a class="project-link" href="${proj.project_url}" target="_blank" rel="noopener">링크 보기 ↗</a>` : ""}
      <button type="button" class="app-delete-btn" aria-label="삭제">✕</button>
    `;
    div.querySelector(".app-delete-btn").addEventListener("click", async (e) => {
      e.stopPropagation();
      await supabaseClient.from("resume_projects").delete().eq("id", proj.id);
      await renderProjects();
      renderPrintView();
    });
    wrap.appendChild(div);
  });
}

async function renderApplications() {
  const { data: applications, error } = await supabaseClient
    .from("applications")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) { console.error(error); return; }

  document.getElementById("application-count").innerHTML = `지원 내역 <b>${applications.length}건</b>`;

  const wrap = document.getElementById("application-cards");
  wrap.innerHTML = "";
  if (applications.length === 0) {
    wrap.innerHTML = `<div class="empty-state">아직 기록한 지원 내역이 없습니다.</div>`;
    return;
  }

  applications.forEach(app => {
    const daysAgo = Math.floor((Date.now() - new Date(app.applied_date)) / 86400000);
    const div = document.createElement("div");
    div.className = "job-card";
    div.innerHTML = `
      <p class="name">${app.job_title}</p>
      <p class="company">${app.company}</p>
      <div class="meta-row">
        <span class="status-tag status-${statusClass(app.status)}">${app.status}</span>
        <span class="applicants">${daysAgo <= 0 ? "오늘 지원" : `${daysAgo}일 전 지원`}</span>
      </div>
      <button type="button" class="app-delete-btn" aria-label="삭제">✕</button>
    `;
    div.querySelector(".app-delete-btn").addEventListener("click", async (e) => {
      e.stopPropagation();
      await supabaseClient.from("applications").delete().eq("id", app.id);
      renderApplications();
    });
    wrap.appendChild(div);
  });
}

function initResumeTab() {
  fillSelect("app-status-input", APPLICATION_STATUS_OPTIONS);

  document.getElementById("resume-goto-login-btn").addEventListener("click", openAuthDrawer);

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

  document.getElementById("resume-save-btn").addEventListener("click", async () => {
    if (!currentUser) return;
    const name = document.getElementById("resume-name-input").value.trim();
    const headline = document.getElementById("resume-headline-input").value.trim();
    const phone = document.getElementById("resume-phone-input").value.trim();
    const career_type = document.getElementById("resume-career-type-input").value || null;
    const careerYearsRaw = document.getElementById("resume-career-years-input").value;
    const career_years = careerYearsRaw ? Number(careerYearsRaw) : null;
    const bio = document.getElementById("resume-bio-input").value.trim();
    const skills = document.getElementById("resume-skills-input").value
      .split(",").map(s => s.trim()).filter(Boolean);
    const github_url = document.getElementById("resume-github-input").value.trim();
    const notion_url = document.getElementById("resume-notion-input").value.trim();
    const portfolio_url = document.getElementById("resume-portfolio-input").value.trim();
    const { error } = await supabaseClient
      .from("resumes")
      .upsert({
        user_id: currentUser.id, name, headline, phone, career_type, career_years, bio, skills,
        github_url, notion_url, portfolio_url,
        updated_at: new Date().toISOString(),
      });
    if (error) { alert("저장 실패: " + error.message); return; }
    renderResumeTab();
  });

  document.getElementById("edu-add-btn").addEventListener("click", async () => {
    if (!currentUser) return;
    const school = document.getElementById("edu-school-input").value.trim();
    const major = document.getElementById("edu-major-input").value.trim();
    const degree = document.getElementById("edu-degree-input").value;
    const status = document.getElementById("edu-status-input").value;
    const period = document.getElementById("edu-period-input").value.trim();
    if (!school) return;
    const { error } = await supabaseClient.from("resume_education").insert({
      user_id: currentUser.id, school, major, degree, status, period,
    });
    if (error) { alert("추가 실패: " + error.message); return; }
    document.getElementById("edu-school-input").value = "";
    document.getElementById("edu-major-input").value = "";
    document.getElementById("edu-degree-input").value = "";
    document.getElementById("edu-status-input").value = "";
    document.getElementById("edu-period-input").value = "";
    await renderEducation();
    renderPrintView();
  });

  document.getElementById("exp-add-btn").addEventListener("click", async () => {
    if (!currentUser) return;
    const company = document.getElementById("exp-company-input").value.trim();
    const position = document.getElementById("exp-position-input").value.trim();
    const period = document.getElementById("exp-period-input").value.trim();
    const description = document.getElementById("exp-desc-input").value.trim();
    if (!company) return;
    const { error } = await supabaseClient.from("resume_experience").insert({
      user_id: currentUser.id, company, position, period, description,
    });
    if (error) { alert("추가 실패: " + error.message); return; }
    document.getElementById("exp-company-input").value = "";
    document.getElementById("exp-position-input").value = "";
    document.getElementById("exp-period-input").value = "";
    document.getElementById("exp-desc-input").value = "";
    await renderExperience();
    renderPrintView();
  });

  document.getElementById("resume-print-btn").addEventListener("click", () => window.print());

  document.getElementById("proj-add-btn").addEventListener("click", async () => {
    if (!currentUser) return;
    const title = document.getElementById("proj-title-input").value.trim();
    const period = document.getElementById("proj-period-input").value.trim();
    const techStack = document.getElementById("proj-tech-input").value
      .split(",").map(s => s.trim()).filter(Boolean);
    const projectUrl = document.getElementById("proj-url-input").value.trim();
    const description = document.getElementById("proj-desc-input").value.trim();
    if (!title) return;
    const { error } = await supabaseClient.from("resume_projects").insert({
      user_id: currentUser.id,
      title,
      period,
      tech_stack: techStack,
      project_url: projectUrl || null,
      description,
    });
    if (error) { alert("추가 실패: " + error.message); return; }
    document.getElementById("proj-title-input").value = "";
    document.getElementById("proj-period-input").value = "";
    document.getElementById("proj-tech-input").value = "";
    document.getElementById("proj-url-input").value = "";
    document.getElementById("proj-desc-input").value = "";
    renderProjects();
  });

  document.getElementById("app-add-btn").addEventListener("click", async () => {
    if (!currentUser) return;
    const company = document.getElementById("app-company-input").value.trim();
    const jobTitle = document.getElementById("app-title-input").value.trim();
    const status = document.getElementById("app-status-input").value;
    if (!company || !jobTitle) return;
    const { error } = await supabaseClient
      .from("applications")
      .insert({ user_id: currentUser.id, company, job_title: jobTitle, status });
    if (error) { alert("추가 실패: " + error.message); return; }
    document.getElementById("app-company-input").value = "";
    document.getElementById("app-title-input").value = "";
    renderApplications();
  });

  supabaseClient.auth.onAuthStateChange(() => {
    renderAuthTab();
    renderResumeTab();
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
    logoUrl: row.logo_url,
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
  initResumeTab();
  renderEventTab();
  renderCommunityTab();
}

init();
