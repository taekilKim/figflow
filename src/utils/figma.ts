/**
 * Figma API 유틸리티
 */

/**
 * Token 타입에 따라 올바른 Authorization 헤더를 생성합니다
 * - Personal Access Token (figd_로 시작): X-Figma-Token 헤더 사용
 * - OAuth Access Token (그 외): Authorization: Bearer 헤더 사용
 */
function getAuthHeaders(accessToken: string): Record<string, string> {
  if (accessToken.startsWith('figd_')) {
    // Personal Access Token
    return { 'X-Figma-Token': accessToken }
  } else {
    // OAuth Access Token
    return { 'Authorization': `Bearer ${accessToken}` }
  }
}

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
  // 🔥 CRITICAL: scale=1을 사용하여 논리적 크기와 이미지 크기 일치
  // scale=2 (레티나)를 사용하면 이미지가 2배 크기로 반환되어 노드가 커지는 버그 발생
  const { fileKey, nodeIds, scale = 1, format = 'png' } = options

  try {
    const idsParam = nodeIds.join(',')
    const url = `https://api.figma.com/v1/images/${fileKey}?ids=${idsParam}&scale=${scale}&format=${format}`

    const response = await fetch(url, {
      headers: {
        ...getAuthHeaders(accessToken),
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
        ...getAuthHeaders(accessToken),
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
        ...getAuthHeaders(accessToken),
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
        ...getAuthHeaders(accessToken),
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
          headers: getAuthHeaders(accessToken),
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
 * Figma 파일 URL에서 fileKey만 추출 (node-id 없는 경우)
 */
export function parseFigmaFileUrl(url: string): { fileKey: string } | null {
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/')
    const fileKey = pathParts[2] // /file/{fileKey}/...

    if (fileKey) {
      return { fileKey }
    }
    return null
  } catch (error) {
    console.error('Failed to parse Figma file URL:', error)
    return null
  }
}

interface FigmaPage {
  id: string
  name: string
  frames: Array<{
    id: string
    name: string
    width: number
    height: number
  }>
}

/**
 * Figma 파일의 페이지와 프레임 구조를 가져옵니다
 */
export async function getFigmaFileStructure(
  accessToken: string,
  fileKey: string
): Promise<{ pages: FigmaPage[]; error?: string }> {
  try {
    console.log('[FigFlow] Fetching Figma file:', fileKey)
    console.log('[FigFlow] Access token:', accessToken ? `${accessToken.substring(0, 10)}...` : 'missing')

    const url = `https://api.figma.com/v1/files/${fileKey}`
    const response = await fetch(url, {
      headers: getAuthHeaders(accessToken),
    })

    console.log('[FigFlow] Figma API response:', response.status)

    if (!response.ok) {
      let errorMsg = `API Error: ${response.status}`

      if (response.status === 403) {
        errorMsg = '접근 권한이 없습니다. 본인의 Figma 파일이거나 접근 권한이 있는 파일인지 확인해주세요.'
      } else if (response.status === 404) {
        errorMsg = 'Figma 파일을 찾을 수 없습니다. URL을 확인해주세요.'
      } else if (response.status === 401) {
        errorMsg = '인증이 필요합니다. 다시 로그인해주세요.'
      }

      return { pages: [], error: errorMsg }
    }

    const data = await response.json()
    const pages: FigmaPage[] = []

    // 문서의 각 페이지 순회
    if (data.document && data.document.children) {
      for (const page of data.document.children) {
        if (page.type === 'CANVAS') {
          const frames: FigmaPage['frames'] = []

          // 페이지의 각 프레임 수집
          if (page.children) {
            for (const child of page.children) {
              if (child.type === 'FRAME' && child.absoluteBoundingBox) {
                frames.push({
                  id: child.id,
                  name: child.name,
                  width: Math.round(child.absoluteBoundingBox.width),
                  height: Math.round(child.absoluteBoundingBox.height),
                })
              }
            }
          }

          pages.push({
            id: page.id,
            name: page.name,
            frames,
          })
        }
      }
    }

    return { pages }
  } catch (error) {
    return {
      pages: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Figma access token을 localStorage에 저장/불러오기
 */
const FIGMA_TOKEN_KEY = 'figflow_figma_token'

export function saveFigmaToken(token: string): void {
  console.log('[FigFlow] Saving Figma token:', token ? `${token.substring(0, 10)}...` : 'empty')
  localStorage.setItem(FIGMA_TOKEN_KEY, token)
  console.log('[FigFlow] Token saved successfully')
}

export function getFigmaToken(): string | null {
  return localStorage.getItem(FIGMA_TOKEN_KEY)
}

export function clearFigmaToken(): void {
  localStorage.removeItem(FIGMA_TOKEN_KEY)
}

/**
 * Figma 사용자 정보 타입
 */
export interface FigmaUser {
  id: string
  handle: string
  img_url: string
  email: string
}

/**
 * 현재 인증된 Figma 사용자 정보를 가져옵니다
 * https://www.figma.com/developers/api#users-endpoints
 */
export async function getFigmaUser(accessToken: string): Promise<FigmaUser | null> {
  try {
    const url = 'https://api.figma.com/v1/me'

    const response = await fetch(url, {
      headers: {
        ...getAuthHeaders(accessToken),
      },
    })

    if (!response.ok) {
      console.error('Failed to fetch Figma user:', response.status, response.statusText)
      return null
    }

    const data = await response.json()

    return {
      id: data.id,
      handle: data.handle,
      img_url: data.img_url,
      email: data.email,
    }
  } catch (error) {
    console.error('Failed to fetch Figma user:', error)
    return null
  }
}
