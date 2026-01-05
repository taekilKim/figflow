# FigFlow

**Figma 프레임을 원본으로 유지한 채 웹에서 플로우차트를 만들고 관리하는 도구**

FigFlow는 디자이너와 기획자가 Figma 화면을 캡처해서 붙여넣는 대신, Figma 프레임을 '참조'한 채로 플로우차트를 만들 수 있는 웹 애플리케이션입니다. Figma에서 화면이 수정되면 Sync 버튼 하나로 플로우차트의 썸네일을 갱신할 수 있습니다.

## 핵심 개념

### 문제점
- 화면 플로우를 만들 때마다 Figma 화면 캡처 → PPT/FigJam 붙여넣기
- 화면이 수정되면 캡처 이미지가 즉시 구버전이 됨
- 다시 캡처하고 다시 정리하는 반복 작업

### 해결책
- **이미지를 저장하지 않고 Figma node-id로 참조**
- Figma가 수정되어도 Sync 버튼으로 썸네일만 갱신
- 웹에서의 플로우 구조(위치, 연결, 주석)는 유지

## 주요 기능

### MVP 기능
- ✅ **플로우차트 편집**: 노드 드래그, 연결 생성/삭제, 줌/팬
- ✅ **Figma 싱크**: Figma Images API를 통해 썸네일 자동 갱신
- ✅ **로컬 저장**: localStorage 기반 프로젝트 저장/복원
- ✅ **3패널 레이아웃**: 프레임 목록 / 캔버스 / 속성 패널
- ✅ **상태 관리**: 프레임별 상태(draft/review/approved/deprecated)
- ✅ **메모 기능**: 각 프레임과 연결선에 메모 추가

### 기술 스택
- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite 6
- **Flow Editor**: React Flow (@xyflow/react)
- **Styling**: CSS

## 시작하기

### 1. 설치

```bash
npm install
```

### 2. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:5173` 열기

### 3. 빌드

```bash
npm run build
```

빌드 결과물은 `dist/` 디렉토리에 생성됩니다.

### 4. 프리뷰

```bash
npm run preview
```

## 사용 방법

### Figma Access Token 설정

1. [Figma Settings > Personal Access Tokens](https://www.figma.com/developers/api#access-tokens)에서 토큰 생성
2. FigFlow에서 **Sync** 버튼 클릭 시 토큰 입력
3. 토큰은 브라우저 localStorage에 안전하게 저장됨

### 플로우차트 만들기

1. **프레임 추가** 버튼으로 Figma 프레임 추가 (구현 예정)
2. 캔버스에서 노드를 드래그하여 배치
3. 노드 간 연결선을 드래그하여 생성
4. 우측 패널에서 속성 편집 (제목, 상태, 메모)
5. **Sync** 버튼으로 Figma 썸네일 갱신
6. **저장** 버튼으로 프로젝트 저장

## 프로젝트 구조

```
figflow/
├── src/
│   ├── components/          # React 컴포넌트
│   │   ├── FlowCanvas.tsx   # 메인 캔버스 (React Flow)
│   │   ├── FrameNode.tsx    # Figma 프레임 노드
│   │   ├── LeftPanel.tsx    # 프레임 목록
│   │   └── RightPanel.tsx   # 속성 패널
│   ├── types/               # TypeScript 타입 정의
│   ├── utils/               # 유틸리티 함수
│   │   ├── figma.ts         # Figma API 연동
│   │   └── storage.ts       # localStorage 관리
│   ├── hooks/               # Custom React hooks
│   └── styles/              # CSS 스타일
├── public/                  # 정적 파일
└── dist/                    # 빌드 결과물
```

## 데이터 모델

### Node (프레임)
```typescript
{
  id: string                // 노드 ID
  position: { x, y }        // 캔버스 위치
  data: {
    figma: {
      fileKey: string       // Figma 파일 키
      nodeId: string        // Figma 노드 ID
      nodeUrl: string       // Figma URL
    }
    meta: {
      title: string         // 프레임 제목
      status?: string       // 상태
      notes?: string        // 메모
      thumbnailUrl?: string // 썸네일 URL
      lastSyncedAt?: number // 마지막 싱크 시간
    }
  }
}
```

### Edge (연결선)
```typescript
{
  id: string
  source: string            // 출발 노드 ID
  target: string            // 도착 노드 ID
  label?: string            // 연결선 라벨
  data: {
    sourceType: 'auto' | 'manual' | 'inferred'
  }
}
```

## 로드맵

### 1단계 (현재 완료) ✅
- React + Vite 프로젝트 초기화
- React Flow 기반 캔버스
- Figma Images API 연동
- localStorage 저장/복원

### 2단계 (다음 작업)
- Figma 프레임 추가 기능
- Figma 프로토타입 연결 자동 가져오기
- 프레임 이름 기반 자동 연결 추론

### 3단계
- Export (PNG, PDF, Mermaid)
- 버전 히스토리
- 팀/프로젝트 관리

### 4단계
- 실시간 협업
- Figma Webhook 연동
- AI 기반 플로우 추론

## 기여하기

이슈와 PR은 언제나 환영합니다!

## 라이선스

MIT License

---

**Made with ❤️ for designers and PMs**
