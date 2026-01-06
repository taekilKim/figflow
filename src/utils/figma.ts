/**
 * Figma API 유틸리티
 */

export interface FigmaImageOptions {
  fileKey: string
  nodeIds: string[]
  scale?: number
  format?: 'png' | 'jpg' | 'svg'
}

export interface FigmaImageResult {
  nodeId: string
  imageUrl: string | null
  error?: string
}

/**
 * Figma Images API를 통해 노드 이미지 URL을 가져옵니다
 * https://www.figma.com/developers/api#get-images-endpoint
 */
export async function getFigmaImages(
  accessToken: string,
  options: FigmaImageOptions
): Promise<FigmaImageResult[]> {
  const { fileKey, nodeIds, scale = 2, format = 'png' } = options

  try {
    const idsParam = nodeIds.join(',')
    const url = `https://api.figma.com/v1/images/${fileKey}?ids=${idsParam}&scale=${scale}&format=${format}`

    const response = await fetch(url, {
      headers: {
        'X-Figma-Token': accessToken,
      },
    })

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.err) {
      throw new Error(data.err)
    }

    // 결과 매핑
    return nodeIds.map((nodeId) => ({
      nodeId,
      imageUrl: data.images[nodeId] || null,
      error: data.images[nodeId] ? undefined : 'Image not found',
    }))
  } catch (error) {
    console.error('Failed to fetch Figma images:', error)
    return nodeIds.map((nodeId) => ({
      nodeId,
      imageUrl: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }))
  }
}

/**
 * Figma 파일 정보를 가져옵니다
 */
export async function getFigmaFile(accessToken: string, fileKey: string) {
  try {
    const url = `https://api.figma.com/v1/files/${fileKey}`

    const response = await fetch(url, {
      headers: {
        'X-Figma-Token': accessToken,
      },
    })

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Failed to fetch Figma file:', error)
    throw error
  }
}

/**
 * Figma 파일에서 특정 노드의 이름을 가져옵니다
 */
export async function getFigmaNodeName(
  accessToken: string,
  fileKey: string,
  nodeId: string
): Promise<string | null> {
  try {
    const url = `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${nodeId}`

    const response = await fetch(url, {
      headers: {
        'X-Figma-Token': accessToken,
      },
    })

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const node = data.nodes?.[nodeId]?.document

    return node?.name || null
  } catch (error) {
    console.error('Failed to fetch Figma node name:', error)
    return null
  }
}

/**
 * Figma 노드의 실제 크기를 가져옵니다
 */
export async function getFigmaNodeDimensions(
  accessToken: string,
  fileKey: string,
  nodeId: string
): Promise<{ width: number; height: number } | null> {
  try {
    const url = `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${nodeId}`

    const response = await fetch(url, {
      headers: {
        'X-Figma-Token': accessToken,
      },
    })

    if (!response.ok) {
      throw new Error(`Figma API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const node = data.nodes?.[nodeId]?.document
    const bounds = node?.absoluteBoundingBox

    if (!bounds) {
      return null
    }

    return {
      width: bounds.width,
      height: bounds.height,
    }
  } catch (error) {
    console.error('Failed to fetch Figma node dimensions:', error)
    return null
  }
}

/**
 * 프레임의 전체 정보를 한 번에 가져옵니다 (이름 + 썸네일 + 크기)
 */
export async function getFigmaFrameInfo(
  accessToken: string,
  fileKey: string,
  nodeId: string
): Promise<{
  name: string | null
  thumbnailUrl: string | null
  dimensions: { width: number; height: number } | null
  error?: string
}> {
  try {
    // 병렬로 이름+크기와 이미지 가져오기
    const [nodeInfo, imageResult] = await Promise.all([
      (async () => {
        const url = `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${nodeId}`
        const response = await fetch(url, {
          headers: { 'X-Figma-Token': accessToken },
        })
        if (!response.ok) return null
        const data = await response.json()
        const node = data.nodes?.[nodeId]?.document
        return {
          name: node?.name || null,
          dimensions: node?.absoluteBoundingBox
            ? { width: node.absoluteBoundingBox.width, height: node.absoluteBoundingBox.height }
            : null,
        }
      })(),
      getFigmaImages(accessToken, { fileKey, nodeIds: [nodeId] }),
    ])

    return {
      name: nodeInfo?.name || null,
      thumbnailUrl: imageResult[0]?.imageUrl || null,
      dimensions: nodeInfo?.dimensions || null,
      error: imageResult[0]?.error,
    }
  } catch (error) {
    return {
      name: null,
      thumbnailUrl: null,
      dimensions: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Figma 노드 URL에서 fileKey와 nodeId를 추출합니다
 * 예: https://www.figma.com/file/ABC123/MyFile?node-id=1-2
 */
export function parseFigmaUrl(url: string): { fileKey: string; nodeId: string } | null {
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/')
    const fileKey = pathParts[2] // /file/{fileKey}/...

    // node-id를 쿼리 파라미터에서 추출
    const nodeIdParam = urlObj.searchParams.get('node-id')
    if (!nodeIdParam) {
      return null
    }

    // node-id 형식: "1-2" -> "1:2"
    const nodeId = nodeIdParam.replace(/-/g, ':')

    return { fileKey, nodeId }
  } catch (error) {
    console.error('Failed to parse Figma URL:', error)
    return null
  }
}

/**
 * Figma access token을 localStorage에 저장/불러오기
 */
const FIGMA_TOKEN_KEY = 'figflow_figma_token'

export function saveFigmaToken(token: string): void {
  localStorage.setItem(FIGMA_TOKEN_KEY, token)
}

export function getFigmaToken(): string | null {
  return localStorage.getItem(FIGMA_TOKEN_KEY)
}

export function clearFigmaToken(): void {
  localStorage.removeItem(FIGMA_TOKEN_KEY)
}
