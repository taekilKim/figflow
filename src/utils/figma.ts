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
