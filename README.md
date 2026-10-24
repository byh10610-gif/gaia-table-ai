# 가이아 프로젝트 — GitHub Pages 배포본

2026-10-24 현재 Sites 원본 Git 저장소의 최신 소스를 직접 가져온 이전용 패키지입니다. 브라우저의 ‘웹페이지 저장’으로 만든 파일이 아닙니다.

- 원본 커밋: `724145d9e1dccd9562be56b714855ae305aa8afe` (Sites 저장 버전 21과 일치)
- 배포 대상: `byh10610-gif/gaia-table-ai`
- 배포 주소: https://byh10610-gif.github.io/gaia-table-ai/
- 배포 방식: **Deploy from a branch → main → / (root)**
- 빌드·npm 설치·API 키·사용자 지정 GitHub Actions 워크플로는 필요하지 않습니다.

## 포함된 최신 기능

최종 우승/공동 우승 화면, 플레이어별 최종 점수 계산식, 원본 건물 그림의 플레이어 색상, 최근 파워·종족·공용/특수행동 수정이 포함되어 있습니다.

## GitHub에 올릴 항목

ZIP을 풀어 다음 항목이 있는 폴더를 여세요. **그 폴더 안의 항목을 저장소 최상위에 업로드**합니다. ZIP 파일이나 바깥의 gaia-table-ai 폴더 자체를 올리지 마세요.

| 항목 | 역할 |
| --- | --- |
| `index.html` | 게임 규칙·AI·한글 데이터·지도/종족/타일 이미지가 내장된 실행 원본 |
| `table-ui.js`, `table-ui.css` | 플레이 화면·우승 화면·점수 상세·건물 색상 |
| `status-icons.js`, `status-icons.css` | 자원·연구·건물 원본 아이콘 |
| `assets/` | `icons/`, `lobby/`, `tiles/` 하위 이미지 22개 |
| `.nojekyll` | 정적 파일을 그대로 게시하도록 지정하는 빈 파일 |
| `.gitignore` | 비밀 설정·의존성·임시 ZIP의 Git 추가 방지 |
| `scripts/` | 원본 이미지 추출 도구·화면 조각·크롭 좌표 |
| `tests/` | 원본 회귀 검사 3개. 실행 기준 경로를 저장소 루트로 조정 |
| `README.md`, `VERIFICATION.md`, `SOURCE_FILES.sha256` | 배포 안내·검증 결과·파일 무결성 목록 |

실행에 필요한 최소 항목은 index.html, JS/CSS 4개, assets/입니다. 원본 유지와 재검증을 위해 나머지도 함께 업로드하세요. 총 파일 수는 100개 미만이며 가장 큰 index.html도 약 15.7 MiB로 웹 업로드의 파일당 25 MiB 제한 이내입니다.

## 처음 배포하는 순서

1. GitHub에서 `byh10610-gif` 계정으로 로그인하고 **New repository**를 누릅니다.
2. Repository name에 **gaia-table-ai**, 공개 범위에 **Public**을 선택합니다. 개인 계정의 GitHub Free로 Pages를 쓰려면 Public 저장소가 필요하며, **코드와 이미지 파일도 누구나 볼 수 있게 됩니다.** README 자동 생성은 꺼도 됩니다.
3. 저장소 생성 후 **uploading an existing file** 또는 **Add file → Upload files**를 누릅니다.
4. 압축을 푼 폴더 안의 위 파일과 폴더를 드래그합니다. 업로드 미리보기의 경로가 `index.html`, `assets/icons/...`인지 확인하세요. `gaia-table-ai/index.html`로 보이면 한 단계 위 폴더째 올린 것입니다.
5. Windows에서 숨김 파일인 `.nojekyll`/`.gitignore`가 보이지 않으면 탐색기 **보기 → 표시 → 숨긴 항목**을 켜세요. `.nojekyll`이 빠졌다면 GitHub **Add file → Create new file**에서 파일명을 `.nojekyll`로 만들고 빈 줄 하나를 넣어 커밋해도 됩니다.
6. 업로드를 **main** 브랜치에 커밋합니다.
7. **Settings → Pages → Build and deployment**에서 **Source: Deploy from a branch / Branch: main / Folder: / (root)**를 선택하고 **Save**를 누릅니다.
8. **Actions** 탭에서 GitHub가 자동 생성한 Pages 작업(통상 `pages build and deployment`)의 녹색 성공 표시를 확인합니다. 직접 작성한 워크플로 파일은 필요하지 않습니다.
9. https://byh10610-gif.github.io/gaia-table-ai/ 에 접속합니다. 첫 반영은 수 분, 변경 게시에는 최대 약 10분이 걸릴 수 있습니다.
10. **불러오기**로 기존 JSON을 선택합니다. 새 게임, 이미지, 건물 색, 종료 화면을 확인한 뒤 새 사이트를 사용하세요. 이번 작업에서는 기존 Sites 사이트를 변경하거나 중단하지 않았습니다.

## 이후 수정과 자동 배포

같은 저장소의 main에 변경 파일을 커밋하면 Pages가 다시 배포합니다. 이미지 폴더를 빠뜨리지 마세요. 새 JS/CSS 변경이 브라우저 캐시에 남으면 강력 새로고침을 하거나 index.html의 해당 파일 `?v=` 값을 갱신하세요.

GitHub에서 웹으로 많은 파일을 계속 관리하기 번거로우면 GitHub Desktop으로 저장소를 복제하고 변경 후 main에 push해도 같은 방식으로 배포됩니다.

## 실행 구조·경로

원본 `dist/`의 파일을 저장소 루트로 옮겼습니다. 배포 HTML/JS/CSS의 참조는 이미 상대 경로 또는 내장 data URL이어서 앱 코드의 경로 수정은 필요하지 않았습니다. `/gaia-table-ai/` 실제 하위 경로를 재현한 미리보기에서 확인했습니다. Python 추출 도구의 출력 위치만 `dist/assets/icons`에서 `assets/icons`로 변경했습니다.

기존 저장소가 관리하는 원본 자체가 큰 index.html에 엔진 모듈·데이터·일부 이미지를 내장한 구조입니다. 별도의 미확보 TypeScript 프로젝트나 빌드 원본을 추정해서 만든 것이 아닙니다. 유지보수 시 index.html과 표시용 JS/CSS를 수정하면 됩니다.

사이트 인증·Sites API·Workers·DB·서버 저장소·외부 AI API에 의존하지 않습니다. 게임 실행에 필요한 그림은 내장 데이터 또는 assets에 있습니다. 코드 안의 규칙/참고 문서 URL은 출처 메타데이터이며 게임 실행용 네트워크 요청이 아닙니다. 이 이전으로 사용할 수 없게 되는 게임 기능은 발견하지 못했습니다.

브라우저 자동 저장은 주소별로 분리됩니다. 이전 사이트의 localStorage는 자동 이동하지 않지만 JSON 불러오기 형식과 저장 키는 유지했습니다. 개인 게임 JSON·실제 플레이 데이터·.git 이력·Sites 설정·인증 정보는 포함하지 않았습니다.

## Google Analytics 사용량

GA4 측정 ID `G-645X5N7K1W`로 기본 방문과 게임 시작·JSON 불러오기·최종 정산을 집계합니다. 이벤트 정의, 중복 방지, 개인정보 전송 범위와 검증 방법은 [ANALYTICS.md](ANALYTICS.md)를 참고하세요.

## 개발 검증 (선택)

배포에는 Node/Python이 필요하지 않습니다. 개발자가 회귀 검사를 실행할 때만 Node.js가 필요합니다. 외부 npm 패키지는 쓰지 않습니다.

```sh
node tests/status-icons.cjs
node tests/table-flow.cjs
node tests/action-context.cjs
node tests/analytics.cjs
```

`scripts/extract-game-icons.py`와 `extract-building-icons.py`는 선택적 재추출 도구입니다. Python 및 PyMuPDF(`pip install pymupdf`)와 사용자가 별도로 확보한 원본 규칙서 PDF가 필요합니다. 이미 추출된 이미지가 모두 포함돼 있으므로 배포 시 실행할 필요가 없습니다. rules PDF는 포함하지 않았습니다.

## 공식 참고 문서

- https://docs.github.com/en/pages/quickstart
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository
