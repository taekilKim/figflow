/**
 * Figma 노드 참조 정보
 */
export interface FigmaReference {
  fileKey: string;
  nodeId: string;
  nodeUrl: string;
}

/**
 * 프레임 메타데이터
 */
export interface FrameMeta {
  title: string;
  status?: 'draft' | 'review' | 'approved' | 'deprecated';
  notes?: string;
  thumbnailUrl?: string; // High-res thumbnail (scale=1)
  thumbnailUrlLowRes?: string; // Low-res thumbnail (scale=0.5) for zoomed-out view
  lastSyncedAt?: number;
  dimensions?: { width: number; height: number };
}

/**
 * 플로우차트 노드 데이터
 */
export interface FlowNodeData extends Record<string, unknown> {
  figma: FigmaReference;
  meta: FrameMeta;
}

/**
 * 엣지 소스 타입
 */
export type EdgeSourceType = 'auto' | 'manual' | 'inferred';

/**
 * 엣지 스타일
 */
export type EdgeStyle = 'solid' | 'dashed' | 'dotted';

/**
 * 화살표 방향
 */
export type ArrowType = 'none' | 'forward' | 'backward' | 'both';

/**
 * 플로우차트 엣지 데이터
 */
export interface FlowEdgeData extends Record<string, unknown> {
  sourceType: EdgeSourceType;
  label?: string;
  style?: EdgeStyle;
  arrowType?: ArrowType;
  color?: string;
}

/**
 * 엣지 프리셋
 * 🔥 arrowType 제거: 프리셋은 색상과 스타일만 변경, 화살표 방향은 보존
 */
export interface EdgePreset {
  id: string;
  name: string;
  style: EdgeStyle;
  arrowType?: ArrowType; // optional for backward compatibility
  color: string;
}

/**
 * 프로젝트 데이터 (localStorage 저장용)
 */
export interface ProjectData {
  id: string;
  name: string;
  nodes: Array<{
    id: string;
    type?: string;
    position: { x: number; y: number };
    data: FlowNodeData;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    label?: string;
    data: FlowEdgeData;
  }>;
  createdAt: number;
  updatedAt: number;
}
