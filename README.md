# 역학 및 건강증진 조별활동 평가 설문

GitHub Pages에 올려 바로 사용할 수 있는 정적 설문 앱입니다. 조원평가 시스템과 조별평가 시스템을 분리해서 제출하며, Google Apps Script Web App URL을 연결하면 응답이 Google Sheets에 저장됩니다.

## 파일 구성

- `index.html`: 설문 화면
- `styles.css`: 화면 스타일
- `app.js`: 조원/조별 평가 시스템 선택, 조 선택 후 조원명 드롭다운, 제출 처리
- `google-apps-script/Code.gs`: Google Sheets 저장용 Apps Script
- `docs/survey-ui-concept.png`: 구현 기준 UI 콘셉트

## GitHub Pages 배포

1. 이 폴더의 파일을 GitHub 저장소에 올립니다.
2. 저장소 `Settings` -> `Pages`에서 배포 브랜치와 폴더를 선택합니다.
3. 배포 URL에서 `index.html`이 열리는지 확인합니다.

## Google Sheets 연결

1. 새 Google Sheet를 만듭니다.
2. `확장 프로그램` -> `Apps Script`를 엽니다.
3. `google-apps-script/Code.gs` 내용을 붙여넣고 저장합니다.
4. `배포` -> `새 배포` -> 유형 `웹 앱`을 선택합니다.
5. 실행 권한은 본인, 액세스 권한은 설문 응답자가 접근 가능한 범위로 설정합니다.
6. 배포 후 Web App URL을 복사합니다.
7. `app.js`의 `CONFIG.googleScriptUrl`에 URL을 넣습니다.

```js
const CONFIG = {
  googleScriptUrl: "https://script.google.com/macros/s/배포_ID/exec",
  courseName: "역학 및 건강증진",
  presentationDate: "2026-06-09"
};
```

## 저장되는 시트

- `Submissions`: 원본 JSON 백업. `systemType`으로 `peer` 또는 `group` 제출을 구분합니다.
- `PeerEvaluation`: 조원평가 결과
- `GroupEvaluation`: 조별평가 결과

## 사용 흐름

1. 본인 조를 선택합니다.
2. 본인 이름을 `조원명` 드롭다운에서 선택합니다.
3. `조원평가 시스템` 또는 `조별평가 시스템`을 선택합니다.
4. 현재 선택한 시스템의 항목만 평가하고 제출합니다.

## 반영된 평가 항목

조원평가: 출석 및 참여도, 맡은 역할 수행, 자료조사 기여, 협력 및 의사소통, 발표 기여도

조별평가: 주제 적절성, 문제 분석, 근거 활용, PRECEDE 진단, 건강증진 전략, 발표 전달력
