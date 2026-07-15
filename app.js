// supabaseClient / currentUser는 topbar.js에서 선언 (모든 페이지 공용 로그인 상태)

// ===== GNB 전환 (채용 / 이력서) =====
const gnbButtons = document.querySelectorAll(".gnb-btn[data-gnb]");
const gnbPanels = document.querySelectorAll(".gnb-panel");

function activateGnb(gnbKey) {
  const targetBtn = [...gnbButtons].find(b => b.dataset.gnb === gnbKey);
  const targetPanel = document.getElementById(`gnb-${gnbKey}`);
  if (!targetBtn || !targetPanel) return;

  gnbButtons.forEach(b => b.classList.remove("active"));
  gnbPanels.forEach(p => p.classList.remove("active"));
  targetBtn.classList.add("active");
  targetPanel.classList.add("active");

  // 채용 탭으로 돌아왔을 때 지도가 보이는 상태라면 크기 재계산
  if (gnbKey === "job" && mapInitialized && document.getElementById("tab-region").classList.contains("active")) {
    setTimeout(() => map.invalidateSize(), 0);
  }
}

gnbButtons.forEach(btn => {
  btn.addEventListener("click", () => activateGnb(btn.dataset.gnb));
});

// interview-questions.html의 "이력서" 링크(index.html#resume)처럼, 다른 페이지에서 특정 탭으로 바로 진입할 수 있게 처리
if (location.hash === "#resume") activateGnb("resume");

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

// ===== ① 직업 탭 =====
let jobState = { subcategory: "전체", sort: "latest", career: "경력 전체" };

function renderJobTab() {
  const pillWrap = document.getElementById("job-subcategory-pills");
  pillWrap.innerHTML = "";
  SUBCATEGORIES.forEach(sub => {
    const wrap = document.createElement("div");
    wrap.className = "pill-wrap";

    const btn = document.createElement("button");
    btn.className = "pill" + (sub === jobState.subcategory ? " active" : "");
    btn.textContent = sub;
    btn.addEventListener("click", () => {
      jobState.subcategory = sub;
      renderJobTab();
    });
    wrap.appendChild(btn);

    if (sub !== "전체") {
      const list = sortJobs(filterByCareer(POSTINGS.filter(j => j.subcategory === sub), jobState.career), "latest");
      if (list.length > 0) {
        const preview = document.createElement("div");
        preview.className = "pill-preview";
        const items = list.slice(0, 4).map(job => `
          <div class="pill-preview-item">
            <span class="pill-preview-name">${job.name}</span>
            <span class="pill-preview-company">${job.company}</span>
          </div>
        `).join("");
        const more = list.length > 4 ? `<div class="pill-preview-more">+${list.length - 4}건 더보기</div>` : "";
        preview.innerHTML = `
          <div class="pill-preview-head"><span>${sub}</span><b>${list.length}건</b></div>
          ${items}
          ${more}
        `;
        wrap.appendChild(preview);
      }
    }

    pillWrap.appendChild(wrap);
  });

  fillSelect("job-career", CAREER_LEVEL_OPTIONS);
  document.getElementById("job-career").value = jobState.career;
  document.getElementById("job-career").onchange = (e) => {
    jobState.career = e.target.value;
    renderJobTab();
  };

  fillSelect("job-sort", SORT_OPTIONS, "value", "label");
  document.getElementById("job-sort").value = jobState.sort;
  document.getElementById("job-sort").onchange = (e) => {
    jobState.sort = e.target.value;
    renderJobTab();
  };

  const sectionsWrap = document.getElementById("job-sections");
  const gridWrap = document.getElementById("job-cards");

  if (jobState.subcategory === "전체") {
    const totalFiltered = filterByCareer(POSTINGS, jobState.career).length;
    document.getElementById("job-count").innerHTML = `총 <b>${totalFiltered}건</b>`;
    gridWrap.style.display = "none";
    gridWrap.innerHTML = "";
    sectionsWrap.style.display = "block";
    renderJobSections(sectionsWrap);
  } else {
    const list = sortJobs(filterByCareer(POSTINGS.filter(j => j.subcategory === jobState.subcategory), jobState.career), jobState.sort);
    document.getElementById("job-count").innerHTML = `총 <b>${list.length}건</b>`;
    sectionsWrap.style.display = "none";
    sectionsWrap.innerHTML = "";
    gridWrap.style.display = "grid";
    renderCardList(gridWrap, list);
  }
}

// 직무별로 이어지는 섹션(가로 스크롤 행) 뷰 — 전체 선택 시 기본 노출
const JOB_SECTION_PREVIEW_COUNT = 5;

function renderJobSections(wrap) {
  wrap.innerHTML = "";
  SUBCATEGORIES.filter(sub => sub !== "전체").forEach(sub => {
    const list = sortJobs(filterByCareer(POSTINGS.filter(j => j.subcategory === sub), jobState.career), jobState.sort);
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
    list.slice(0, JOB_SECTION_PREVIEW_COUNT).forEach(job => row.appendChild(renderJobCard(job)));

    const remaining = list.length - JOB_SECTION_PREVIEW_COUNT;
    if (remaining > 0) {
      const moreBtn = document.createElement("button");
      moreBtn.type = "button";
      moreBtn.className = "job-section-more";
      moreBtn.innerHTML = `<span class="job-section-more-arrow">→</span><span>더보기<br>+${remaining}건</span>`;
      moreBtn.addEventListener("click", () => {
        jobState.subcategory = sub;
        renderJobTab();
        document.getElementById("job-subcategory-pills").scrollIntoView({ behavior: "smooth", block: "start" });
      });
      row.appendChild(moreBtn);
    }

    wrap.appendChild(section);
  });
}

// ===== ③ 지역별 탭 (지도) =====
let map, mapInitialized = false;
let regionState = { city: null, district: null, hub: null, sort: "latest", career: "경력 전체" };

function countByCity(list) {
  const map = {};
  list.forEach(j => { map[j.city] = (map[j.city] || 0) + 1; });
  return map;
}

function jobsForHub(hub) {
  return POSTINGS.filter(j => hub.keywords.some(k => j.fullLocation.includes(k)));
}

function initMap() {
  map = L.map("map", { scrollWheelZoom: false }).setView([36.3, 127.8], 6.7);

  // 실사 지형/등고선이 있는 기본 OSM 타일 대신, 눈이 덜 피로한 플랫한 배경 지도 사용
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: "abcd",
    maxZoom: 18,
  }).addTo(map);

  const counts = countByCity(POSTINGS);
  const maxCount = Math.max(...Object.values(counts));

  Object.entries(CITY_COORDS).forEach(([city, coord]) => {
    const cnt = counts[city] || 0;
    if (cnt === 0) return;
    const radius = 12 + (cnt / maxCount) * 22;

    const marker = L.circleMarker(coord, {
      radius,
      color: "#8E7BFF",
      weight: 1,
      fillColor: "#6C4DF6",
      fillOpacity: 0.3,
    })
      .addTo(map)
      .bindTooltip(`${city} ${cnt}건`, { permanent: false });

    marker.on("click", () => selectCity(city));
  });

  // 주요 업무 허브(강남·판교 등) 강조 마커 — 지하철역 좌표는 없어 대표 지점으로 근사
  const hubCounts = JOB_HUBS
    .map(hub => ({ ...hub, count: jobsForHub(hub).length }))
    .filter(h => h.count > 0);
  const maxHubCount = Math.max(...hubCounts.map(h => h.count), 1);

  hubCounts.forEach(hub => {
    const radius = 7 + (hub.count / maxHubCount) * 11;

    L.circleMarker(hub.coords, {
      radius: radius + 7,
      stroke: false,
      fillColor: "#4DE3D0",
      fillOpacity: 0.18,
      interactive: false,
    }).addTo(map);

    const hubMarker = L.circleMarker(hub.coords, {
      radius,
      color: "#ffffff",
      weight: 2,
      fillColor: "#4DE3D0",
      fillOpacity: 0.95,
    })
      .addTo(map)
      .bindTooltip(`⭐ ${hub.name} ${hub.count}건`, { permanent: false });

    hubMarker.on("click", () => selectHub(hub));
  });

  mapInitialized = true;

  const hubLegend = document.getElementById("hub-legend");
  hubLegend.innerHTML = hubCounts
    .sort((a, b) => b.count - a.count)
    .map((hub, i) => `<span class="legend-item hub-legend-item" data-hub-index="${i}"><span class="dot hub-dot"></span>${hub.name} ${hub.count}건</span>`)
    .join("");
  hubLegend.querySelectorAll(".legend-item").forEach(el => {
    el.style.cursor = "pointer";
    el.addEventListener("click", () => selectHub(hubCounts[Number(el.dataset.hubIndex)]));
  });

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
  regionState.hub = null;
  renderDistrictPills();
  renderRegionCards();
}

function selectHub(hub) {
  regionState.hub = hub;
  regionState.city = null;
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
  if (!regionState.city && !regionState.hub) {
    toolbar.style.display = "none";
    document.getElementById("region-cards").innerHTML = "";
    return;
  }
  toolbar.style.display = "flex";

  fillSelect("region-career", CAREER_LEVEL_OPTIONS);
  document.getElementById("region-career").value = regionState.career;
  document.getElementById("region-career").onchange = (e) => {
    regionState.career = e.target.value;
    renderRegionCards();
  };

  fillSelect("region-sort", SORT_OPTIONS, "value", "label");
  document.getElementById("region-sort").value = regionState.sort;
  document.getElementById("region-sort").onchange = (e) => {
    regionState.sort = e.target.value;
    renderRegionCards();
  };

  let list;
  if (regionState.hub) {
    list = jobsForHub(regionState.hub);
  } else {
    list = POSTINGS.filter(j => j.city === regionState.city);
    if (regionState.district) list = list.filter(j => j.district === regionState.district);
  }
  list = filterByCareer(list, regionState.career);
  list = sortJobs(list, regionState.sort);

  const label = regionState.hub ? `⭐ ${regionState.hub.name}` : "";
  document.getElementById("region-count").innerHTML = `${label} 총 <b>${list.length}건</b>`;
  renderCardList(document.getElementById("region-cards"), list);
}

// ===== ④ 이력서 탭 (Supabase Auth 로그인 + 이력서/지원내역 CRUD) =====
// 원티드 API에는 개인 지원 내역이 없어 사용자가 직접 기록하는 트래커로 대체했다.
// currentUser / renderAuthTab / authMessage는 topbar.js에서 관리 (모든 페이지 공용 로그인 상태).

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
    renderResumeTab();
  });
}

// ===== 초기 렌더 =====
// 공고 데이터(POSTINGS)는 topbar.js가 로드해서 "postings:loaded"/"postings:error" 이벤트로 알려준다.
document.addEventListener("postings:loaded", renderJobTab);
document.addEventListener("postings:error", (e) => {
  document.getElementById("job-cards").innerHTML = `
    <div class="empty-state">
      채용 공고를 불러오지 못했습니다. (${e.detail.error.message})
    </div>`;
});

initResumeTab();
