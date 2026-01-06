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
  thumbnailUrl?: string;
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
 * 플로우차트 엣지 데이터
 */
export interface FlowEdgeData extends Record<string, unknown> {
  sourceType: EdgeSourceType;
  label?: string;
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
