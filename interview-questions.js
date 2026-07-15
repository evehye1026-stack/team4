// PRD-interview-questions.md P0(질문 노출) + P1(연습 모드, 폴백) 구현.
// 질문 데이터는 Supabase interview_questions 테이블에서 읽어온다.
// 스크랩/메모(P2)는 로그인 연동 전이라 localStorage에만 저장되는 로컬 전용 데모다.

// 면접질문 데이터는 메인 사이트와 다른 Supabase 프로젝트에 있어 별도 클라이언트를 쓴다.
// (로그인/검색용 supabaseClient는 topbar.js가 선언)
const interviewSupabaseClient = window.supabase.createClient(INTERVIEW_SUPABASE_URL, INTERVIEW_SUPABASE_ANON_KEY);

const BOOKMARK_KEY = "iq_bookmarks_v1";
const NOTE_KEY = "iq_notes_v1";

const state = {
  jobId: null,
  activeType: "전체",
  bookmarks: loadSet(BOOKMARK_KEY),
  notes: loadObject(NOTE_KEY),
  currentSet: null, // { category, questions, isFallback } — 현재 선택된 공고에 대해 로드된 질문 세트
  loading: false,
  practice: { active: false, deck: [], index: 0, revealed: false },
};

const questionCache = new Map(); // category(문자열) -> {questions, isFallback}

function loadSet(key) {
  try { return new Set(JSON.parse(localStorage.getItem(key) || "[]")); }
  catch { return new Set(); }
}
function saveSet(key, set) {
  localStorage.setItem(key, JSON.stringify([...set]));
}
function loadObject(key) {
  try { return JSON.parse(localStorage.getItem(key) || "{}"); }
  catch { return {}; }
}
function saveObject(key, obj) {
  localStorage.setItem(key, JSON.stringify(obj));
}

function getJob(jobId) {
  return MOCK_JOBS.find((j) => j.id === jobId) || MOCK_JOBS[0];
}

// Supabase에서 카테고리별 질문을 읽어온다. 매핑 질문이 없으면 '공통' 세트로 대체(폴백).
async function fetchQuestionsForCategory(category) {
  if (questionCache.has(category)) return questionCache.get(category);

  const { data, error } = await interviewSupabaseClient
    .from("interview_questions")
    .select("id, question_type, question_text, answer_tip")
    .eq("category_children", category);

  if (error) throw error;

  let result;
  if (data && data.length) {
    result = { questions: mapRows(data), isFallback: false };
  } else {
    const fallback = await interviewSupabaseClient
      .from("interview_questions")
      .select("id, question_type, question_text, answer_tip")
      .eq("category_children", "공통");
    if (fallback.error) throw fallback.error;
    result = { questions: mapRows(fallback.data || []), isFallback: true };
  }

  questionCache.set(category, result);
  return result;
}

function mapRows(rows) {
  return rows.map((r) => ({ id: r.id, type: r.question_type, text: r.question_text, tip: r.answer_tip }));
}

// ===== 공고 선택 =====
const jobSelect = document.getElementById("job-select");
MOCK_JOBS.forEach((job) => {
  const opt = document.createElement("option");
  opt.value = job.id;
  opt.textContent = `${job.company} · ${job.name}`;
  jobSelect.appendChild(opt);
});

function initialJobId() {
  const params = new URLSearchParams(location.search);
  const fromUrl = Number(params.get("jobId"));
  if (fromUrl && MOCK_JOBS.some((j) => j.id === fromUrl)) return fromUrl;
  return MOCK_JOBS[0].id;
}

jobSelect.addEventListener("change", () => {
  state.jobId = Number(jobSelect.value);
  const url = new URL(location.href);
  url.searchParams.set("jobId", state.jobId);
  history.replaceState(null, "", url);
  render();
});

// ===== 공고 카드 렌더 =====
function formatDday(dueTime) {
  if (!dueTime) return "상시채용";
  const due = new Date(dueTime + "T23:59:59");
  const diffDays = Math.ceil((due - new Date()) / 86400000);
  if (diffDays < 0) return "마감";
  if (diffDays === 0) return "오늘 마감";
  return `D-${diffDays}`;
}

// topbar.js의 공용 renderJobCard(공고 리스트 카드)와 이름이 겹치지 않도록 구분해서 명명.
function renderJobContextCard(job) {
  const card = document.getElementById("job-card");
  card.innerHTML = `
    <span class="iq-job-logo" aria-hidden="true">${job.logo}</span>
    <div class="iq-job-info">
      <p class="iq-job-name">${job.name}</p>
      <p class="iq-job-meta">${job.company} · ${job.city}${job.district ? " " + job.district : ""}</p>
    </div>
    <span class="iq-job-dday">${formatDday(job.dueTime)}</span>
  `;
}

// ===== 탭 =====
const tabButtons = [...document.querySelectorAll(".iq-tab")];
tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    state.activeType = btn.dataset.type;
    tabButtons.forEach((b) => {
      const isActive = b === btn;
      b.classList.toggle("active", isActive);
      b.setAttribute("aria-selected", String(isActive));
    });
    renderList();
  });
});

// ===== 질문 리스트 =====
const listEl = document.getElementById("iq-list");
const countEl = document.getElementById("iq-count");
const bookmarkCountEl = document.getElementById("iq-bookmark-count");
const fallbackBanner = document.getElementById("fallback-banner");
const categoryLabel = document.getElementById("iq-category-label");
const practiceStartBtn = document.getElementById("practice-start-btn");

function renderList() {
  bookmarkCountEl.textContent = `스크랩 ${state.bookmarks.size}`;

  if (state.loading) {
    countEl.textContent = "";
    listEl.innerHTML = `<li class="iq-empty">질문을 불러오는 중이에요…</li>`;
    return;
  }
  if (!state.currentSet) {
    listEl.innerHTML = `<li class="iq-empty">질문을 불러오지 못했어요. 잠시 후 다시 시도해주세요.</li>`;
    return;
  }

  const { questions, isFallback } = state.currentSet;
  fallbackBanner.hidden = !isFallback;

  const filtered = state.activeType === "전체"
    ? questions
    : questions.filter((q) => q.type === state.activeType);

  countEl.textContent = `${filtered.length}개 질문`;

  listEl.innerHTML = "";
  if (!filtered.length) {
    listEl.innerHTML = `<li class="iq-empty">이 유형에 해당하는 질문이 아직 없어요.</li>`;
    return;
  }

  filtered.forEach((q) => {
    const li = document.createElement("li");
    li.className = "iq-item";
    const tipId = `tip-${q.id}`;
    const bookmarked = state.bookmarks.has(q.id);
    li.innerHTML = `
      <div class="iq-item-row">
        <button class="iq-item-toggle" aria-expanded="false" aria-controls="${tipId}">
          <span class="mono-label iq-item-type">${q.type}</span>
          <span class="iq-item-question">${q.text}</span>
          <span class="iq-item-chevron" aria-hidden="true">⌄</span>
        </button>
        <button class="iq-item-bookmark" aria-pressed="${bookmarked}" aria-label="질문 스크랩">${bookmarked ? "★" : "☆"}</button>
      </div>
      <div class="iq-item-tip" id="${tipId}" hidden>
        <span class="mono-label">답변 팁</span>
        <p>${q.tip}</p>
      </div>
    `;

    const toggleBtn = li.querySelector(".iq-item-toggle");
    const tipEl = li.querySelector(".iq-item-tip");
    toggleBtn.addEventListener("click", () => {
      const expanded = toggleBtn.getAttribute("aria-expanded") === "true";
      toggleBtn.setAttribute("aria-expanded", String(!expanded));
      tipEl.hidden = expanded;
    });

    const bookmarkBtn = li.querySelector(".iq-item-bookmark");
    bookmarkBtn.addEventListener("click", () => toggleBookmark(q.id));

    listEl.appendChild(li);
  });
}

function toggleBookmark(qid) {
  if (state.bookmarks.has(qid)) state.bookmarks.delete(qid);
  else state.bookmarks.add(qid);
  saveSet(BOOKMARK_KEY, state.bookmarks);
  renderList();
  if (state.practice.active) renderFlashcard();
}

// ===== 연습 모드 =====
const backdrop = document.getElementById("practice-backdrop");
const flashcard = document.getElementById("iq-flashcard");
const flashcardType = document.getElementById("flashcard-type");
const flashcardQuestion = document.getElementById("flashcard-question");
const flashcardTip = document.getElementById("flashcard-tip");
const flashcardTipText = document.getElementById("flashcard-tip-text");
const flashcardHint = document.getElementById("flashcard-hint");
const progressEl = document.getElementById("practice-progress");
const noteInput = document.getElementById("practice-note");
const bookmarkBtnPractice = document.getElementById("practice-bookmark-btn");

practiceStartBtn.addEventListener("click", startPractice);
document.getElementById("practice-close-btn").addEventListener("click", closePractice);
document.getElementById("practice-prev-btn").addEventListener("click", () => stepPractice(-1));
document.getElementById("practice-next-btn").addEventListener("click", () => stepPractice(1));
bookmarkBtnPractice.addEventListener("click", () => {
  const q = state.practice.deck[state.practice.index];
  if (q) toggleBookmark(q.id);
  updatePracticeBookmarkBtn();
});

flashcard.addEventListener("click", toggleReveal);
flashcard.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleReveal(); }
});

function startPractice() {
  if (!state.currentSet || !state.currentSet.questions.length) return;
  state.practice = { active: true, deck: state.currentSet.questions, index: 0, revealed: false };
  backdrop.hidden = false;
  document.addEventListener("keydown", handlePracticeKeydown);
  renderFlashcard();
  flashcard.focus();
}

function closePractice() {
  state.practice.active = false;
  backdrop.hidden = true;
  document.removeEventListener("keydown", handlePracticeKeydown);
  practiceStartBtn.focus();
}

function handlePracticeKeydown(e) {
  if (e.key === "Escape") closePractice();
  if (e.key === "ArrowRight") stepPractice(1);
  if (e.key === "ArrowLeft") stepPractice(-1);
}

function stepPractice(delta) {
  const { deck } = state.practice;
  const next = state.practice.index + delta;
  if (next < 0 || next >= deck.length) return;
  state.practice.index = next;
  state.practice.revealed = false;
  renderFlashcard();
}

function toggleReveal() {
  state.practice.revealed = !state.practice.revealed;
  renderFlashcard();
}

function updatePracticeBookmarkBtn() {
  const q = state.practice.deck[state.practice.index];
  const bookmarked = q && state.bookmarks.has(q.id);
  bookmarkBtnPractice.setAttribute("aria-pressed", String(!!bookmarked));
  bookmarkBtnPractice.textContent = bookmarked ? "★ 스크랩됨" : "☆ 스크랩";
}

function renderFlashcard() {
  const { deck, index, revealed } = state.practice;
  const q = deck[index];
  if (!q) return;

  const total = String(deck.length).padStart(2, "0");
  const current = String(index + 1).padStart(2, "0");
  progressEl.textContent = `${current} / ${total}`;

  flashcardType.textContent = q.type;
  flashcardQuestion.textContent = q.text;
  flashcardTipText.textContent = q.tip;
  flashcardTip.hidden = !revealed;
  flashcardHint.hidden = revealed;
  flashcard.setAttribute("aria-pressed", String(revealed));

  noteInput.value = state.notes[q.id] || "";

  document.getElementById("practice-prev-btn").disabled = index === 0;
  document.getElementById("practice-next-btn").disabled = index === deck.length - 1;

  updatePracticeBookmarkBtn();
}

noteInput.addEventListener("input", () => {
  const q = state.practice.deck[state.practice.index];
  if (!q) return;
  state.notes[q.id] = noteInput.value;
  saveObject(NOTE_KEY, state.notes);
});

// ===== 초기화 =====
async function render() {
  const job = getJob(state.jobId);
  jobSelect.value = job.id;
  renderJobContextCard(job);
  categoryLabel.textContent = job.categoryChildren[0];
  tabButtons.forEach((b, i) => {
    const isActive = i === 0;
    b.classList.toggle("active", isActive);
    b.setAttribute("aria-selected", String(isActive));
  });
  state.activeType = "전체";

  state.loading = true;
  state.currentSet = null;
  practiceStartBtn.disabled = true;
  renderList();

  try {
    state.currentSet = await fetchQuestionsForCategory(job.categoryChildren[0]);
  } catch (err) {
    console.error("[interview-questions] 질문 로드 실패:", err);
    state.currentSet = null;
  } finally {
    state.loading = false;
    practiceStartBtn.disabled = false;
    renderList();
  }
}

state.jobId = initialJobId();
render();
