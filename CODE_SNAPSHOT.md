# FigFlow - Code Snapshot (v1.0)

**Date**: 2026-01-09 | **Commit**: `1f2bf6f`

이 문서는 현재 코드의 핵심 부분을 스냅샷으로 저장합니다.

---

## 📌 Core Configuration

### Package Dependencies (package.json)
```json
{
  "dependencies": {
    "@phosphor-icons/react": "^2.1.7",
    "@xyflow/react": "^12.3.5",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  }
}
```

### Build Output
- **Size**: 448.90 kB (gzipped: 141.19 kB)
- **Assets**: index.html, index-M1lkJpln.css, index-dmgB26wX.js

---

## 🔧 FlowCanvas.tsx - Critical Sections

### 1. Imports & Types
```typescript
import {
  ReactFlow,
  MarkerType,
  SelectionMode,
  ConnectionLineType,
  // ... other imports
} from '@xyflow/react'

interface FlowCanvasProps {
  onNodeSelect: (nodeId: string | null) => void
  onEdgeSelect: (edgeId: string | null) => void
  onSelectionChange?: (nodeIds: string[]) => void
}
```

### 2. Edge Types Registration
```typescript
const edgeTypes = {
  step: TDSStepEdge,
}

const nodeTypes = {
  frameNode: FrameNode,
}
```

### 3. FlowWrapper - CSS Variable Injection
```typescript
const FlowWrapper = ({ children, isPanning }) => {
  const { zoom } = useViewport()
  const scale = zoom < 1 ? (1 / zoom) : 1

  // 🔥 CRITICAL: Portal 내부에서도 CSS 변수 사용 가능하도록
  useEffect(() => {
    document.body.style.setProperty('--zoom-scale', scale.toString())
  }, [scale])

  return (
    <div
      className={`flow-canvas ${isPanning ? 'panning' : ''}`}
      style={{
        width: '100%',
        height: '100%',
        '--zoom-scale': scale
      } as React.CSSProperties}
    >
      {children}
    </div>
  )
}
```

### 4. Marker Generation Functions
```typescript
const getMarkerEnd = (edgeData?: FlowEdgeData, strokeColor?: string) => {
  const arrowType = edgeData?.arrowType || 'forward'
  if (arrowType === 'forward' || arrowType === 'both') {
    return {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: strokeColor || edgeData?.color || '#555555',
      orient: 'auto-start-reverse' as const,  // 🔥 CRITICAL
    }
  }
  return undefined
}

const getMarkerStart = (edgeData?: FlowEdgeData, strokeColor?: string) => {
  const arrowType = edgeData?.arrowType || 'forward'
  if (arrowType === 'backward' || arrowType === 'both') {
    return {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: strokeColor || edgeData?.color || '#555555',
      orient: 'auto-start-reverse' as const,  // 🔥 CRITICAL
    }
  }
  return undefined
}
```

### 5. Edge Style Function
```typescript
const getEdgeStyle = (edgeData?: FlowEdgeData) => {
  const style: React.CSSProperties = {}

  if (edgeData?.color) {
    style.stroke = edgeData.color
  }

  if (edgeData?.style === 'dashed') {
    style.strokeDasharray = '10,10'
  } else if (edgeData?.style === 'dotted') {
    style.strokeDasharray = '2,4'
  }

  return style
}
```

### 6. ReactFlow Props (Main Configuration)
```typescript
<ReactFlow
  nodes={nodes.map((node) => ({
    ...node,
    className: connectingNodeId.current && connectingNodeId.current !== node.id
      ? 'connection-target'
      : '',
  }))}
  edges={edges.map((edge) => {
    const style = getEdgeStyle(edge.data)
    const strokeColor = style.stroke as string | undefined
    return {
      ...edge,
      type: 'step',
      updatable: 'target',
      style,
      markerEnd: getMarkerEnd(edge.data, strokeColor),
      markerStart: getMarkerStart(edge.data, strokeColor),
    } as Edge<FlowEdgeData>
  })}

  // Event Handlers
  onNodesChange={onNodesChange}
  onEdgesChange={onEdgesChange}
  onConnect={onConnect}
  onConnectStart={onConnectStart}
  onConnectEnd={onConnectEnd}
  onReconnect={onReconnect}
  onReconnectEnd={onReconnectEnd}
  onNodeClick={onNodeClick}
  onEdgeClick={onEdgeClick}
  onPaneClick={onPaneClick}

  // Types
  nodeTypes={nodeTypes}
  edgeTypes={edgeTypes}

  // Connection
  connectionLineType={ConnectionLineType.Step}
  defaultEdgeOptions={{
    type: 'step',
    animated: false,
    focusable: true,
    style: {
      strokeWidth: 2,
      stroke: '#555555',
      pointerEvents: 'visibleStroke' as any,  // 🔥 CRITICAL
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: '#555555',
      orient: 'auto-start-reverse' as const,  // 🔥 CRITICAL
    },
    data: {
      sourceType: 'manual' as const,
    }
  }}

  // Interaction
  edgesReconnectable={true}
  reconnectRadius={30}
  panOnDrag={isPanning}
  selectionOnDrag={true}              // 🔥 CRITICAL
  panOnScroll={true}
  selectionMode={SelectionMode.Partial}
  selectionKeyCode={null}             // 🔥 CRITICAL
  multiSelectionKeyCode="Shift"       // 🔥 CRITICAL
  connectOnClick={false}
  deleteKeyCode="Delete"

  // View
  fitView
  minZoom={0.1}
  maxZoom={2}
  style={{
    cursor: isPanning ? 'grab' : 'default',
  }}
>
  {/* Children components */}
</ReactFlow>
```

### 7. UI Components Layout
```typescript
{/* TDSControls - HARDCODED */}
<TDSControls style={{ left: 312, bottom: 16 }} />

{/* MiniMap - HARDCODED */}
<MiniMap
  nodeColor="#e2e2e2"
  maskColor="rgba(240, 240, 240, 0.6)"
  nodeStrokeWidth={3}
  zoomable
  pannable
  style={{
    position: 'absolute',
    height: 120,
    width: 200,
    bottom: 16,
    right: 352,
    margin: 0,
    border: '1px solid #E5E8EB',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
    zIndex: 5,
  }}
/>

{/* ZoomIndicator - INDEPENDENT (not MiniMap child) */}
<div style={{
  position: 'absolute',
  top: 'auto',
  bottom: 16 + 120 - 8 - 20,  // 108px
  right: 352 + 8,              // 360px
  zIndex: 6,
}}>
  <ZoomIndicator />
</div>
```

---

## 🎨 TDSStepEdge.tsx - Complete Component

```typescript
import { memo } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getSmoothStepPath,
} from '@xyflow/react'

function TDSStepEdge(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    markerStart,
    label,
  } = props

  // 🔥 CRITICAL: Zero Gap, Sharp Corners
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 0,  // 완전한 직각
    offset: 0,        // 갭 제거
  })

  // Label color logic
  const edgeColor = style?.stroke as string | undefined
  const isDefaultColor = !edgeColor || edgeColor === '#555555' || edgeColor === '#555'
  const labelBg = isDefaultColor ? '#FFFFFF' : edgeColor
  const labelColor = isDefaultColor ? '#333D4B' : '#FFFFFF'
  const labelBorder = isDefaultColor ? '1px solid #E5E8EB' : 'none'

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        markerStart={markerStart}
        style={style}
      />

      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              transformOrigin: 'center',
              pointerEvents: 'all',
              zIndex: 1000,
            }}
            className="nodrag nopan"
          >
            <div
              className="tds-edge-label"  // 🔥 CRITICAL: className for CSS
              style={{
                backgroundColor: labelBg,
                color: labelColor,
                border: labelBorder,
                padding: '4px 8px',
                borderRadius: '6px',
                fontWeight: 600,
                letterSpacing: 0,
                fontFamily: "'Pretendard Variable', Pretendard, sans-serif",
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                // 🔥 NO fontSize inline style (use CSS class)
              }}
            >
              {label}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

export default memo(TDSStepEdge)
```

---

## 🎨 global.css - Critical Sections

### 1. TDS Reset
```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  letter-spacing: 0 !important;  /* 🔥 TDS 전역 강제 */
}

body {
  font-family: "Pretendard Variable", Pretendard, ...;
  letter-spacing: 0 !important;
}
```

### 2. Dynamic Edge Label
```css
/* 🔥 CRITICAL: Portal 내부에서 동적 폰트 사이즈 */
.tds-edge-label {
  font-family: 'Pretendard Variable', Pretendard, sans-serif !important;
  font-weight: 600 !important;
  font-size: clamp(12px, calc(12px + (var(--zoom-scale, 1) - 1) * 8px), 24px) !important;
  line-height: 1.4 !important;
  letter-spacing: 0 !important;
  white-space: nowrap;
}
```

### 3. Node Handles
```css
.react-flow__handle {
  width: calc(10px * var(--zoom-scale, 1)) !important;
  height: calc(10px * var(--zoom-scale, 1)) !important;
  min-width: 8px !important;
  min-height: 8px !important;
  background: #3182F6 !important;
  border: 2px solid #fff !important;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  z-index: 99999 !important;
  opacity: 0;
  transition: opacity 0.1s;
  cursor: crosshair !important;
  pointer-events: none;  /* 🔥 CRITICAL: 숨겨진 핸들 클릭 방해 방지 */
}

/* 🔥 CRITICAL: 보일 때만 클릭 가능 */
.react-flow__node:hover .react-flow__handle,
.react-flow__node.selected .react-flow__handle,
.react-flow__node.connection-target .react-flow__handle {
  opacity: 1;
  pointer-events: all;
}
```

### 4. Zoom Indicator
```css
.zoom-indicator {
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(255, 255, 255, 0.9);
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #333;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 5;
  pointer-events: none;
}
```

---

## 📊 Data Flow

### Edge Creation Points (6 places)
1. `initialEdges` (line 107-150)
2. `loadedEdges` mapping (line 368-380)
3. `onConnect` callback (line 594-613)
4. `onConnectEnd` callback (line 651-710)
5. `edges.map()` in ReactFlow (line 1178-1189)
6. `defaultEdgeOptions` (line 1203-1222)

### All 6 Must Have
```typescript
{
  type: 'step',
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 20,
    height: 20,
    color: strokeColor || '#555555',
    orient: 'auto-start-reverse' as const,  // 필수!
  },
  data: { sourceType: 'manual' },
}
```

---

## 🔍 localStorage Schema

```typescript
interface Project {
  id: string
  name: string
  nodes: Array<{
    id: string
    type: string
    position: { x: number; y: number }
    data: FlowNodeData
  }>
  edges: Array<{
    id: string
    source: string
    target: string
    sourceHandle?: string
    targetHandle?: string
    label?: string
    data: FlowEdgeData
  }>
  createdAt: number
  updatedAt: number
}
```

---

## 🎯 Key Event Handlers

### onConnect
```typescript
const onConnect = useCallback((connection: Connection) => {
  const newEdge: Edge<FlowEdgeData> = {
    ...connection,
    id: `e${connection.source}-${connection.target}`,
    type: 'step',
    markerEnd: { /* marker object */ },
    data: { sourceType: 'manual' },
  }
  setEdges((eds) => addEdge(newEdge, eds))
}, [setEdges])
```

### onConnectEnd (Figma-like anywhere connection)
```typescript
const onConnectEnd: OnConnectEnd = useCallback((event, connectionState) => {
  if (!connectingNodeId.current || connectionState.isValid) return

  const clientX = (event as MouseEvent).clientX
  const elements = document.elementsFromPoint(clientX, clientY)
  const nodeElement = elements.find(el => el.classList.contains('react-flow__node'))

  if (nodeElement) {
    const targetNodeId = nodeElement.getAttribute('data-id')
    // Create edge with closest handles...
  }
}, [nodes, setEdges, getClosestHandles])
```

### Keyboard Shortcuts
```typescript
// Ctrl+1: 100% ↔ Fit View Toggle
if (event.key === '1') {
  const zoom = matrix.a
  if (Math.abs(zoom - 1) < 0.01) {
    fitView({ padding: 0.2, duration: 800 })
  } else {
    zoomTo(1, { duration: 800 })
  }
}

// Ctrl+2: Fit Selected Nodes
if (event.key === '2') {
  const selectedNodes = getNodes().filter(n => n.selected)
  if (selectedNodes.length > 0) {
    fitView({ nodes: selectedNodes, padding: 0.2, duration: 800 })
  }
}
```

---

**End of Code Snapshot**

이 문서는 코드의 현재 상태를 스냅샷으로 보존합니다.
변경 사항이 있을 때마다 업데이트하세요.
