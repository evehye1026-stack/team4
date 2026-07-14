// 채용 공고 데이터는 Supabase jobs 테이블에서 실시간으로 읽어온다 (app.js의 loadJobs() 참고).
// POSTINGS / SUBCATEGORIES / CITY_OPTIONS 는 Supabase 조회 후 app.js에서 채워진다.
// 원티드 실제 API에는 급여/지원자수/인기점수/학력/직급/근무일수/기술스택 정보가 없어 목업과 달리 다루지 않는다.
let POSTINGS = [];
let SUBCATEGORIES = ["전체"];
let CITY_OPTIONS = ["전체"];

const SUPABASE_URL = "https://blpilnfdxtdfigmqhyaz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJscGlsbmZkeHRkZmlnbXFoeWF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5OTQwNzgsImV4cCI6MjA5OTU3MDA3OH0.DV1If__V6Sd1YTeY-Rg7Nm54-o13LItM8JB9NONNopw";

// 원티드 location 필드에 나오는 시/도 단위 좌표 (지역별 탭의 지도 마커용)
const CITY_COORDS = {
  "서울": [37.5665, 126.9780],
  "부산": [35.1796, 129.0756],
  "대구": [35.8714, 128.6014],
  "인천": [37.4563, 126.7052],
  "광주": [35.1595, 126.8526],
  "대전": [36.3504, 127.3845],
  "울산": [35.5384, 129.3114],
  "세종": [36.4801, 127.2890],
  "경기": [37.4138, 127.5183],
  "강원": [37.8228, 128.1555],
  "충북": [36.6357, 127.4917],
  "충남": [36.5184, 126.8000],
  "전북": [35.7175, 127.1530],
  "전남": [34.8679, 126.9910],
  "경북": [36.4919, 128.8889],
  "경남": [35.4606, 128.2132],
  "제주": [33.4996, 126.5312],
};

const EMPLOYMENT_TYPE_LABELS = { regular: "정규직", contract: "계약직", intern: "인턴" };
function employmentTypeLabel(type) {
  return EMPLOYMENT_TYPE_LABELS[type] || type || "-";
}

const SORT_OPTIONS = [
  { value: "latest", label: "최신순" },
  { value: "deadline", label: "마감임박순" },
];

function sortJobs(list, sortKey) {
  const copy = [...list];
  if (sortKey === "deadline") {
    return copy.sort((a, b) => {
      if (!a.dueTime && !b.dueTime) return 0;
      if (!a.dueTime) return 1; // 상시채용(마감일 없음)은 뒤로
      if (!b.dueTime) return -1;
      return new Date(a.dueTime) - new Date(b.dueTime);
    });
  }
  return copy.sort((a, b) => b.id - a.id); // latest: 원티드 포지션ID가 클수록 최근 등록
}

function formatDueDate(job) {
  return job.dueTime ? `~${job.dueTime} 마감` : "상시채용";
}

function formatReward(job) {
  return job.rewardTotal ? `추천 보상금 ${job.rewardTotal}` : "";
}

// ===== 이력서 탭: Supabase Auth 로그인 + 사용자가 직접 기록하는 지원 내역 =====
// 원티드 API로는 개인 지원 현황을 가져올 수 없어(원티드 계정 로그인 API가 아님),
// 사용자가 직접 추가/관리하는 지원 트래커로 대체한다.
const APPLICATION_STATUS_OPTIONS = ["지원완료", "서류검토중", "서류통과", "면접예정", "합격", "불합격"];

function statusClass(status) {
  if (status === "서류통과") return "pass";
  if (status === "면접예정") return "interview";
  if (status === "합격") return "pass";
  if (status === "불합격") return "fail";
  return "pending"; // 지원완료 / 서류검토중
}

// ===== 고용 이벤트 탭 목업 데이터 =====
const EVENTS = [
  { id: 1, title: "2026 상반기 개발자 채용설명회", host: "원티드", date: "2026-07-20", location: "서울 강남구 · 코엑스", tag: "채용설명회", dday: 7 },
  { id: 2, title: "백엔드 개발자 커리어 잡페어", host: "프로그래머스", date: "2026-07-25", location: "온라인", tag: "온라인", dday: 12 },
  { id: 3, title: "스타트업 채용 밋업 in 판교", host: "스타트업얼라이언스", date: "2026-08-02", location: "경기 성남시 분당구", tag: "밋업", dday: 20 },
  { id: 4, title: "신입 개발자를 위한 이력서 클리닉", host: "원티드", date: "2026-08-10", location: "온라인", tag: "온라인", dday: 28 },
];

// ===== 커뮤니티 탭 목업 데이터 =====
const COMMUNITY_CATEGORIES = ["전체", "이력서", "커리어", "기술", "면접", "자유"];

const COMMUNITY_POSTS = [
  { id: 1, category: "이력서", title: "신입 백엔드 이력서 첨삭 부탁드립니다", author: "junior_dev", createdDaysAgo: 0, likes: 12, comments: 8 },
  { id: 2, category: "커리어", title: "3년차 개발자 이직 타이밍이 궁금합니다", author: "toss_lover", createdDaysAgo: 1, likes: 34, comments: 21 },
  { id: 3, category: "기술", title: "Kotlin Coroutine 실무 적용 후기 공유합니다", author: "kotlin_kim", createdDaysAgo: 2, likes: 58, comments: 14 },
  { id: 4, category: "면접", title: "카카오 1차 면접 후기 (백엔드)", author: "anon_dev", createdDaysAgo: 3, likes: 76, comments: 33 },
  { id: 5, category: "자유", title: "오늘 첫 출근했습니다 다들 응원해주세요", author: "newbie2026", createdDaysAgo: 4, likes: 120, comments: 45 },
];
