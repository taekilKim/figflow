import { useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import FlowCanvas from './components/FlowCanvas'
import LeftPanel from './components/LeftPanel'
import RightPanel from './components/RightPanel'
import './styles/App.css'

function App() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])

  return (
    <ReactFlowProvider>
      <div className="app-container">
        <LeftPanel selectedNodeIds={selectedNodeIds} />
        <FlowCanvas
          onNodeSelect={setSelectedNodeId}
          onEdgeSelect={setSelectedEdgeId}
          onSelectionChange={setSelectedNodeIds}
        />
        <RightPanel
          selectedNodeId={selectedNodeId}
          selectedEdgeId={selectedEdgeId}
        />
      </div>
    </ReactFlowProvider>
  )
}

export default App
