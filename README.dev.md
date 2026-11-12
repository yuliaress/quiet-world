# QUIET WORLD 개발 메모

이 문서는 프로젝트 구조와 기능을 수정할 때 참고할 개발용 안내입니다. 사용자에게 보이는 프로젝트 개요와 실행 방법은 `README.md`를 확인하세요.

## 파일별 책임

| 파일 | 책임 |
| --- | --- |
| `index.html` | 페이지 구조와 에셋/스크립트 연결 |
| `css/styles.css` | DeltaGlass 글꼴, 흑백 처리한 Mona12 컬러 이모지, 타이포그래피와 반응형 레이아웃 |
| `js/storage.js` | 브라우저 로컬 저장소와 날짜별 키 관리 |
| `js/date.js` | 현재 날짜 표시 |
| `js/timer.js` | 실제 경과 시간 기반 타이머와 세션 복구 |
| `js/day-log.js` | 날짜별 기록의 저장/표시. `window.addDayLog()` 제공 |
| `js/fragments.js` | 조각 저장과 책 줍기/지나치기 상호작용 |
| `js/todos.js` | 날짜별 할 일 추가/수정/완료/삭제와 진행률 업데이트 |
| `js/routines.js` | 반복 루틴 추가/수정/삭제 및 날짜별 완료 상태 |
| `js/mood.js` | 날짜별 기분 상태 변경 |
| `js/badges.js` | 오늘 진행 상황에 따른 배지 계산 |
| `js/room.js` | 제작 가능한 소품, 재고, 32칸 방 배치 상태 관리 |
| `js/pwa.js` | 서비스 워커 등록과 브라우저 앱 설치 처리 |
| `js/world.js` | 이전 거리 장면 코드 (현재 화면에서는 사용하지 않음) |
| `assets/player.png` | 이전 거리 장면의 플레이어 스프라이트 |
| `assets/app-icon.svg` | 설치 가능한 웹 앱 아이콘 |
| `manifest.webmanifest` | 앱 이름, 실행 모드, 아이콘 설정 |
| `service-worker.js` | 앱 파일 사전 캐시와 오프라인 응답 |

## 수정 원칙

- 화면 문구와 구조는 `index.html`, 시각 표현은 `css/styles.css`, 상호작용은 해당 기능의 `js/` 파일에서 수정합니다.
- 스크립트는 `index.html`에 선언된 순서대로 로드합니다. `fragments.js`는 앞서 로드되는 `day-log.js`의 `window.addDayLog()`를 사용합니다.
- `room.js`는 `fragments.js`의 `window.canSpendFragments()`와 `window.spendFragments()`를 사용합니다. 제작 재료 ID와 인덱스는 `fragments.js`의 `indexById`에서 관리합니다.
- `localStorage`는 브라우저와 사이트별로 분리됩니다. 할 일·기록·완료 상태는 날짜별로, 루틴과 조각은 날짜가 바뀌어도 유지됩니다.
- 방 꾸미기 상태도 날짜와 무관하게 `quiet-world:room` 키에 저장됩니다. 추가하는 앱 파일은 `service-worker.js`의 사전 캐시 목록에도 포함하세요.
- 테스트 시 저장된 앱 상태는 브라우저 개발자 도구의 Application/Storage에서 `quiet-world:` 키를 확인하거나 삭제할 수 있습니다.
- 메인 화면은 `room.js`의 방 배치 UI입니다. `world.js`와 `player.png`는 이전 거리 장면을 위해 보관 중이며 현재 페이지에서 불러오지 않습니다.
- 빌드/패키지 매니저는 설정되어 있지 않습니다. 변경 후 로컬 서버로 페이지를 열고 각 기능과 브라우저 콘솔을 확인합니다.
