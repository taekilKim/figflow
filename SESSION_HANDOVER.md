# 🔄 Session Handover Document

**From**: Claude Code Session (2026-01-09)
**To**: Next Claude Code Session
**Branch**: `claude/figma-flowchart-webapp-oV3V2`
**Commit**: `1f2bf6f`

---

## 📚 Read These Documents in Order

### 1️⃣ QUICK_START.md (5분)
**먼저 읽어야 할 문서**
- 프로젝트 개요
- Critical Rules (NEVER DO / ALWAYS DO)
- 가장 흔한 4가지 문제와 해결법
- 핵심 코드 블록

### 2️⃣ DEVELOPMENT_HISTORY.md (15분)
**전체 맥락 이해**
- 완전한 커밋 히스토리
- 사용자 요구사항 원문
- 근본 원인 분석
- 기술적 결정 사항
- Lessons Learned

### 3️⃣ CODE_SNAPSHOT.md (참고용)
**코드 구조 빠른 참조**
- 주요 컴포넌트 스냅샷
- Critical sections 코드
- Data flow 다이어그램

---

## 🎯 Current Status

### ✅ Completed
- [x] Smart Edge 완전 제거 → Native StepEdge 전환
- [x] 화살표 방향 문제 근본 해결 (orient: auto-start-reverse)
- [x] 라벨 동적 크기 문제 근본 해결 (Portal CSS variable)
- [x] 다중 선택 문제 근본 해결 (selectionKeyCode: null)
- [x] 클릭 간섭 문제 근본 해결 (pointerEvents: visibleStroke)
- [x] 연결선 갭 제거 (offset: 0)
- [x] UI 레이아웃 안정화 (hardcoded pixels)

### 📊 Latest Metrics
- **Build Size**: 448.90 kB (gzipped: 141.19 kB)
- **TypeScript**: No errors
- **Total Commits Today**: 5개
- **Issues Resolved**: 4가지 반복 문제 근본 해결

---

## 🚨 CRITICAL WARNINGS

### If User Says These Words, READ DOCS FIRST!

| User Phrase | Document to Check | Section |
|------------|------------------|---------|
| "화살표가 오른쪽을 향함" | QUICK_START.md | Issue #1 |
| "라벨 크기가 안 바뀜" | QUICK_START.md | Issue #2 |
| "다중 선택이 안 됨" | QUICK_START.md | Issue #3 |
| "클릭이 안 됨" | QUICK_START.md | Issue #4 |
| "연결선이 떨어짐" | DEVELOPMENT_HISTORY.md | Commit e60c267 |
| "미니맵 위치" | DEVELOPMENT_HISTORY.md | Commit 13be46b |
| "Smart Edge" | DEVELOPMENT_HISTORY.md | DO NOT DO #1 |

---

## ⚡ Emergency Quick Reference

### If Arrow Direction is Wrong
```typescript
// Check ALL 6 places have this:
orient: 'auto-start-reverse' as const
```

### If Label Size Doesn't Change
```typescript
// FlowWrapper must have:
useEffect(() => {
  document.body.style.setProperty('--zoom-scale', scale.toString())
}, [scale])

// global.css must have:
.tds-edge-label {
  font-size: clamp(12px, calc(12px + (var(--zoom-scale, 1) - 1) * 8px), 24px) !important;
}
```

### If Multi-Selection Fails
```typescript
selectionOnDrag={true}
selectionKeyCode={null}
multiSelectionKeyCode="Shift"
```

### If Click Doesn't Work
```css
.react-flow__handle { pointer-events: none; }
.react-flow__node:hover .react-flow__handle { pointer-events: all; }
```
```typescript
defaultEdgeOptions.style.pointerEvents = 'visibleStroke'
```

---

## 📝 Communication with User

### User's Style
- ✅ Provides exact requirements in Korean
- ✅ Uses "토씨 하나 바꾸지 않고" (verbatim)
- ✅ Specifies exact pixel values
- ✅ Requests "프리즈" (freeze) for code sections
- ✅ Wants root cause analysis

### Response Pattern
1. Acknowledge requirements verbatim
2. Create TODO list (TodoWrite tool)
3. Perform root cause analysis
4. Implement fixes
5. Build and verify
6. Commit with detailed message
7. Report completion

---

## 🔍 Testing Procedure

After ANY modification, test these:

```bash
# 1. Build
npm run build

# 2. Visual checks (if running dev server)
# - 화살표 방향 (vertical edges especially)
# - 라벨 크기 변화 (zoom in/out)
# - 다중 선택 (Shift+click, drag)
# - 노드 클릭 (no intermittent failures)
# - 연결선 갭 (perfectly attached)
# - UI positions (MiniMap, Controls, Zoom)
```

---

## 🎓 Key Learnings from This Session

1. **Portal CSS Variables**
   - Problem: EdgeLabelRenderer doesn't inherit container CSS vars
   - Solution: Inject to document.body

2. **Marker Orientation**
   - Problem: 'auto' sometimes defaults to 0deg (right)
   - Solution: Always use 'auto-start-reverse'

3. **Selection Conflicts**
   - Problem: selectionKeyCode interferes with drag selection
   - Solution: Set to null for drag-to-select

4. **Pointer Events**
   - Problem: Invisible handles/edges block node clicks
   - Solution: Conditional pointer-events

5. **Over-Optimization is Evil**
   - Smart routing → Native step edge
   - CSS calculations → Hardcoded pixels
   - SVG defs → Direct objects

---

## 🚀 Next Actions

### If User Requests New Feature
1. Read QUICK_START.md for context
2. Check if it conflicts with "DO NOT DO" list
3. Plan implementation without breaking existing fixes
4. Test all 4 common issues after implementation

### If User Reports Bug
1. Check DEVELOPMENT_HISTORY.md "Repetitive Complaints"
2. Verify it's not a regression of fixed issue
3. Root cause analysis BEFORE touching code
4. Fix and test comprehensively

### If User Wants Optimization
1. **STOP** and read DEVELOPMENT_HISTORY.md
2. Hardcoded values > Smart calculations
3. Explicit settings > Implicit behaviors
4. Stability > Cleverness

---

## 📞 Quick Contact Info

### Git Info
- **Branch**: `claude/figma-flowchart-webapp-oV3V2`
- **Remote**: `origin`
- **Latest Commit**: `1f2bf6f`
- **Build**: 448.90 kB

### Files to Watch
- `src/components/FlowCanvas.tsx` (1330 lines)
- `src/components/TDSStepEdge.tsx` (110 lines)
- `src/styles/global.css` (366 lines)

---

## ✅ Handover Checklist

Before starting new work:

- [ ] Read QUICK_START.md
- [ ] Skim DEVELOPMENT_HISTORY.md
- [ ] Understand 4 critical fixes
- [ ] Know "DO NOT DO" list
- [ ] Familiar with user communication style
- [ ] Build runs successfully (`npm run build`)
- [ ] Git status clean (or only expected changes)

---

**Ready to Continue!**

모든 문서를 읽었다면 자신감 있게 작업을 시작하세요.
반복된 문제들은 이미 근본적으로 해결되었습니다.

**Good Luck! 🚀**
