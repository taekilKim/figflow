import { useState, FormEvent } from 'react'
import { parseFigmaUrl, getFigmaFrameInfo, getFigmaToken } from '../utils/figma'
import '../styles/AddFrameDialog.css'

interface AddFrameDialogProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (frameData: {
    fileKey: string
    nodeId: string
    nodeUrl: string
    title: string
    thumbnailUrl: string | null
  }) => void
}

function AddFrameDialog({ isOpen, onClose, onAdd }: AddFrameDialogProps) {
  const [figmaUrl, setFigmaUrl] = useState('')
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [previewData, setPreviewData] = useState<{
    name: string | null
    thumbnailUrl: string | null
  } | null>(null)

  const handleUrlBlur = async () => {
    if (!figmaUrl) {
      setPreviewData(null)
      return
    }

    setError('')
    setIsLoading(true)

    try {
      // URL 파싱
      const parsed = parseFigmaUrl(figmaUrl)
      if (!parsed) {
        setError('올바른 Figma URL을 입력해주세요.')
        setIsLoading(false)
        return
      }

      // Figma Token 확인
      const token = getFigmaToken()
      if (!token) {
        setError('Figma Access Token이 필요합니다. 먼저 "Sync" 버튼을 클릭하여 토큰을 입력해주세요.')
        setIsLoading(false)
        return
      }

      // 프레임 정보 가져오기
      const frameInfo = await getFigmaFrameInfo(token, parsed.fileKey, parsed.nodeId)

      if (frameInfo.error) {
        setError(`프레임 정보를 가져올 수 없습니다: ${frameInfo.error}`)
        setIsLoading(false)
        return
      }

      // 미리보기 데이터 설정
      setPreviewData({
        name: frameInfo.name,
        thumbnailUrl: frameInfo.thumbnailUrl,
      })

      // 프레임 이름 자동 채우기
      if (frameInfo.name && !title) {
        setTitle(frameInfo.name)
      }
    } catch (err) {
      setError('프레임 정보를 가져오는 중 오류가 발생했습니다.')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')

    // URL 파싱
    const parsed = parseFigmaUrl(figmaUrl)
    if (!parsed) {
      setError('올바른 Figma URL을 입력해주세요.')
      return
    }

    // 썸네일이 없으면 경고
    if (!previewData?.thumbnailUrl) {
      setError('썸네일을 불러올 수 없습니다. URL을 확인하거나 Figma Token을 다시 설정해주세요.')
      return
    }

    // 프레임 추가
    onAdd({
      fileKey: parsed.fileKey,
      nodeId: parsed.nodeId,
      nodeUrl: figmaUrl,
      title: title || previewData.name || 'New Frame',
      thumbnailUrl: previewData.thumbnailUrl,
    })

    // 폼 초기화
    setFigmaUrl('')
    setTitle('')
    setPreviewData(null)
    onClose()
  }

  const handleClose = () => {
    setFigmaUrl('')
    setTitle('')
    setError('')
    setPreviewData(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Figma 프레임 추가</h2>
          <button className="modal-close" onClick={handleClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="figmaUrl">Figma URL *</label>
            <input
              id="figmaUrl"
              type="text"
              value={figmaUrl}
              onChange={(e) => setFigmaUrl(e.target.value)}
              onBlur={handleUrlBlur}
              placeholder="https://www.figma.com/file/ABC123/MyFile?node-id=123-456"
              required
              disabled={isLoading}
            />
            <p className="form-hint">
              Figma에서 프레임을 선택하고 우클릭 → "Copy link to selection" 클릭
            </p>
          </div>

          {isLoading && (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>프레임 정보를 불러오는 중...</p>
            </div>
          )}

          {previewData && !isLoading && (
            <div className="preview-section">
              <h3>미리보기</h3>
              {previewData.thumbnailUrl ? (
                <div className="preview-thumbnail">
                  <img src={previewData.thumbnailUrl} alt="Frame preview" />
                </div>
              ) : (
                <div className="preview-placeholder">
                  <p>썸네일을 불러올 수 없습니다</p>
                </div>
              )}
              {previewData.name && (
                <p className="preview-name">프레임 이름: <strong>{previewData.name}</strong></p>
              )}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="title">프레임 제목 *</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={previewData?.name || "예: 로그인 화면"}
              required
              disabled={isLoading}
            />
            <p className="form-hint">
              {previewData?.name ? '자동으로 불러온 이름을 수정할 수 있습니다' : '프레임 제목을 입력하세요'}
            </p>
          </div>

          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={handleClose}>
              취소
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading || !previewData?.thumbnailUrl}
            >
              추가하기
            </button>
          </div>
        </form>

        <div className="modal-help">
          <h3>💡 사용 방법</h3>
          <ol>
            <li>먼저 상단 "Sync" 버튼으로 Figma Token 입력 (한 번만)</li>
            <li>Figma에서 프레임 선택 → 우클릭 → "Copy link to selection"</li>
            <li>위 URL 입력란에 붙여넣기</li>
            <li>자동으로 프레임 이름과 썸네일이 표시됩니다</li>
            <li>"추가하기" 클릭!</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

export default AddFrameDialog
