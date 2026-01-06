import { useState } from 'react'
import { parseFigmaFileUrl, getFigmaFileStructure, getFigmaToken } from '../utils/figma'
import '../styles/FigmaFileImportDialog.css'

interface FigmaFileImportDialogProps {
  isOpen: boolean
  onClose: () => void
  onImport: (fileKey: string, selectedFrames: Array<{ nodeId: string; name: string; width: number; height: number }>) => void
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

function FigmaFileImportDialog({ isOpen, onClose, onImport }: FigmaFileImportDialogProps) {
  const [fileUrl, setFileUrl] = useState('')
  const [fileKey, setFileKey] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pages, setPages] = useState<FigmaPage[]>([])
  const [selectedFrames, setSelectedFrames] = useState<Set<string>>(new Set())
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set())

  const handleFetchFile = async () => {
    setError(null)
    setPages([])
    setSelectedFrames(new Set())
    setFileKey(null)

    const accessToken = getFigmaToken()
    if (!accessToken) {
      setError('Figma Access Token이 설정되지 않았습니다.')
      return
    }

    const parsed = parseFigmaFileUrl(fileUrl)
    if (!parsed) {
      setError('올바른 Figma 파일 URL을 입력해주세요.')
      return
    }

    setLoading(true)
    try {
      const result = await getFigmaFileStructure(accessToken, parsed.fileKey)

      if (result.error) {
        setError(result.error)
      } else if (result.pages.length === 0) {
        setError('프레임을 찾을 수 없습니다.')
      } else {
        setFileKey(parsed.fileKey)
        setPages(result.pages)
        // 기본적으로 모든 페이지 펼치기
        setExpandedPages(new Set(result.pages.map(p => p.id)))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '파일을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const togglePage = (pageId: string) => {
    const newExpanded = new Set(expandedPages)
    if (newExpanded.has(pageId)) {
      newExpanded.delete(pageId)
    } else {
      newExpanded.add(pageId)
    }
    setExpandedPages(newExpanded)
  }

  const toggleFrame = (frameId: string) => {
    const newSelected = new Set(selectedFrames)
    if (newSelected.has(frameId)) {
      newSelected.delete(frameId)
    } else {
      newSelected.add(frameId)
    }
    setSelectedFrames(newSelected)
  }

  const togglePageFrames = (_pageId: string, allFrameIds: string[]) => {
    const newSelected = new Set(selectedFrames)
    const allSelected = allFrameIds.every(id => newSelected.has(id))

    if (allSelected) {
      // 모두 선택되어 있으면 모두 해제
      allFrameIds.forEach(id => newSelected.delete(id))
    } else {
      // 하나라도 선택 안 되어 있으면 모두 선택
      allFrameIds.forEach(id => newSelected.add(id))
    }
    setSelectedFrames(newSelected)
  }

  const handleImport = () => {
    if (!fileKey) {
      setError('파일 키를 찾을 수 없습니다.')
      return
    }

    const framesToImport = pages.flatMap(page =>
      page.frames
        .filter(frame => selectedFrames.has(frame.id))
        .map(frame => ({
          nodeId: frame.id,
          name: frame.name,
          width: frame.width,
          height: frame.height,
        }))
    )

    if (framesToImport.length === 0) {
      setError('가져올 프레임을 선택해주세요.')
      return
    }

    onImport(fileKey, framesToImport)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-content file-import-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>Figma 파일 가져오기</h2>
          <button className="dialog-close" onClick={onClose}>×</button>
        </div>

        <div className="dialog-body">
          <div className="url-input-section">
            <label>Figma 파일 URL</label>
            <div className="url-input-group">
              <input
                type="text"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                placeholder="https://www.figma.com/file/..."
                className="url-input"
              />
              <button
                onClick={handleFetchFile}
                disabled={loading || !fileUrl}
                className="btn-fetch"
              >
                {loading ? '로딩 중...' : '불러오기'}
              </button>
            </div>
          </div>

          {error && (
            <div className="error-message">{error}</div>
          )}

          {pages.length > 0 && (
            <div className="pages-section">
              <div className="pages-header">
                <h3>페이지 및 프레임 선택</h3>
                <div className="selection-info">
                  {selectedFrames.size}개 선택됨
                </div>
              </div>

              <div className="pages-list">
                {pages.map(page => {
                  const pageFrameIds = page.frames.map(f => f.id)
                  const allPageFramesSelected = pageFrameIds.length > 0 &&
                    pageFrameIds.every(id => selectedFrames.has(id))
                  const somePageFramesSelected = pageFrameIds.some(id => selectedFrames.has(id))
                  const isExpanded = expandedPages.has(page.id)

                  return (
                    <div key={page.id} className="page-item">
                      <div className="page-header">
                        <button
                          className="page-toggle"
                          onClick={() => togglePage(page.id)}
                        >
                          {isExpanded ? '▼' : '▶'}
                        </button>
                        <input
                          type="checkbox"
                          checked={allPageFramesSelected}
                          ref={input => {
                            if (input) {
                              input.indeterminate = somePageFramesSelected && !allPageFramesSelected
                            }
                          }}
                          onChange={() => togglePageFrames(page.id, pageFrameIds)}
                          className="page-checkbox"
                        />
                        <span className="page-name">{page.name}</span>
                        <span className="frame-count-badge">
                          {page.frames.length}개 프레임
                        </span>
                      </div>

                      {isExpanded && (
                        <div className="frames-list">
                          {page.frames.map(frame => (
                            <div key={frame.id} className="frame-item-checkbox">
                              <input
                                type="checkbox"
                                checked={selectedFrames.has(frame.id)}
                                onChange={() => toggleFrame(frame.id)}
                                id={`frame-${frame.id}`}
                              />
                              <label htmlFor={`frame-${frame.id}`}>
                                <span className="frame-name">{frame.name}</span>
                                <span className="frame-dimensions">
                                  {frame.width} × {frame.height}
                                </span>
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="dialog-footer">
          <button onClick={onClose} className="btn-cancel">
            취소
          </button>
          <button
            onClick={handleImport}
            disabled={selectedFrames.size === 0}
            className="btn-import"
          >
            선택한 프레임 가져오기 ({selectedFrames.size})
          </button>
        </div>
      </div>
    </div>
  )
}

export default FigmaFileImportDialog
