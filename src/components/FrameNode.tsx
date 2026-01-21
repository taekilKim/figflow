import { memo } from 'react'
import { Handle, Position, NodeProps, useViewport } from '@xyflow/react'
import { FlowNodeData } from '../types'
import '../styles/FrameNode.css'

function FrameNode({ data, selected }: NodeProps) {
  const { figma, meta } = data as FlowNodeData

  // 🔥 LOD (Level of Detail): 줌 레벨에 따라 디테일 조정
  const { zoom } = useViewport()
  const showDetails = zoom > 0.5  // 50% 이하로 줌 아웃하면 디테일 숨김 (메모리 절약)

  return (
    <div
      className={`frame-node ${selected ? 'selected' : ''}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
      }}
    >
      {/* Header Area: 폰트가 커져도 프레임을 밀어내지 않도록 absolute 배치 */}
      <div
        style={{
          position: 'absolute',
          top: -40, // 여유 있게 위로 배치
          left: 0,
          width: '200%', // 🔥 중요: 폰트가 커졌을 때 잘리지 않도록 너비를 프레임의 2배로 확보
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          transformOrigin: 'bottom left', // 커질 때 위/오른쪽으로 커짐
          zIndex: 1, // 프레임 내용 위에 표시
        }}
      >
        {meta.status && (
          <span
            className={`status-tag ${meta.status.toLowerCase()}`}
          >
            {meta.status.toUpperCase()}
          </span>
        )}
        <span className="node-label" style={{ flex: 1 }}>
          {meta.title}
        </span>
      </div>

      {/* Frame content */}
      <div className="frame-node-thumbnail">
        {meta.thumbnailUrl && showDetails ? (
          <img
            src={meta.thumbnailUrl}
            alt={meta.title}
            loading="lazy"  // 🔥 Lazy loading (피그마 스타일)
            decoding="async"  // 🔥 비동기 디코딩 (메인 스레드 차단 방지)
            style={{
              backgroundColor: '#f5f5f5',  // 로딩 중 배경색
            }}
          />
        ) : (
          <div className="frame-node-placeholder">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
              <path
                d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8.5 10C9.32843 10 10 9.32843 10 8.5C10 7.67157 9.32843 7 8.5 7C7.67157 7 7 7.67157 7 8.5C7 9.32843 7.67157 10 8.5 10Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M21 15L16 10L5 21"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p>썸네일 없음</p>
          </div>
        )}
      </div>

      {/* 🔥 LOD: 줌 아웃 시 노트와 링크 숨김 (성능 향상) */}
      {showDetails && meta.notes && (
        <div className="frame-node-notes">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path
              d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M14 2V8H20"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>{meta.notes.substring(0, 50)}{meta.notes.length > 50 ? '...' : ''}</span>
        </div>
      )}

      {showDetails && (
      <div className="frame-node-footer">
        <a
          href={figma.nodeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="frame-node-link"
          onClick={(e) => e.stopPropagation()}
        >
          Figma에서 열기
        </a>
      </div>
      )}

      {/* Handles positioned closer to frame edges */}
      {/* Top Center */}
      <Handle
        type="target"
        position={Position.Top}
        id="target-top"
        style={{ top: 0, left: '50%', transform: 'translate(-50%, -25%)' }}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="source-top"
        style={{ top: 0, left: '50%', transform: 'translate(-50%, -25%)' }}
      />

      {/* Bottom Center */}
      <Handle
        type="target"
        position={Position.Bottom}
        id="target-bottom"
        style={{ bottom: 0, left: '50%', transform: 'translate(-50%, 25%)' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="source-bottom"
        style={{ bottom: 0, left: '50%', transform: 'translate(-50%, 25%)' }}
      />

      {/* Left Center */}
      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        style={{ top: '50%', left: 0, transform: 'translate(-25%, -50%)' }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="source-left"
        style={{ top: '50%', left: 0, transform: 'translate(-25%, -50%)' }}
      />

      {/* Right Center */}
      <Handle
        type="target"
        position={Position.Right}
        id="target-right"
        style={{ top: '50%', right: 0, transform: 'translate(25%, -50%)' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="source-right"
        style={{ top: '50%', right: 0, transform: 'translate(25%, -50%)' }}
      />
    </div>
  )
}

export default memo(FrameNode)
