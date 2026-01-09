import { Edge } from '@xyflow/react'

/**
 * uniqueEdges: Strict Singleton Strategy
 *
 * 목적: 동일한 Source-Target 쌍을 가진 엣지가 중복으로 존재하는 것을 방지
 *
 * 로직:
 * 1. 각 엣지를 "source-target" 키로 그룹화
 * 2. 동일 키를 가진 엣지가 여러 개 있을 경우, 가장 최근에 추가된 것만 유지
 * 3. Handle까지 고려한 완전한 고유성 보장
 *
 * @param edges - 필터링할 엣지 배열
 * @returns 중복이 제거된 엣지 배열
 */
export function uniqueEdges<T extends Record<string, unknown> = Record<string, unknown>>(edges: Edge<T>[]): Edge<T>[] {
  const seen = new Map<string, Edge<T>>()

  // 역순으로 순회하여 가장 최근 엣지를 우선 보존
  for (let i = edges.length - 1; i >= 0; i--) {
    const edge = edges[i]

    // 고유 키 생성: source + handle + target + handle
    // 이렇게 하면 A->B 연결이 여러 개의 핸들을 통해 이루어져도 각각 구분됨
    const key = `${edge.source}:${edge.sourceHandle || 'default'}:${edge.target}:${edge.targetHandle || 'default'}`

    // 아직 보지 못한 연결이면 추가
    if (!seen.has(key)) {
      seen.set(key, edge)
    }
  }

  // Map의 값들을 배열로 변환 (삽입 순서 유지)
  return Array.from(seen.values()).reverse()
}

/**
 * getEdgeKey: 엣지의 고유 키 생성 헬퍼
 *
 * @param edge - 키를 생성할 엣지
 * @returns 고유 키 문자열
 */
export function getEdgeKey(edge: Edge): string {
  return `${edge.source}:${edge.sourceHandle || 'default'}:${edge.target}:${edge.targetHandle || 'default'}`
}

/**
 * hasDuplicateEdge: 중복 엣지 존재 여부 확인
 *
 * @param edges - 확인할 엣지 배열
 * @param newEdge - 추가하려는 새 엣지
 * @returns 중복 존재 시 true
 */
export function hasDuplicateEdge<T extends Record<string, unknown> = Record<string, unknown>>(edges: Edge<T>[], newEdge: Edge<T>): boolean {
  const newKey = getEdgeKey(newEdge as Edge)
  return edges.some(edge => edge.id !== newEdge.id && getEdgeKey(edge as Edge) === newKey)
}
