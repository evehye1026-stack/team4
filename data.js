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

// 원티드에는 지하철역 좌표가 없어(주소는 문자열만 제공), 잘 알려진 IT 업무 허브를
// full_location 텍스트 키워드로 탐지해 지도에 강조 표시한다 (역세권 강조의 근사치).
const JOB_HUBS = [
  { name: "강남·테헤란로", coords: [37.5006, 127.0364], keywords: ["강남", "테헤란로", "역삼"] },
  { name: "판교", coords: [37.4019, 127.1086], keywords: ["판교"] },
  { name: "여의도", coords: [37.5219, 126.9245], keywords: ["여의도"] },
  { name: "구로·가산디지털단지", coords: [37.4820, 126.8945], keywords: ["구로디지털", "가산디지털", "구로구", "금천구"] },
  { name: "성수", coords: [37.5445, 127.0557], keywords: ["성수"] },
];

const EMPLOYMENT_TYPE_LABELS = { regular: "정규직", contract: "계약직", intern: "인턴" };
function employmentTypeLabel(type) {
  return EMPLOYMENT_TYPE_LABELS[type] || type || "-";
}

const SORT_OPTIONS = [
  { value: "latest", label: "최신순" },
  { value: "deadline", label: "마감임박순" },
];

// 원티드 원본 직무 태그(39종)를 직무별 개발 공고 섹션에서 보기 좋도록 20종 내외로 묶는다.
const SUBCATEGORY_GROUPS = [
  { name: "백엔드", match: /서버 개발자|자바 개발자|Node\.js 개발자|PHP 개발자|\.NET 개발자|소프트웨어 엔지니어/i },
  { name: "파이썬 개발", match: /파이썬 개발자/i },
  { name: "프론트엔드", match: /프론트엔드 개발자|웹 퍼블리셔/i },
  { name: "웹 개발", match: /웹 개발자/i },
  { name: "모바일", match: /안드로이드 개발자|iOS 개발자|크로스플랫폼 앱 개발자/i },
  { name: "AI・머신러닝", match: /머신러닝 엔지니어/i },
  { name: "데이터 사이언스", match: /데이터 사이언티스트/i },
  { name: "데이터 엔지니어링", match: /데이터 엔지니어|빅데이터 엔지니어|BI 엔지니어|DBA/i },
  { name: "DevOps・인프라", match: /DevOps|시스템,네트워크 관리자|시스템 관리자/i },
  { name: "임베디드・펌웨어", match: /임베디드 개발자|C,C\+\+ 개발자/i },
  { name: "하드웨어・로봇", match: /하드웨어 엔지니어|로봇/i },
  { name: "QA・테스트", match: /QA|테스트 엔지니어/i },
  { name: "그래픽스・VR", match: /그래픽스 엔지니어|VR 엔지니어/i },
  { name: "블록체인", match: /블록체인/i },
  { name: "PM・기획", match: /프로덕트 매니저|개발 매니저|프로젝트 엔지니어/i },
  { name: "테크 리더십", match: /CTO|CIO|Chief/i },
  { name: "ERP・RPA", match: /ERP전문가|RPA엔지니어/i },
  { name: "영상・음성", match: /영상,음성 엔지니어/i },
  { name: "기술지원・문서화", match: /기술지원|테크니컬 라이터/i },
];

function mapToSubcategoryGroup(raw) {
  if (!raw) return "기타";
  const found = SUBCATEGORY_GROUPS.find(g => g.match.test(raw));
  return found ? found.name : "기타";
}

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
