// 채용 공고 데이터는 jobs.csv에서 읽어온다 (app.js의 loadJobs() 참고).
// POSTINGS / SUBCATEGORIES / CITY_OPTIONS / ALL_SKILLS는 CSV 로드 후 app.js에서 채워진다.
let POSTINGS = [];
let SUBCATEGORIES = ["전체"];
let CITY_OPTIONS = ["전체"];
let ALL_SKILLS = [];

const CITY_COORDS = {
  "서울": [37.5665, 126.9780],
  "경기": [37.4138, 127.5183],
  "인천": [37.4563, 126.7052],
  "부산": [35.1796, 129.0756],
  "대구": [35.8714, 128.6014],
};

const YEARS_OPTIONS = ["전체", "신입", "1~3년", "3~5년", "5년이상"];

const SORT_OPTIONS = [
  { value: "latest", label: "최신순" },
  { value: "recommend", label: "추천순" },
  { value: "popularity", label: "인기순" },
];

function sortJobs(list, sortKey) {
  const copy = [...list];
  if (sortKey === "latest") return copy.sort((a, b) => a.postedDaysAgo - b.postedDaysAgo);
  if (sortKey === "recommend") return copy.sort((a, b) => b.recommendScore - a.recommendScore);
  return copy.sort((a, b) => b.popularity - a.popularity); // popularity(기본)
}

function formatSalary(job) {
  return `연봉 ${job.salaryMin.toLocaleString()}~${job.salaryMax.toLocaleString()}만원`;
}

function formatApplicants(job) {
  return `지원 ${job.applicants}명`;
}

// ===== 이력서 탭 목업 데이터 =====
const RESUME_PROFILE = {
  name: "홍길동",
  title: "백엔드 개발자 · 3년차",
  completeness: 82,
};

const APPLICATIONS = [
  { id: 1, company: "토스", jobTitle: "백엔드 서버 개발자 (Java/Kotlin)", appliedDaysAgo: 2, status: "서류 검토중" },
  { id: 2, company: "당근마켓", jobTitle: "프론트엔드 개발자 (React)", appliedDaysAgo: 5, status: "서류 통과" },
  { id: 3, company: "카카오", jobTitle: "DevOps 엔지니어", appliedDaysAgo: 9, status: "면접 예정" },
  { id: 4, company: "우아한형제들", jobTitle: "백엔드 서버 개발자 (Node.js)", appliedDaysAgo: 14, status: "불합격" },
];

function statusClass(status) {
  if (status === "서류 통과") return "pass";
  if (status === "면접 예정") return "interview";
  if (status === "불합격") return "fail";
  return "pending"; // 서류 검토중
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
