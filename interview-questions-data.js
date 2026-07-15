// 공고 컨텍스트 목업. 실제 채용 데이터는 별도 Supabase 프로젝트(app.js 참고)에 있어
// 이 프로토타입에서는 접근할 수 없으므로, jobs.csv 1~6행을 그대로 재사용한다.
// 예상 면접질문 데이터 자체는 Supabase interview_questions 테이블에서 읽어온다(interview-questions.js 참고).

const MOCK_JOBS = [
  { id: 1, name: "백엔드 서버 개발자 (Java/Kotlin)", company: "토스", logo: "💜", city: "서울", district: "강남구", categoryChildren: ["서버"], dueTime: null, url: "https://www.wanted.co.kr/wd/1" },
  { id: 2, name: "프론트엔드 개발자 (React)", company: "당근마켓", logo: "🥕", city: "서울", district: "서초구", categoryChildren: ["프론트엔드"], dueTime: "2026-08-15", url: "https://www.wanted.co.kr/wd/2" },
  { id: 3, name: "iOS 앱 개발자", company: "무신사", logo: "🖤", city: "서울", district: "성동구", categoryChildren: ["iOS"], dueTime: "2026-07-31", url: "https://www.wanted.co.kr/wd/3" },
  { id: 4, name: "안드로이드 앱 개발자", company: "야놀자", logo: "🌙", city: "경기", district: "성남시 분당구", categoryChildren: ["안드로이드"], dueTime: null, url: "https://www.wanted.co.kr/wd/4" },
  { id: 5, name: "데이터 엔지니어", company: "쿠팡", logo: "🚚", city: "서울", district: "송파구", categoryChildren: ["데이터"], dueTime: "2026-08-01", url: "https://www.wanted.co.kr/wd/5" },
  { id: 6, name: "DevOps 엔지니어", company: "카카오", logo: "💛", city: "경기", district: "성남시 분당구", categoryChildren: ["DevOps"], dueTime: "2026-07-28", url: "https://www.wanted.co.kr/wd/6" },
  { id: 99, name: "임베디드 소프트웨어 엔지니어", company: "삼성전자", logo: "⚙️", city: "경기", district: "수원시", categoryChildren: ["임베디드"], dueTime: null, url: "#" },
];

// interview_questions 테이블 전용 Supabase 프로젝트 (team4).
// app.js의 jobs 테이블은 다른 프로젝트(blpilnfdxtdfigmqhyaz)를 쓰고 있어 별도로 분리했다.
const INTERVIEW_SUPABASE_URL = "https://gzqvdlosrwoqcvazqsxv.supabase.co";
const INTERVIEW_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6cXZkbG9zcndvcWN2YXpxc3h2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwMDg3ODgsImV4cCI6MjA5OTU4NDc4OH0.hoKavw-Yle1AsLG03XE1l_OiWN8A-7LtGryLCjjzCuU";
