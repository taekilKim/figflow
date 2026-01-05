import { useState, FormEvent } from 'react'
import { parseFigmaUrl } from '../utils/figma'
import '../styles/AddFrameDialog.css'

interface AddFrameDialogProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (frameData: {
    fileKey: string
    nodeId: string
    nodeUrl: string
    title: string
  }) => void
}

function AddFrameDialog({ isOpen, onClose, onAdd }: AddFrameDialogProps) {
  const [figmaUrl, setFigmaUrl] = useState('')
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError('')

    // Figma URL 파싱
    const parsed = parseFigmaUrl(figmaUrl)

    if (!parsed) {
      setError('올바른 Figma URL을 입력해주세요. 예: https://www.figma.com/file/ABC123/MyFile?node-id=123-456')
      return
    }

    // 프레임 추가
    onAdd({
      fileKey: parsed.fileKey,
      nodeId: parsed.nodeId,
      nodeUrl: figmaUrl,
      title: title || 'New Frame',
    })

    // 폼 초기화
    setFigmaUrl('')
    setTitle('')
    onClose()
  }

  const handleClose = () => {
    setFigmaUrl('')
    setTitle('')
    setError('')
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
              placeholder="https://www.figma.com/file/ABC123/MyFile?node-id=123-456"
              required
            />
            <p className="form-hint">
              Figma에서 프레임을 선택하고 우클릭 → "Copy link to selection" 클릭
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="title">프레임 제목 *</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 로그인 화면"
              required
            />
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
            <button type="submit" className="btn-primary">
              추가하기
            </button>
          </div>
        </form>

        <div className="modal-help">
          <h3>💡 Figma URL 찾는 방법</h3>
          <ol>
            <li>Figma에서 추가하려는 프레임 선택</li>
            <li>프레임에 우클릭</li>
            <li>"Copy link to selection" 클릭</li>
            <li>여기에 붙여넣기</li>
          </ol>

          <h3>📝 URL 형식</h3>
          <code>https://www.figma.com/file/[FILE_KEY]/[NAME]?node-id=[NODE_ID]</code>
        </div>
      </div>
    </div>
  )
}

export default AddFrameDialog
