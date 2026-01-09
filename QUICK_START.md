# FigFlow - Quick Start Guide for New Sessions

**Last Update**: 2026-01-09 | **Branch**: `claude/figma-flowchart-webapp-oV3V2` | **Commit**: `1f2bf6f`

---

## 🚀 Immediate Context

### What This Project Is
Figma 프레임 기반 플로우차트 웹 애플리케이션 (React + React Flow)

### Current State
✅ **All core features stable**
✅ **4 major issues root-cause-fixed**
✅ **Ready for production**

### Build & Run
```bash
npm install
npm run dev    # Development server
npm run build  # Production build
```

---

## ⚡ Critical Rules (읽지 않으면 문제 발생!)

### 🚫 NEVER DO
1. ❌ Smart Edge 라이브러리 사용
2. ❌ SVG `<defs>` 마커 사용
3. ❌ `offset > 0` 또는 `borderRadius > 0` 설정
4. ❌ CSS 변수 계산식 (하드코딩만!)
5. ❌ `selectionKeyCode="Shift"` 설정

### ✅ ALWAYS DO
1. ✅ Marker 객체에 `orient: 'auto-start-reverse'` 명시
2. ✅ CSS 변수는 `document.body.style.setProperty()` 사용
3. ✅ UI 레이아웃은 픽셀 하드코딩
4. ✅ Pointer events 섬세하게 제어
5. ✅ 근본 원인(Root Cause) 먼저 분석

---

## 🔥 Most Common Issues (반복된 문제들)

### 1. 화살표가 모두 오른쪽을 향함
**원인**: `orient` 속성 누락
**해결**: 모든 마커에 `orient: 'auto-start-reverse' as const` 추가

### 2. 라벨 크기가 동적으로 안 바뀜
**원인**: Portal CSS 변수 스코프
**해결**:
- FlowWrapper에서 `document.body.style.setProperty('--zoom-scale', scale)`
- global.css에 `.tds-edge-label` 정의

### 3. Shift 다중 선택이 안 됨
**원인**: `selectionKeyCode` 충돌
**해결**:
```typescript
selectionOnDrag={true}
selectionKeyCode={null}
multiSelectionKeyCode="Shift"
```

### 4. 프레임 클릭이 간헐적으로 안 됨
**원인**: 핸들/엣지 pointer-events
**해결**:
```css
.react-flow__handle { pointer-events: none; }
.react-flow__node:hover .react-flow__handle { pointer-events: all; }
```
```typescript
defaultEdgeOptions.style.pointerEvents = 'visibleStroke'
```

---

## 📁 Key Files to Know

```
src/components/FlowCanvas.tsx     ← Main canvas (1300+ lines)
src/components/TDSStepEdge.tsx    ← Edge component (~110 lines)
src/styles/global.css             ← Global styles with TDS
```

### Critical Code Blocks

#### Marker Creation (6 places)
```typescript
{
  type: MarkerType.ArrowClosed,
  width: 20,
  height: 20,
  color: strokeColor || '#555555',
  orient: 'auto-start-reverse' as const,  // 필수!
}
```

#### Edge Path
```typescript
getSmoothStepPath({
  // ...coords
  borderRadius: 0,  // 직각
  offset: 0,        // 갭 없음
})
```

#### Layout (hardcoded)
```typescript
TDSControls: { left: 312, bottom: 16 }
MiniMap: { right: 352, bottom: 16 }
ZoomIndicator: { right: 360, bottom: 108 }  // 독립 배치
```

---

## 🎯 User Communication Style

### 요청 패턴
- 원문 그대로 명세서 형태로 전달
- "토씨 하나 바꾸지 말고" 강조
- 픽셀 값 정확히 명시
- "프리즈해줘" (변경 금지 요청)

### 선호 스타일
- ✅ Verbatim requirements (원문 그대로)
- ✅ Root cause analysis
- ✅ Hardcoded values
- ✅ 명시적 설정 (implicit X)

---

## 📊 Session Summary

### Latest Commits (2026-01-09)
1. `1f2bf6f` - 4가지 최종 근본 수정 (orient, Portal CSS, selection, pointerEvents)
2. `270176c` - 5가지 긴급 수정 (arrow, label, zoom, selection, click)
3. `13be46b` - 7가지 최종 수정 (color, layout, zoom 위치)
4. `e94028d` - Pivot: Smart Edge 완전 제거

### Issues Resolved
- ✅ 화살표 방향 (auto-start-reverse)
- ✅ 라벨 동적 크기 (body CSS variable)
- ✅ 다중 선택 (selectionKeyCode: null)
- ✅ 클릭 간섭 (pointerEvents: visibleStroke)
- ✅ 연결선 갭 (offset: 0)
- ✅ UI 레이아웃 (hardcoded pixels)

---

## 🔍 If User Reports Bug

### Step-by-step
1. Read `DEVELOPMENT_HISTORY.md` "Repetitive User Complaints" section
2. Check "DO NOT DO" list compliance
3. Verify critical code blocks (marker, path, layout)
4. Root cause analysis BEFORE fixing
5. Test all 4 common issues after fix

### Testing Checklist
- [ ] 화살표 방향 (특히 수직)
- [ ] 라벨 동적 크기 (줌 인/아웃)
- [ ] 다중 선택 (Shift+클릭, 드래그)
- [ ] 노드 클릭 (간헐적 실패 없음)
- [ ] 연결선 갭 (완전 밀착)
- [ ] UI 위치 (MiniMap, Controls, Zoom)

---

## 📚 Full Documentation

자세한 내용은 `DEVELOPMENT_HISTORY.md` 참조:
- 전체 커밋 히스토리
- 사용자 요구사항 원문
- 근본 원인 분석
- 기술적 결정 사항
- Anti-patterns 목록

---

**Ready to start? Read DEVELOPMENT_HISTORY.md for complete context.**
