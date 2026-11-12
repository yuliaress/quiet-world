# QUIET WORLD

픽셀아트 감성의 집중·루틴 관리 웹 앱입니다. HTML, CSS, 바닐라 JavaScript로 구성된 정적 사이트이며 별도의 빌드 과정이나 패키지 설치가 필요하지 않습니다.

## 실행

프로젝트 폴더에서 로컬 서버를 실행한 뒤 브라우저에서 `http://localhost:8000`을 여세요.

```powershell
py -m http.server 8000
```

VS Code의 Live Server 확장을 사용해 `index.html`을 열어도 됩니다. 월드 캐릭터 이미지를 캔버스에 표시하려면 로컬 서버로 실행하는 것을 권장합니다.

## 구성

- `index.html`: 페이지 마크업과 스타일·스크립트 연결
- `css/styles.css`: 레이아웃, 패널, 반응형 스타일
- `js/`: 타이머, 기록, 조각, 할 일, 월드 렌더링 기능
- `assets/player.png`: 월드 캐릭터 스프라이트
- `README.dev.md`: 파일별 역할과 유지보수 안내
