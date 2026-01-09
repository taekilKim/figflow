# FigFlow Development History & Context Document

**Branch**: `claude/figma-flowchart-webapp-oV3V2`
**Last Updated**: 2026-01-09
**Current Commit**: `1f2bf6f`

---

## 📌 Project Overview

**FigFlow**는 Figma 프레임을 기반으로 한 플로우차트 웹 애플리케이션입니다.

### Tech Stack
- **Framework**: React + TypeScript + Vite
- **Flow Library**: @xyflow/react (React Flow v12.x)
- **Design System**: Toss Design System (TDS)
- **Icons**: Phosphor Icons
- **Styling**: CSS Modules + Global CSS
- **State Management**: React Hooks + localStorage

### Key Features
- Figma API 연동을 통한 프레임 이미지 동기화
- React Flow 기반 캔버스 드래그 앤 드롭
- Native StepEdge를 사용한 직각 연결선
- 줌 레벨에 따른 동적 UI 스케일링
- 다중 노드 선택 및 정렬 기능
- 스페이스바 패닝 모드

---

## 🚨 Critical Technical Decisions (FROZEN)

다음 기술적 결정들은 **변경 금지**입니다:

1. **Edge Type**: Native `StepEdge` 사용 (Smart Edge 완전 제거)
   - `getSmoothStepPath` with `offset: 0`, `borderRadius: 0`
   - TDSStepEdge 컴포넌트로 래핑

2. **Marker System**: MarkerType 객체 직접 주입 (SVG defs 사용 안 함)
   - `orient: 'auto-start-reverse'` 필수
   - 색상은 edge style.stroke에서 동적 추출

3. **CSS Variable Scope**: Portal 문제 해결을 위해 `document.body`에 주입
   - `--zoom-scale` 변수를 전역으로 설정

4. **Layout**: 하드코딩된 픽셀 값 사용
   - TDSControls: `left: 312px, bottom: 16px`
   - MiniMap: `right: 352px, bottom: 16px`
   - ZoomIndicator: MiniMap 외부 독립 배치

---

## 📜 Complete Commit History

### Latest Session (2026-01-09)

#### Commit 1: `1f2bf6f` - fix: 4가지 최종 근본 수정
**Date**: 2026-01-09

**User Requirements (Verbatim)**:
1. "연결선의 화살표 방향이 프레임을 향해 수직으로 만들어지는 것이 아니라 모두 오른쪽 방향을 향함"
2. "연결선 라벨의 크기가 동적으로 변하지 않음. tds-edge-label 에 폰트 사이즈 정의 자체가 안 되어있음"
3. "shift + 클릭으로 다중 프레임 노드를 선택하는 게 다소 매끄럽지 않음"
4. "프레임을 선택할 때 간헐적으로 선택이 안 돼서 2번씩 텀을 두고 누르거나 드래그해서 선택해야 함"

**Root Cause Analysis & Solutions**:

1. **Arrow Orientation**
   - 원인: `orient: 'auto'`가 0도(오른쪽)로 고정
   - 해결: `orient: 'auto-start-reverse'` 명시
   - 수정: 6개 위치 (getMarkerEnd/Start, initialEdges, onConnect, onConnectEnd, defaultEdgeOptions)

2. **Label Dynamic Sizing**
   - 원인: EdgeLabelRenderer는 Portal로 렌더링되어 CSS 변수 상속 불가
   - 해결:
     - FlowWrapper에서 `document.body.style.setProperty('--zoom-scale', scale)`
     - global.css에 `.tds-edge-label` 클래스 정의
     ```css
     font-size: clamp(12px, calc(12px + (var(--zoom-scale, 1) - 1) * 8px), 24px) !important;
     ```

3. **Multi-Selection**
   - 원인: selectionKeyCode와 panOnDrag 충돌
   - 해결:
     - `selectionOnDrag={true}`
     - `selectionKeyCode={null}`
     - `multiSelectionKeyCode="Shift"`

4. **Click Interference**
   - 원인: 엣지 투명 영역이 노드 클릭 가로챔
   - 해결: `style: { pointerEvents: 'visibleStroke' }`

**Files Modified**:
- `src/components/FlowCanvas.tsx`
- `src/styles/global.css`

---

#### Commit 2: `270176c` - fix: 5가지 긴급 수정
**Date**: 2026-01-09

**User Requirements (Verbatim)**:
1. "위 또는 아래로 연결된 연결선의 화살표 방향이 수직이 아니라 오른쪽 방향으로 되어 있음"
2. "연결선 라벨의 크기가 동적으로 변하지 않음"
3. "줌 레벨 표시가 보이지 않음. 개발자도구로도 찾을 수 없음. 렌더링 문제?"
4. "shift + 클릭으로 다중 프레임 노드를 선택하는 게 다소 매끄럽지 않음"
5. "프레임을 선택할 때 간헐적으로 클릭이 되지 않는 문제 발생"

**Solutions**:
1. Arrow: `orient: 'auto'` 추가 (후에 auto-start-reverse로 변경)
2. Label: TDSStepEdge에서 fontSize 인라인 스타일 제거, className 추가
3. ZoomIndicator: MiniMap 외부로 독립 배치
4. Selection: selectionKeyCode="Shift" 제거
5. Click: `.react-flow__handle`에 `pointer-events: none` 추가

**Files Modified**:
- `src/components/FlowCanvas.tsx`
- `src/components/TDSStepEdge.tsx`
- `src/styles/global.css`

---

#### Commit 3: `13be46b` - fix: 7가지 최종 수정 사항
**Date**: 2026-01-09

**User Requirements (Verbatim)**:
1. "연결선 끝의 화살표 색상이 연결선과 동일한 색이어야 하는데, 색상이 검은색으로 고정되어 있음"
2. "연결선 끝이 프레임에 안 붙는다고....좀 해봐 어떻게 좀"
3. "줌 레벨(%) 표시 UI를 미니맵 div 안으로 넣어. 난 미니맵 영역 안에 줌 레벨이 있는 걸 원한다고"
4. "미니맵은 스크린 하단에서 20이 아니라 16이 떨어져 있어야 해"
5. "미니맵이 오른쪽 패널 뒤에 살짝 가려져 있어. right 320이 아니라 352 를 부여해야 해"
6. "tds-controls 도 스크린 하단에서 20이 아니라 16이 떨어져야 해"
7. "tds-controls은 왼쪽 패널에서 너무 멀리 떨어져 있어. left 320이 아니라 312여야 해"

**Solutions**:
1. 화살표 색상: getMarkerEnd/Start에 strokeColor 파라미터 추가, 동적 색상 적용
2. 연결선 갭: TDSStepEdge `offset: 0` (이미 적용됨)
3. 줌 레벨: MiniMap children으로 배치 시도 (후에 외부 배치로 변경)
4-7. UI Layout: 하드코딩된 픽셀 값 적용

**Files Modified**:
- `src/components/FlowCanvas.tsx`

---

#### Commit 4: `e94028d` - refactor: Pivot - Simplify to Stabilize
**Date**: 2026-01-09

**Critical Recovery Specification**:

**User Requirements (Verbatim)**:
"과도한 최적화와 실험적인 기능 추가가 기본 기능을 망가뜨리고 있는 전형적인 기술 부채 상황"

**Absolute Directives**:
1. Native Only: `getSmoothStepPath`만 사용
2. Hardcoded Styles: `!important`와 하드코딩된 픽셀 값
3. Explicit Objects: 마커는 JS 객체로 직접 주입

**Actions**:
- A. Edge & Marker: url(#id) 제거 → MarkerType 객체
- B. Connectivity: offset: 50 → 0 (Zero Gap)
- C. UI Layout: 변수 제거 → 320px 하드코딩
- D. Handle CSS: Expanded hit area 제거 (50px → 10px)

**Files Modified**:
- `src/components/FlowCanvas.tsx` (TDS_MARKER 상수, SVG defs 제거)
- `src/components/TDSStepEdge.tsx` (offset: 0, borderRadius: 0)
- `src/styles/global.css` (핸들 단순화)

---

#### Commit 5: `e60c267` - fix: 5 UI/UX improvements
**Date**: Earlier in session

**User Requirements (Verbatim)**:
1. "미니맵이 여전히 옆 패널에 너무 과하게 붙어있고, 미니맵 안쪽에 줌 레벨이 안 나와"
2. "쿠키삭제 새로고침하면 연결선이 프레임에서 떨어져있고, 그냥 새로고침하면 다시 붙어있어"
3. "화살표가 여전히 안 나와"
4. "연결선을 프레임에 연결할 때, 앵커 인식 범위를 한쪽 모서리 면으로 넓혀줘"
5. "ctrl+1/cmd+1을 전체화면/100% 보기 토글로 변경해주고, 툴팁도 반영해줘"

**Solutions**:
1. LAYOUT.GUTTER: 40 → 60px (340px total)
2. loadedEdges type: 'step' 명시
3. markerEnd: 'url(#tds-arrow)' 명시
4. Handle hit area: 50px with ::after pseudo-element
5. Ctrl+1 toggle: DOMMatrix로 줌 감지, 100% ↔ fit view

**Files Modified**:
- `src/components/FlowCanvas.tsx`
- `src/components/TDSControls.tsx`
- `src/styles/global.css`

---

### Previous Session Commits

#### `6c6b545` - refactor: Pivot - Simplify to Stabilize
동일한 내용의 이전 시도

#### `293c68a` - feat: System Bible v2.0
UI/UX refinements 및 단축키 수정

#### `a40ee76` - fix: System Bible compliance
전역 letter-spacing 강제 적용

#### `4d27a92` - feat: Architectural improvements
Singleton strategy, TDS UI, tooltips

#### `68938eb` - fix: ULTIMATUM fixes
Singleton edge 강제, 즉시 회피, MiniMap 복원

#### `b0be1d7` - fix: Manual Bridge
UI 통합 및 타이포그래피 복구

#### `84dba2d` - feat: The Bridge Strategy
Gap 제거 및 장애물 회피

---

## 🎯 Current Code State

### File Structure
```
src/
├── components/
│   ├── FlowCanvas.tsx      # Main canvas component
│   ├── TDSStepEdge.tsx     # Custom step edge
│   ├── TDSControls.tsx     # Custom controls
│   ├── FrameNode.tsx       # Frame node component
│   ├── AddFrameDialog.tsx  # Add frame dialog
│   └── FigmaFileImportDialog.tsx
├── styles/
│   ├── global.css          # Global styles with TDS
│   └── FlowCanvas.css
├── utils/
│   ├── storage.ts          # localStorage helpers
│   ├── figma.ts           # Figma API
│   └── edgeUtils.ts       # Edge utilities
└── types/
    └── index.ts           # TypeScript types
```

### Key Code Sections

#### 1. FlowCanvas.tsx - Edge Creation
```typescript
// Marker 생성 (6개 위치에 동일하게 적용)
const getMarkerEnd = (edgeData?: FlowEdgeData, strokeColor?: string) => {
  return {
    type: MarkerType.ArrowClosed,
    width: 20,
    height: 20,
    color: strokeColor || edgeData?.color || '#555555',
    orient: 'auto-start-reverse' as const,
  }
}
```

#### 2. FlowCanvas.tsx - Portal CSS Variable
```typescript
const FlowWrapper = ({ children, isPanning }) => {
  const { zoom } = useViewport()
  const scale = zoom < 1 ? (1 / zoom) : 1

  useEffect(() => {
    document.body.style.setProperty('--zoom-scale', scale.toString())
  }, [scale])

  // ...
}
```

#### 3. FlowCanvas.tsx - ReactFlow Config
```typescript
<ReactFlow
  selectionOnDrag={true}
  selectionKeyCode={null}
  multiSelectionKeyCode="Shift"
  panOnDrag={isPanning}
  selectionMode={SelectionMode.Partial}
  defaultEdgeOptions={{
    type: 'step',
    style: {
      strokeWidth: 2,
      stroke: '#555555',
      pointerEvents: 'visibleStroke' as any,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: '#555555',
      orient: 'auto-start-reverse' as const,
    },
  }}
/>
```

#### 4. TDSStepEdge.tsx - Path Calculation
```typescript
const [edgePath, labelX, labelY] = getSmoothStepPath({
  sourceX, sourceY, sourcePosition,
  targetX, targetY, targetPosition,
  borderRadius: 0,  // 완전한 직각
  offset: 0,        // 갭 제거
})
```

#### 5. global.css - Dynamic Font Size
```css
.tds-edge-label {
  font-family: 'Pretendard Variable', Pretendard, sans-serif !important;
  font-weight: 600 !important;
  font-size: clamp(12px, calc(12px + (var(--zoom-scale, 1) - 1) * 8px), 24px) !important;
  line-height: 1.4 !important;
  letter-spacing: 0 !important;
}
```

#### 6. global.css - Handle Pointer Events
```css
.react-flow__handle {
  pointer-events: none;
}

.react-flow__node:hover .react-flow__handle,
.react-flow__node.selected .react-flow__handle,
.react-flow__node.connection-target .react-flow__handle {
  opacity: 1;
  pointer-events: all;
}
```

---

## ⚠️ Known Issues & Anti-Patterns

### DO NOT DO (절대 금지)
1. ❌ Smart Edge 라이브러리 사용 (`@tisoap/react-flow-smart-edge`)
2. ❌ SVG `<defs>` 마커 정의 및 `url(#id)` 참조
3. ❌ offset > 0 설정 (갭 발생)
4. ❌ borderRadius > 0 설정 (직각 아님)
5. ❌ LAYOUT 변수 계산식 사용 (하드코딩된 픽셀 값만)
6. ❌ MiniMap children으로 ZoomIndicator 배치 (Portal 문제)
7. ❌ `selectionKeyCode="Shift"` 설정 (다중 선택 방해)
8. ❌ 엣지 스타일에 pointerEvents 미설정 (클릭 간섭)

### Common Pitfalls
1. **Portal CSS Variable**: EdgeLabelRenderer는 별도 Portal이므로 body에 CSS 변수 주입 필수
2. **Marker Orient**: 'auto' 대신 'auto-start-reverse' 사용 (수직 화살표 방향)
3. **Selection Conflict**: panOnDrag와 selectionOnDrag 충돌 주의
4. **Pointer Events**: 엣지의 투명 영역이 노드 클릭 방해할 수 있음

---

## 🔄 Repetitive User Complaints (반복되는 문제들)

다음 문제들이 여러 번 반복 수정되었습니다:

1. **화살표 방향 문제** (3회)
   - Root Cause: `orient` 속성 누락 또는 잘못된 값
   - Final Solution: `orient: 'auto-start-reverse'`

2. **라벨 동적 크기** (3회)
   - Root Cause: Portal CSS 변수 스코프 + 인라인 스타일 덮어쓰기
   - Final Solution: body에 CSS 변수 주입 + className 사용

3. **다중 선택 문제** (2회)
   - Root Cause: selectionKeyCode 설정 충돌
   - Final Solution: `selectionKeyCode={null}`, `selectionOnDrag={true}`

4. **프레임 클릭 문제** (2회)
   - Root Cause: 핸들/엣지 pointer-events
   - Final Solution: 조건부 pointer-events 설정

---

## 📝 User Communication Patterns

### 사용자 요청 스타일
- **원문 그대로 전달**: "연결선 끝이 프레임에 안 붙는다고....좀 해봐 어떻게 좀"
- **명확한 픽셀 값**: "right 320이 아니라 352를 부여해야 해"
- **명령형 톤**: "이외의 연결선 관련 로직은 영향 받지 않도록 프리즈해줘"
- **기술 부채 인식**: "과도한 최적화가 기본 기능을 망가뜨리고 있음"

### 선호하는 해결 방식
- ✅ Hardcoded values (변수 계산식 지양)
- ✅ 원시적이고 안정적인 방법
- ✅ 명시적 설정 (implicit behavior 지양)
- ✅ 근본 원인(Root Cause) 분석

---

## 🚀 Next Steps for New Session

### Immediate Context to Share
1. 현재 브랜치: `claude/figma-flowchart-webapp-oV3V2`
2. 최신 커밋: `1f2bf6f`
3. 모든 코어 기능 안정화 완료
4. 4가지 반복 문제 근본 해결 완료

### If User Reports Issues
1. 먼저 이 문서의 "Known Issues" 섹션 확인
2. "DO NOT DO" 목록 위반 여부 체크
3. "Repetitive User Complaints" 섹션에서 유사 사례 찾기
4. Root Cause Analysis 수행 후 수정

### Code Modification Guidelines
1. **Edge 관련**: TDSStepEdge.tsx 및 marker 생성 로직만 수정
2. **Layout 관련**: 하드코딩된 픽셀 값만 변경 (변수 사용 금지)
3. **Styling 관련**: global.css의 `!important` 우선순위 존중
4. **Selection 관련**: ReactFlow props 조합 신중하게 테스트

### Testing Checklist
모든 수정 후 다음 확인 필수:
- [ ] 화살표 방향 (수직 연결선 특히)
- [ ] 라벨 동적 크기 (줌 인/아웃 시)
- [ ] 다중 선택 (Shift+클릭, 드래그)
- [ ] 노드 클릭 (간헐적 실패 없는지)
- [ ] 연결선 갭 (프레임과 완전 밀착)
- [ ] UI 레이아웃 (MiniMap, Controls, ZoomIndicator)

---

## 📚 Technical Documentation References

### React Flow
- Version: @xyflow/react v12.x
- Docs: https://reactflow.dev/
- Key Concepts: MarkerType, getSmoothStepPath, EdgeLabelRenderer

### TDS (Toss Design System)
- letter-spacing: 0 (전역 강제)
- Font: Pretendard Variable
- Colors: Blue 500 (#3182F6), Grey scale

### Critical Props
```typescript
// ReactFlow
panOnDrag: boolean | [0, 1, 2]  // 0=left, 1=wheel, 2=right
selectionOnDrag: boolean
selectionKeyCode: string | null
multiSelectionKeyCode: string
selectionMode: SelectionMode.Full | Partial

// Edge
type: 'step'
markerEnd: { type, width, height, color, orient }
style: { stroke, strokeWidth, pointerEvents }

// StepEdge
offset: number  // 0 = no gap
borderRadius: number  // 0 = sharp corners
```

---

## 🎓 Lessons Learned

1. **Portal 문제는 전역 CSS 변수로 해결**
   - `document.body.style.setProperty()` 사용

2. **Marker는 객체로, 절대 SVG defs 안 씀**
   - `orient: 'auto-start-reverse'` 필수

3. **Selection은 간단하게 설정**
   - `selectionKeyCode={null}` + `selectionOnDrag={true}`

4. **Pointer Events 섬세하게 제어**
   - 핸들: 조건부, 엣지: 'visibleStroke'

5. **과도한 최적화는 독**
   - Hardcoded values > Smart calculations

---

**End of Document**

This document should be shared with any new Claude Code session to provide complete context.
