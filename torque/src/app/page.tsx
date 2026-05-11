'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import ReactFlow, { Background, Controls, MiniMap, ReactFlowProvider, useReactFlow, SelectionMode, ReactFlowInstance } from 'reactflow'
import 'reactflow/dist/style.css'

import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import WorkflowNodeComponent from '@/components/WorkflowNode'
import NodePalette from '@/components/NodePalette'
import ConfigPanel from '@/components/ConfigPanel'
import { useWorkflowStore } from '@/lib/store'
import { fetchNodeTypes } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Play,
  Square,
  Download,
  Trash2,
  FileJson,
  RotateCcw,
  Terminal,
  List,
  X,
  CheckCircle2,
  AlertCircle,
  Info,
  FileCode2,
  Settings,
} from 'lucide-react'
import UserMenu from '@/components/UserMenu'
import { generateTypeScript, getExportJson } from '@/lib/codegen'
import { useTspoonbaseStore, tspoonbaseFetch } from '@/lib/tspoonbase'

const nodeTypes = { workflow: WorkflowNodeComponent }

function Canvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition } = useReactFlow()

  const nodes = useWorkflowStore(s => s.nodes)
  const edges = useWorkflowStore(s => s.edges)
  const meta = useWorkflowStore(s => s.meta)
  const nodeTypesList = useWorkflowStore(s => s.nodeTypes)
  const isRunning = useWorkflowStore(s => s.isRunning)
  const executionLog = useWorkflowStore(s => s.executionLog)
  const toast = useWorkflowStore(s => s.toast)

  const onNodesChange = useWorkflowStore(s => s.onNodesChange)
  const onEdgesChange = useWorkflowStore(s => s.onEdgesChange)
  const onConnect = useWorkflowStore(s => s.onConnect)
  const addNode = useWorkflowStore(s => s.addNode)
  const removeSelected = useWorkflowStore(s => s.removeSelected)
  const selectNode = useWorkflowStore(s => s.selectNode)
  const setNodeTypes = useWorkflowStore(s => s.setNodeTypes)
  const setMeta = useWorkflowStore(s => s.setMeta)
  const clearCanvas = useWorkflowStore(s => s.clearCanvas)
  const setRunning = useWorkflowStore(s => s.setRunning)
  const addLog = useWorkflowStore(s => s.addLog)
  const clearLogs = useWorkflowStore(s => s.clearLogs)
  const dismissToast = useWorkflowStore(s => s.dismissToast)
  const showToast = useWorkflowStore(s => s.showToast)

  const [showExport, setShowExport] = useState(false)
  const [showLogs, setShowLogs] = useState(false)

  useEffect(() => {
    fetchNodeTypes().then(setNodeTypes)
  }, [setNodeTypes])

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    const data = event.dataTransfer.getData('application/reactflow')
    if (!data) return
    const nodeType = JSON.parse(data)
    const position = screenToFlowPosition({ x: event.clientX, y: event.clientY })
    addNode(nodeType, position)
  }, [screenToFlowPosition, addNode])

  const onKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Backspace' || event.key === 'Delete') { removeSelected() }
  }, [removeSelected])

  const workflowData = (): import('@/lib/codegen').WorkflowData => ({
    nodes: nodes.map(n => ({ id: n.id, data: { nodeType: n.data.nodeType, label: n.data.label, config: n.data.config } })),
    edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle ?? undefined, targetHandle: e.targetHandle ?? undefined })),
    meta: { workflowId: meta.workflowId, name: meta.name },
  })

  const handleExportJson = async () => {
    const data = workflowData()
    const blob = new Blob([getExportJson(data)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${meta.workflowId}.json`; a.click()
    URL.revokeObjectURL(url)
    showToast('Exported as JSON', 'success')
  }

  const handleExportTS = () => {
    const ts = generateTypeScript(workflowData())
    const blob = new Blob([ts], { type: 'text/typescript' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${meta.workflowId}.ts`; a.click()
    URL.revokeObjectURL(url)
    showToast('Exported as TypeScript', 'success')
  }

  const handleExportToTspoonbase = async () => {
    const { connection } = useTspoonbaseStore.getState()
    if (!connection.connected) {
      showToast('Connect to TspoonBase in Settings first', 'error')
      return
    }
    const definition = {
      workflowId: meta.workflowId,
      name: meta.name,
      description: meta.description,
      version: '1',
      nodes: nodes.map(n => ({ id: n.id, type: n.data.nodeType, label: n.data.label, config: n.data.config, position: n.position })),
      edges: edges.map(e => ({ id: e.id, from: e.source, to: e.target })),
    }
    try {
      await tspoonbaseFetch('/api/agents/workflows/register', {
        method: 'POST',
        body: JSON.stringify(definition),
      })
      showToast('Pushed to TspoonBase', 'success')
    } catch (err: any) {
      showToast(err.message || 'Push failed', 'error')
    }
  }

  const toastIcon = {
    success: <CheckCircle2 className="size-4 text-green-400" />,
    error: <AlertCircle className="size-4 text-red-400" />,
    info: <Info className="size-4 text-blue-400" />,
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground" onKeyDown={onKeyDown} tabIndex={0}>
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 h-11 border-b border-border bg-card shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-primary">Torque</span>
          <div className="h-4 w-px bg-border" />
          <input
            className="bg-transparent text-sm text-foreground outline-none border-b border-transparent hover:border-border focus:border-primary px-1 py-0.5 transition-colors min-w-[140px]"
            value={meta.name}
            onChange={e => setMeta({ name: e.target.value })}
          />
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono text-muted-foreground">
            {nodes.length}N · {edges.length}E
          </Badge>
        </div>
        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger
              render={<Button variant="ghost" size="sm" />}
              onClick={() => clearCanvas()}
            >
              <RotateCcw className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent>New workflow</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={<Button variant="ghost" size="sm" />}
              onClick={() => setShowLogs(!showLogs)}
            >
              <Terminal className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent>{showLogs ? 'Hide' : 'Show'} logs</TooltipContent>
          </Tooltip>

          <div className="h-4 w-px bg-border mx-0.5" />

          <Tooltip>
            <TooltipTrigger
              render={<Button variant="ghost" size="sm" />}
              onClick={handleExportTS}
            >
              <FileCode2 className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent>Export TypeScript</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={<Button variant="ghost" size="sm" />}
              onClick={handleExportJson}
            >
              <FileJson className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent>Export JSON</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={<Button variant="default" size="sm" />}
              onClick={handleExportToTspoonbase}
            >
              <Download className="size-3.5" />
              <span className="ml-1.5">Push</span>
            </TooltipTrigger>
            <TooltipContent>Push to TspoonBase</TooltipContent>
          </Tooltip>

          <div className="h-4 w-px bg-border mx-0.5" />

          <Link href="/settings">
            <Button variant="ghost" size="icon-xs" className="text-muted-foreground/50 hover:text-foreground">
              <Settings className="size-3.5" />
            </Button>
          </Link>

          <UserMenu />
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <NodePalette />
        <div ref={reactFlowWrapper} className="flex-1 relative" onDragOver={onDragOver} onDrop={onDrop}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => selectNode(node.id)}
            onPaneClick={() => selectNode(null)}
            nodeTypes={nodeTypes}
            selectionMode={SelectionMode.Partial}
            fitView
            deleteKeyCode={['Backspace', 'Delete']}
          >
            <Background color="#1e1e2e" gap={20} size={1} />
            <Controls className="!shadow-lg !shadow-black/30" />
            <MiniMap
              nodeStrokeColor="#6c5ce7"
              nodeColor="#1a1a26"
              nodeBorderRadius={4}
              maskColor="rgba(10,10,15,0.7)"
              style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
            />
          </ReactFlow>
        </div>
        <ConfigPanel />
      </div>

      {/* Bottom bar */}
      <footer className="flex items-center justify-between px-4 h-8 border-t border-border bg-card shrink-0 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-3">
          {isRunning && (
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-amber-400" />
              </span>
              Running...
            </span>
          )}
        </div>
        <span className="font-mono text-[9px]">TspoonBase Agent Engine v0.9.0</span>
      </footer>

      {/* Log panel */}
      <AnimatePresence>
        {showLogs && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 160, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border bg-card overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-1.5 border-b border-border">
              <div className="flex items-center gap-2">
                <Terminal className="size-3 text-muted-foreground" />
                <span className="text-[11px] font-medium text-muted-foreground">Execution Log</span>
                <Badge variant="outline" className="text-[9px] px-1 py-0">{executionLog.length}</Badge>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon-xs" onClick={clearLogs}>
                  <Trash2 className="size-3" />
                </Button>
                <Button variant="ghost" size="icon-xs" onClick={() => setShowLogs(false)}>
                  <X className="size-3" />
                </Button>
              </div>
            </div>
            <div className="h-[calc(160px-37px)] overflow-y-auto p-3 font-mono text-[11px] leading-relaxed">
              {executionLog.length === 0 ? (
                <span className="text-muted-foreground/60">No logs yet. Export a workflow to see output.</span>
              ) : (
                executionLog.map((log, i) => (
                  <div key={i} className="text-muted-foreground hover:text-foreground transition-colors">
                    <span className="text-[9px] text-muted-foreground/40 mr-2">{String(i + 1).padStart(3, '0')}</span>
                    {log}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg z-50 flex items-center gap-2.5 ${
              toast.type === 'success' ? 'bg-green-900/80 text-green-100 border border-green-700/50' :
              toast.type === 'error' ? 'bg-red-900/80 text-red-100 border border-red-700/50' :
              'bg-card text-foreground border border-border'
            }`}
          >
            {toastIcon[toast.type]}
            <span>{toast.message}</span>
            <button className="ml-2 opacity-60 hover:opacity-100 transition-opacity" onClick={dismissToast}>
              <X className="size-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Home() {
  return (
    <ReactFlowProvider>
      <Canvas />
    </ReactFlowProvider>
  )
}
