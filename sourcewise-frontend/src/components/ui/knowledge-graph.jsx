import { useEffect } from 'react'
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

const nodeColors = {
  main: '#D4915E',
  sub: '#5B8C5A',
  topic: '#6B4A3A',
  default: '#8B7355',
}

function KnowledgeGraph({ data, loading }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  useEffect(() => {
    if (!data || !data.nodes || data.nodes.length === 0) return

    const flowNodes = data.nodes.map((node, idx) => ({
      id: node.id || `node-${idx}`,
      position: {
        x: node.x || (idx % 4) * 250 + Math.random() * 50,
        y: node.y || Math.floor(idx / 4) * 150 + Math.random() * 50,
      },
      data: { label: node.label || node.name || 'Concept' },
      style: {
        background: nodeColors[node.type] || nodeColors.default,
        color: '#fff',
        borderRadius: '12px',
        padding: '10px 16px',
        fontSize: '13px',
        fontWeight: '600',
        border: `2px solid ${nodeColors[node.type] || nodeColors.default}`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      },
    }))

    const flowEdges = (data.edges || []).map((edge, idx) => ({
      id: `edge-${idx}`,
      source: edge.source,
      target: edge.target,
      label: edge.label || '',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#D4915E', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#D4915E' },
      labelStyle: { fontSize: '10px', fill: '#6B4A3A' },
    }))

    setNodes(flowNodes)
    setEdges(flowEdges)
  }, [data, setNodes, setEdges])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-parchment/30 rounded-xl">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-warm"></div>
      </div>
    )
  }

  if (!data || !data.nodes || data.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-parchment/30 rounded-xl">
        <p className="text-wood/40 text-sm">No knowledge graph data available. Select sources and generate a graph.</p>
      </div>
    )
  }

  return (
    <div className="h-96 rounded-xl overflow-hidden border border-wood-light/20">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: true }}
      >
        <Controls />
        <Background color="#D4915E" gap={20} size={1} />
      </ReactFlow>
    </div>
  )
}

export default KnowledgeGraph
