# timeflow-web (만시간 트래커)

웹 기반 시간 트래킹 앱입니다.  
개인 프로젝트용으로, "만 시간의 법칙"을 시각적으로 관리하기 위한 도구입니다.

## 기술 스택

- React
- Vite
- React Router
- Tailwind CSS
- Recharts

## 폴더 구조 개요

`timeflow-web/`

- `src/`
  - `pages/`
    - `Home.jsx`        – 메인 화면
    - `Report.jsx`      – 리포트 화면 (현재는 기본 템플릿 상태)
  - `components/`      – 재사용 가능한 UI 컴포넌트
  - `timer/`           – 타이머 로직, 훅, 컨텍스트
  - `settings/`        – 설정 관련 컨텍스트, 훅

(필요에 따라 폴더와 파일은 변경될 수 있습니다.)

## 실행 방법

1. 의존성 설치
   cd timeflow-web
   npm install

2. 개발 서버 실행
    npm run dev

3.빌드
    npm run build


