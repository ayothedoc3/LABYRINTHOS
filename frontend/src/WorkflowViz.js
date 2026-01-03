import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  Panel,
  useReactFlow,
  MarkerType,
  Handle,
  Position,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  SelectionMode,
  getNodesBounds,
  getViewportForBounds,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { toPng } from 'html-to-image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus, Save, Undo, Redo, Download, Upload, Share2, ZoomIn, ZoomOut, Maximize2,
  AlertTriangle, Zap, FolderOpen, FileText, StickyNote, ListTodo, Ban,
  ChevronRight, ChevronLeft, Home, Users, Settings2, Layers, Search,
  RefreshCw, Trash2, Copy, Eye, X, GripVertical, CheckCircle2, Circle,
  Clock, Target, Package, Lightbulb, Sparkles, HelpCircle, ArrowRight, LayoutGrid,
  Image, FileImage, HelpCircle as HelpIcon
} from 'lucide-react';
import axios from 'axios';
import AIGenerateDialog from './AIGenerateDialog';
import { LayerGuide, ActionHint, resetGuide, isGuideDismissed, resetOnboarding } from './components/LayerGuide';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api/workflowviz`;

// ==================== MILANOTE-STYLE NODE CONFIG ====================

const NODE_CONFIG = {
  ISSUE: {
    accentColor: '#EF4444',
    bgColor: '#FEF2F2',
    borderColor: '#FECACA',
    icon: AlertTriangle,
    iconBg: '#FEE2E2',
    label: 'Issue',
  },
  ACTION: {
    accentColor: '#3B82F6',
    bgColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    icon: Zap,
    iconBg: '#DBEAFE',
    label: 'Action',
  },
  RESOURCE: {
    accentColor: '#10B981',
    bgColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    icon: FolderOpen,
    iconBg: '#D1FAE5',
    label: 'Resource',
  },
  DELIVERABLE: {
    accentColor: '#8B5CF6',
    bgColor: '#F5F3FF',
    borderColor: '#DDD6FE',
    icon: Package,
    iconBg: '#EDE9FE',
    label: 'Deliverable',
  },
  STICKY_NOTE: {
    accentColor: '#F59E0B',
    bgColor: '#FFFBEB',
    borderColor: '#FDE68A',
    icon: Lightbulb,
    iconBg: '#FEF3C7',
    label: 'Note',
  },
  TASK: {
    accentColor: '#06B6D4',
    bgColor: '#ECFEFF',
    borderColor: '#A5F3FC',
    icon: ListTodo,
    iconBg: '#CFFAFE',
    label: 'Task',
  },
  BLOCKER: {
    accentColor: '#F97316',
    bgColor: '#FFF7ED',
    borderColor: '#FED7AA',
    icon: Ban,
    iconBg: '#FFEDD5',
    label: 'Blocker',
  },
};

// ==================== CUSTOM LABELED EDGE ====================

const LabeledEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style = {},
  markerEnd,
  selected,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const edgeLabel = data?.label || '';
  const edgeType = data?.edge_type || 'flow';
  
  // Edge type configurations with clearer styling
  const edgeStyles = {
    flow: { stroke: '#64748b', label: '', color: '#475569', dash: undefined },
    depends_on: { stroke: '#f59e0b', label: 'depends', color: '#d97706', dash: '8,4' },
    triggers: { stroke: '#22c55e', label: 'triggers', color: '#16a34a', dash: undefined },
    produces: { stroke: '#8b5cf6', label: 'produces', color: '#7c3aed', dash: undefined },
    blocks: { stroke: '#ef4444', label: 'blocks', color: '#dc2626', dash: '4,4' },
    requires: { stroke: '#0ea5e9', label: 'requires', color: '#0284c7', dash: '8,4' },
  };

  const edgeConfig = edgeStyles[edgeType] || edgeStyles.flow;
  const isSelected = selected;

  return (
    <>
      {/* Background glow for selected edge */}
      {isSelected && (
        <BaseEdge
          path={edgePath}
          style={{
            stroke: edgeConfig.stroke,
            strokeWidth: 8,
            opacity: 0.3,
          }}
        />
      )}
      {/* Main edge line */}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: edgeConfig.stroke,
          strokeWidth: isSelected ? 3 : 2,
          strokeDasharray: edgeConfig.dash,
          transition: 'stroke-width 0.2s ease',
        }}
      />
      {/* Animated flow indicator */}
      <circle r="3" fill={edgeConfig.stroke}>
        <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
      </circle>
      {/* Edge label */}
      {(edgeLabel || edgeConfig.label) && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <div
              className="px-2 py-0.5 rounded-full text-xs font-medium shadow-sm border bg-white"
              style={{
                borderColor: edgeConfig.stroke,
                color: edgeConfig.color,
                fontSize: '10px',
              }}
            >
              {edgeLabel || edgeConfig.label}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

// Edge types for ReactFlow
const edgeTypes = {
  labeled: LabeledEdge,
};

// ==================== AUTO-LAYOUT ALGORITHM ====================

const AUTO_LAYOUT_CONFIG = {
  NODE_WIDTH: 220,
  NODE_HEIGHT: 100,
  HORIZONTAL_SPACING: 300,
  VERTICAL_SPACING: 130,
  INITIAL_X: 50,
  INITIAL_Y: 80,
};

// Hierarchical layout algorithm for organizing nodes
const calculateAutoLayout = (nodes, edges) => {
  if (nodes.length === 0) return nodes;

  const { HORIZONTAL_SPACING, VERTICAL_SPACING, INITIAL_X, INITIAL_Y } = AUTO_LAYOUT_CONFIG;

  // Build adjacency graph
  const inDegree = {};
  const outDegree = {};
  const children = {};
  const parents = {};
  const nodeMap = {};
  
  nodes.forEach(node => {
    inDegree[node.id] = 0;
    outDegree[node.id] = 0;
    children[node.id] = [];
    parents[node.id] = [];
    nodeMap[node.id] = node;
  });

  edges.forEach(edge => {
    if (inDegree[edge.target] !== undefined) {
      inDegree[edge.target]++;
    }
    if (outDegree[edge.source] !== undefined) {
      outDegree[edge.source]++;
    }
    if (children[edge.source]) {
      children[edge.source].push(edge.target);
    }
    if (parents[edge.target]) {
      parents[edge.target].push(edge.source);
    }
  });

  // Find root nodes (no incoming edges or type = ISSUE)
  let roots = nodes.filter(node => 
    inDegree[node.id] === 0 || node.data?.node_type === 'ISSUE'
  ).map(n => n.id);
  
  if (roots.length === 0) {
    // If no roots, pick node with least incoming edges
    roots = [nodes.reduce((min, n) => 
      inDegree[n.id] < inDegree[min.id] ? n : min, nodes[0]
    ).id];
  }

  // BFS to assign levels
  const levels = {};
  const visited = new Set();
  let queue = roots.map(id => ({ id, level: 0 }));
  let maxLevel = 0;
  
  while (queue.length > 0) {
    const { id, level } = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);
    levels[id] = Math.max(levels[id] || 0, level);
    maxLevel = Math.max(maxLevel, level);
    
    children[id].forEach(childId => {
      if (!visited.has(childId)) {
        queue.push({ id: childId, level: level + 1 });
      }
    });
  }

  // Handle unvisited nodes - place them at end
  nodes.forEach(node => {
    if (!visited.has(node.id)) {
      levels[node.id] = maxLevel + 1;
    }
  });

  // Group nodes by level
  const nodesByLevel = {};
  nodes.forEach(node => {
    const level = levels[node.id] || 0;
    if (!nodesByLevel[level]) {
      nodesByLevel[level] = [];
    }
    nodesByLevel[level].push(node);
  });

  // Sort nodes within each level by type for visual consistency
  const typeOrder = { ISSUE: 0, ACTION: 1, TASK: 2, RESOURCE: 3, DELIVERABLE: 4, BLOCKER: 5, NOTE: 6, STICKY_NOTE: 7 };
  Object.values(nodesByLevel).forEach(levelNodes => {
    levelNodes.sort((a, b) => {
      const orderA = typeOrder[a.data?.node_type] ?? 99;
      const orderB = typeOrder[b.data?.node_type] ?? 99;
      return orderA - orderB;
    });
  });

  // Calculate positions - spread vertically centered
  const newNodes = nodes.map(node => {
    const level = levels[node.id] || 0;
    const levelNodes = nodesByLevel[level];
    const indexInLevel = levelNodes.indexOf(node);
    const levelHeight = levelNodes.length;
    
    // Center nodes vertically in each column
    const totalHeight = (levelHeight - 1) * VERTICAL_SPACING;
    const startY = INITIAL_Y + Math.max(0, (400 - totalHeight) / 2);
    
    return {
      ...node,
      position: {
        x: INITIAL_X + level * HORIZONTAL_SPACING,
        y: startY + indexInLevel * VERTICAL_SPACING,
      },
    };
  });

  return newNodes;
};

// ==================== TOOLTIPS FOR WORKFLOW ELEMENTS ====================

const NodeTooltip = ({ nodeType, children }) => {
  const tooltips = {
    ISSUE: {
      title: '🔴 Issue Node',
      desc: 'A problem to solve or trigger event that kicks off actions',
      tip: 'Every workflow starts with identifying the issue'
    },
    ACTION: {
      title: '🔵 Action Node', 
      desc: 'A task to complete that moves work forward',
      tip: 'Break big actions into smaller steps for clarity'
    },
    RESOURCE: {
      title: '🟢 Resource Node',
      desc: 'Tools, people, or assets needed to enable actions',
      tip: 'Link resources to the actions that need them'
    },
    DELIVERABLE: {
      title: '🟣 Deliverable Node',
      desc: 'An output or result that proves progress',
      tip: 'Clear deliverables = Clear success metrics'
    },
    TASK: {
      title: '🔷 Task Node',
      desc: 'A specific work item - the building blocks',
      tip: 'Assign owners and deadlines to tasks'
    },
    BLOCKER: {
      title: '🟠 Blocker Node',
      desc: 'An obstacle to overcome that needs resolution',
      tip: 'Address blockers quickly to keep flow moving'
    },
    NOTE: {
      title: '📝 Note Node',
      desc: 'Additional context or information for clarity',
      tip: 'Use notes for important context'
    },
    STICKY_NOTE: {
      title: '📌 Sticky Note',
      desc: 'Quick notes and reminders',
      tip: 'Perfect for brainstorming ideas'
    },
  };

  const tooltip = tooltips[nodeType] || tooltips.ACTION;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-semibold">{tooltip.title}</p>
            <p className="text-sm text-muted-foreground">{tooltip.desc}</p>
            <p className="text-xs text-primary border-t pt-1 mt-1">💡 {tooltip.tip}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// ==================== MILANOTE-STYLE CUSTOM NODE ====================

const MilanoteNode = ({ data, selected, id }) => {
  const config = NODE_CONFIG[data.node_type] || NODE_CONFIG.ACTION;
  const Icon = config.icon;

  // Sticky note has a different style
  if (data.node_type === 'STICKY_NOTE') {
    return (
      <div className="relative group">
        <Handle type="target" position={Position.Top} className="!bg-amber-400 !w-3 !h-3 !border-2 !border-white" />
        <Handle type="source" position={Position.Bottom} className="!bg-amber-400 !w-3 !h-3 !border-2 !border-white" />
        <Handle type="target" position={Position.Left} className="!bg-amber-400 !w-3 !h-3 !border-2 !border-white" />
        <Handle type="source" position={Position.Right} className="!bg-amber-400 !w-3 !h-3 !border-2 !border-white" />
        
        <div
          className={`
            w-[200px] min-h-[120px] p-4 rounded-sm shadow-lg
            transition-all duration-200 cursor-move
            ${selected ? 'ring-2 ring-amber-500 ring-offset-2 shadow-xl' : 'hover:shadow-xl'}
          `}
          style={{
            backgroundColor: '#FEF9C3',
            backgroundImage: 'linear-gradient(to bottom, #FEF9C3 0%, #FEF08A 100%)',
          }}
        >
          <div className="font-medium text-amber-900 text-sm mb-2">{data.label}</div>
          {data.description && (
            <p className="text-xs text-amber-800 leading-relaxed">{data.description}</p>
          )}
          {data.note_content && (
            <p className="text-xs text-amber-800 leading-relaxed mt-2 whitespace-pre-wrap">{data.note_content}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative group">
      {/* Connection Handles */}
      <Handle type="target" position={Position.Top} className="!w-3 !h-3 !border-2 !border-white" style={{ backgroundColor: config.accentColor }} />
      <Handle type="source" position={Position.Bottom} className="!w-3 !h-3 !border-2 !border-white" style={{ backgroundColor: config.accentColor }} />
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !border-2 !border-white" style={{ backgroundColor: config.accentColor }} />
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !border-2 !border-white" style={{ backgroundColor: config.accentColor }} />

      {/* Main Card */}
      <div
        className={`
          w-[220px] bg-white rounded-xl overflow-hidden
          transition-all duration-200 cursor-move
          ${selected 
            ? 'shadow-xl ring-2 ring-offset-2' 
            : 'shadow-md hover:shadow-lg'
          }
        `}
        style={{
          borderLeft: `4px solid ${config.accentColor}`,
          ringColor: selected ? config.accentColor : undefined,
        }}
      >
        {/* Card Header */}
        <div 
          className="px-4 py-3 flex items-center gap-3"
          style={{ backgroundColor: config.bgColor }}
        >
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: config.iconBg }}
          >
            <Icon className="w-4 h-4" style={{ color: config.accentColor }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-gray-900 text-sm truncate">{data.label}</div>
            <div className="text-xs text-gray-500">{config.label}</div>
          </div>
        </div>

        {/* Card Body */}
        <div className="px-4 py-3 space-y-2">
          {data.description && (
            <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{data.description}</p>
          )}

          {/* Assignees */}
          {data.assignee_ids && data.assignee_ids.length > 0 && (
            <div className="flex items-center gap-2 pt-1">
              <div className="flex -space-x-2">
                {data.assignee_ids.slice(0, 3).map((_, i) => (
                  <div 
                    key={i}
                    className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-white flex items-center justify-center"
                  >
                    <span className="text-white text-xs font-medium">
                      {String.fromCharCode(65 + i)}
                    </span>
                  </div>
                ))}
              </div>
              {data.assignee_ids.length > 3 && (
                <span className="text-xs text-gray-500">+{data.assignee_ids.length - 3}</span>
              )}
            </div>
          )}

          {/* Software/Resource Tag */}
          {data.software_instance && (
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded bg-green-100 flex items-center justify-center">
                <Settings2 className="w-2.5 h-2.5 text-green-600" />
              </div>
              <span className="text-xs text-gray-600 truncate">{data.software_instance}</span>
            </div>
          )}

          {/* Task Status */}
          {data.status && (
            <div className="flex items-center gap-2 pt-1">
              {data.status === 'DONE' && (
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Done
                </Badge>
              )}
              {data.status === 'IN_PROGRESS' && (
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs">
                  <Circle className="w-3 h-3 mr-1" /> In Progress
                </Badge>
              )}
              {data.status === 'TODO' && (
                <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 text-xs">
                  <Circle className="w-3 h-3 mr-1" /> To Do
                </Badge>
              )}
              {data.status === 'BLOCKED' && (
                <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-xs">
                  <Ban className="w-3 h-3 mr-1" /> Blocked
                </Badge>
              )}
            </div>
          )}

          {/* Due Date */}
          {data.due_date && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              <span>{new Date(data.due_date).toLocaleDateString()}</span>
            </div>
          )}

          {/* Drill-down Indicator for ACTION nodes */}
          {data.node_type === 'ACTION' && data.layer !== 'EXECUTION' && (
            <div className="pt-2 mt-2 border-t border-dashed border-gray-200">
              <div className="flex items-center gap-1.5 text-xs text-primary cursor-pointer hover:text-primary/80 transition-colors">
                <Layers className="w-3 h-3" />
                <span>Double-click to drill down</span>
                <ChevronRight className="w-3 h-3" />
              </div>
              {data.child_count > 0 && (
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <Package className="w-3 h-3" />
                  <span>{data.child_count} sub-item{data.child_count !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drag Handle Indicator */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-40 transition-opacity">
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>
      </div>
    </div>
  );
};

const nodeTypes = {
  custom: MilanoteNode,
};

// ==================== UNDO/REDO HISTORY HOOK ====================

const useUndoRedo = (initialState = { nodes: [], edges: [] }) => {
  const [history, setHistory] = useState([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const isUndoingRef = useRef(false);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  const pushState = useCallback((newState) => {
    if (isUndoingRef.current) {
      isUndoingRef.current = false;
      return;
    }

    setHistory(prev => {
      // Remove any future states if we're not at the end
      const newHistory = prev.slice(0, currentIndex + 1);
      // Add new state
      newHistory.push({
        nodes: JSON.parse(JSON.stringify(newState.nodes)),
        edges: JSON.parse(JSON.stringify(newState.edges)),
      });
      // Keep history manageable (max 50 states)
      if (newHistory.length > 50) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });
    setCurrentIndex(prev => Math.min(prev + 1, 49));
  }, [currentIndex]);

  const undo = useCallback(() => {
    if (!canUndo) return null;
    isUndoingRef.current = true;
    const newIndex = currentIndex - 1;
    setCurrentIndex(newIndex);
    return history[newIndex];
  }, [canUndo, currentIndex, history]);

  const redo = useCallback(() => {
    if (!canRedo) return null;
    isUndoingRef.current = true;
    const newIndex = currentIndex + 1;
    setCurrentIndex(newIndex);
    return history[newIndex];
  }, [canRedo, currentIndex, history]);

  const reset = useCallback((state) => {
    setHistory([{
      nodes: JSON.parse(JSON.stringify(state.nodes)),
      edges: JSON.parse(JSON.stringify(state.edges)),
    }]);
    setCurrentIndex(0);
  }, []);

  return { pushState, undo, redo, canUndo, canRedo, reset, currentIndex, historyLength: history.length };
};

// ==================== WORKFLOW CANVAS COMPONENT ====================

const WorkflowCanvas = ({ 
  workflowId, 
  layer, 
  parentNodeId, 
  onNodeDoubleClick, 
  breadcrumb,
  onBreadcrumbClick,
  teamMembers,
  software,
  templates,
  actionTemplates,
  onSave
}) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedNodes, setSelectedNodes] = useState([]);
  const [showNodeDialog, setShowNodeDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [newNodeType, setNewNodeType] = useState('ACTION');
  const [newNodeData, setNewNodeData] = useState({ label: '', description: '' });
  const [saveStatus, setSaveStatus] = useState('saved');
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState('OPERATIONS');
  const [isExporting, setIsExporting] = useState(false);
  const saveTimeoutRef = useRef(null);
  const lastSavedStateRef = useRef(null);
  const flowRef = useRef(null);
  const { project, fitView, getNodes } = useReactFlow();

  // Undo/Redo functionality
  const { pushState, undo, redo, canUndo, canRedo, reset: resetHistory } = useUndoRedo();

  // Handle undo
  const handleUndo = useCallback(() => {
    const previousState = undo();
    if (previousState) {
      setNodes(previousState.nodes);
      setEdges(previousState.edges);
    }
  }, [undo, setNodes, setEdges]);

  // Handle redo
  const handleRedo = useCallback(() => {
    const nextState = redo();
    if (nextState) {
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
    }
  }, [redo, setNodes, setEdges]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Export workflow as PNG
  const handleExportPNG = useCallback(async () => {
    if (!flowRef.current || nodes.length === 0) return;
    
    setIsExporting(true);
    try {
      // Find the react-flow viewport element
      const flowElement = flowRef.current.querySelector('.react-flow__viewport');
      if (!flowElement) {
        console.error('Could not find flow viewport');
        setIsExporting(false);
        return;
      }

      // Calculate bounds to capture all nodes with padding
      const nodesBounds = getNodesBounds(nodes);
      const padding = 50;
      const width = nodesBounds.width + padding * 2;
      const height = nodesBounds.height + padding * 2;

      // Get viewport transform for proper positioning
      const transform = getViewportForBounds(
        nodesBounds,
        width,
        height,
        0.5,
        2,
        padding
      );

      // Generate PNG with high quality
      const dataUrl = await toPng(flowElement, {
        backgroundColor: '#f8fafc',
        width: width,
        height: height,
        style: {
          width: `${width}px`,
          height: `${height}px`,
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})`,
        },
        quality: 1,
        pixelRatio: 2,
      });

      // Download the image
      const link = document.createElement('a');
      link.download = `workflow-${layer.toLowerCase()}-${new Date().toISOString().slice(0,10)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error exporting PNG:', error);
    }
    setIsExporting(false);
  }, [nodes, layer]);

  // Push state to history when nodes/edges change significantly
  const pushHistoryState = useCallback(() => {
    const currentState = JSON.stringify({ nodes, edges });
    if (lastSavedStateRef.current !== currentState && nodes.length > 0) {
      lastSavedStateRef.current = currentState;
      pushState({ nodes, edges });
    }
  }, [nodes, edges, pushState]);

  // Auto-layout function
  const applyAutoLayout = useCallback(() => {
    if (nodes.length === 0) return;
    
    // Save state before layout
    pushHistoryState();
    
    const layoutedNodes = calculateAutoLayout(nodes, edges);
    setNodes(layoutedNodes);
    setTimeout(() => fitView({ padding: 0.2 }), 100);
  }, [nodes, edges, setNodes, fitView, pushHistoryState]);

  // Load nodes and edges for this layer
  useEffect(() => {
    const loadData = async () => {
      if (!workflowId) return;
      try {
        let nodeQuery = `${API}/workflows/${workflowId}/nodes?layer=${layer}`;
        if (parentNodeId) {
          nodeQuery += `&parent_node_id=${parentNodeId}`;
        }
        
        const [nodesRes, edgesRes] = await Promise.all([
          axios.get(nodeQuery),
          axios.get(`${API}/workflows/${workflowId}/edges?layer=${layer}`)
        ]);
        
        // Filter edges for current layer context
        const layerNodeIds = new Set(nodesRes.data.map(n => n.id));
        const layerEdges = edgesRes.data.filter(e => 
          layerNodeIds.has(e.source) && layerNodeIds.has(e.target)
        );
        
        // Add layer info to node data for drill-down indicator
        setNodes(nodesRes.data.map(n => ({
          ...n,
          type: 'custom',
          data: {
            ...n.data,
            layer: layer,  // Add current layer to node data
          }
        })));
        setEdges(layerEdges.map(e => ({
          ...e,
          type: 'smoothstep',
          style: { strokeWidth: 2, stroke: '#64748b' },
          markerEnd: { 
            type: MarkerType.ArrowClosed,
            color: '#64748b',
            width: 20,
            height: 20,
          },
          data: e.data || { edge_type: 'flow' },
        })));
        
        // Reset history when loading new data
        setTimeout(() => {
          resetHistory({ 
            nodes: nodesRes.data.map(n => ({ ...n, type: 'custom', data: { ...n.data, layer } })),
            edges: layerEdges 
          });
          fitView({ padding: 0.2 });
        }, 100);
      } catch (error) {
        console.error('Error loading workflow data:', error);
      }
    };
    loadData();
  }, [workflowId, layer, parentNodeId, setNodes, setEdges, fitView, resetHistory]);

  // Auto-save with debounce
  const triggerAutoSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    setSaveStatus('saving');
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await axios.post(`${API}/workflows/${workflowId}/auto-save`, {
          nodes: nodes.map(n => ({ ...n, workflow_id: workflowId, layer })),
          edges: edges.map(e => ({ ...e, workflow_id: workflowId, layer })),
        });
        setSaveStatus('saved');
        onSave?.();
      } catch (error) {
        console.error('Auto-save failed:', error);
        setSaveStatus('error');
      }
    }, 3000);
  }, [workflowId, nodes, edges, layer, onSave]);

  // Trigger auto-save on changes
  useEffect(() => {
    const shouldSave = nodes.length > 0 || edges.length > 0;
    if (shouldSave) {
      // Using ref-based approach to avoid setState lint warning
      const timeoutId = setTimeout(() => {
        triggerAutoSave();
      }, 0);
      return () => clearTimeout(timeoutId);
    }
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  const onConnect = useCallback((params) => {
    // Push current state to history before making change
    pushHistoryState();
    
    const newEdge = {
      ...params,
      id: `edge-${Date.now()}`,
      type: 'smoothstep',
      animated: false,
      style: { strokeWidth: 2, stroke: '#64748b' },
      markerEnd: { 
        type: MarkerType.ArrowClosed,
        color: '#64748b',
        width: 20,
        height: 20,
      },
      layer,
      workflow_id: workflowId,
      data: { edge_type: 'flow' },
    };
    setEdges((eds) => addEdge(newEdge, eds));
  }, [setEdges, layer, workflowId, pushHistoryState]);

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  // Handle multi-select with shift+click or selection box
  const onSelectionChange = useCallback(({ nodes: selectedFlowNodes }) => {
    setSelectedNodes(selectedFlowNodes || []);
  }, []);

  const onNodeDblClick = useCallback((event, node) => {
    if (node.data.node_type === 'ACTION' && layer !== 'EXECUTION') {
      onNodeDoubleClick?.(node);
    }
  }, [onNodeDoubleClick, layer]);

  // Save selected nodes as template
  const saveSelectedAsTemplate = async () => {
    if (selectedNodes.length === 0 || !newTemplateName.trim()) return;
    
    // Get edges that connect selected nodes
    const selectedNodeIds = new Set(selectedNodes.map(n => n.id));
    const templateEdges = edges.filter(e => 
      selectedNodeIds.has(e.source) && selectedNodeIds.has(e.target)
    );
    
    // Calculate relative positions (offset from first node)
    const firstNode = selectedNodes[0];
    const nodesWithRelativePos = selectedNodes.map(n => ({
      label: n.data.label,
      description: n.data.description || '',
      node_type: n.data.node_type,
      relative_position: {
        x: n.position.x - firstNode.position.x,
        y: n.position.y - firstNode.position.y,
      }
    }));
    
    // Create connections based on node order in selection
    const nodeIndexMap = {};
    selectedNodes.forEach((n, i) => { nodeIndexMap[n.id] = i; });
    const connections = templateEdges.map(e => ({
      from_index: nodeIndexMap[e.source],
      to_index: nodeIndexMap[e.target],
    }));
    
    try {
      await axios.post(`${API}/templates`, {
        name: newTemplateName,
        description: `Template created from ${selectedNodes.length} selected nodes`,
        category: newTemplateCategory,
        nodes: nodesWithRelativePos,
        connections,
        is_predefined: false,
      });
      
      setShowSaveTemplateDialog(false);
      setNewTemplateName('');
      setSelectedNodes([]);
      // Deselect nodes on canvas
      setNodes(nds => nds.map(n => ({ ...n, selected: false })));
      
      // Refresh templates list
      onSave?.();
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const addNode = async (nodeType, templateData = null) => {
    // Push current state to history before making change
    pushHistoryState();
    
    const position = project({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    
    const nodeData = templateData || {
      label: newNodeData.label || `New ${nodeType}`,
      description: newNodeData.description || '',
      node_type: nodeType,
      assignee_ids: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const newNode = {
      id: `node-${Date.now()}`,
      type: 'custom',
      position,
      data: nodeData,
      layer,
      parent_node_id: parentNodeId || null,
      workflow_id: workflowId,
    };

    try {
      const response = await axios.post(`${API}/workflows/${workflowId}/nodes`, {
        type: 'custom',
        position,
        data: nodeData,
        layer,
        parent_node_id: parentNodeId || null,
      });
      
      setNodes((nds) => [...nds, { 
        ...response.data, 
        type: 'custom',
        data: { ...response.data.data, layer }  // Add layer to node data
      }]);
      setShowNodeDialog(false);
      setNewNodeData({ label: '', description: '' });
    } catch (error) {
      console.error('Error creating node:', error);
    }
  };

  const addFromActionTemplate = async (template) => {
    const position = project({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const nodesToAdd = [];
    const edgesToAdd = [];
    const timestamp = new Date().getTime();

    // Create main action node
    const actionNode = {
      id: `node-${timestamp}`,
      type: 'custom',
      position,
      data: {
        label: template.action_name,
        description: template.description || '',
        node_type: 'ACTION',
        assignee_ids: [],
        from_template_id: template.id,
      },
      layer,
      parent_node_id: parentNodeId || null,
      workflow_id: workflowId,
    };
    nodesToAdd.push(actionNode);

    // Create resource nodes
    template.resources?.forEach((resource, i) => {
      const resourceNode = {
        id: `node-${timestamp}-r${i}`,
        type: 'custom',
        position: { x: position.x - 150, y: position.y + 80 + (i * 80) },
        data: {
          label: resource.name,
          node_type: 'RESOURCE',
          software_instance: resource.software,
        },
        layer,
        parent_node_id: parentNodeId || null,
        workflow_id: workflowId,
      };
      nodesToAdd.push(resourceNode);
      edgesToAdd.push({
        id: `edge-${timestamp}-r${i}`,
        source: resourceNode.id,
        target: actionNode.id,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed },
        layer,
        workflow_id: workflowId,
      });
    });

    // Create deliverable nodes
    template.deliverables?.forEach((deliverable, i) => {
      const deliverableNode = {
        id: `node-${timestamp}-d${i}`,
        type: 'custom',
        position: { x: position.x + 200, y: position.y + (i * 80) },
        data: {
          label: deliverable,
          node_type: 'DELIVERABLE',
        },
        layer,
        parent_node_id: parentNodeId || null,
        workflow_id: workflowId,
      };
      nodesToAdd.push(deliverableNode);
      edgesToAdd.push({
        id: `edge-${timestamp}-d${i}`,
        source: actionNode.id,
        target: deliverableNode.id,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed },
        layer,
        workflow_id: workflowId,
      });
    });

    // Save all nodes
    for (const node of nodesToAdd) {
      await axios.post(`${API}/workflows/${workflowId}/nodes`, {
        type: 'custom',
        position: node.position,
        data: node.data,
        layer: node.layer,
        parent_node_id: node.parent_node_id,
      });
    }

    // Save all edges
    for (const edge of edgesToAdd) {
      await axios.post(`${API}/workflows/${workflowId}/edges`, {
        source: edge.source,
        target: edge.target,
        type: edge.type,
        layer: edge.layer,
      });
    }

    setNodes((nds) => [...nds, ...nodesToAdd]);
    setEdges((eds) => [...eds, ...edgesToAdd]);
    setShowTemplateDialog(false);
  };

  const deleteSelectedNode = async () => {
    if (!selectedNode) return;
    
    // Push current state to history before making change
    pushHistoryState();
    
    try {
      await axios.delete(`${API}/workflows/${workflowId}/nodes/${selectedNode.id}`);
      setNodes((nds) => nds.filter(n => n.id !== selectedNode.id));
      setEdges((eds) => eds.filter(e => e.source !== selectedNode.id && e.target !== selectedNode.id));
      setSelectedNode(null);
    } catch (error) {
      console.error('Error deleting node:', error);
    }
  };

  const updateSelectedNode = async (updates) => {
    if (!selectedNode) return;
    
    // Push current state to history before making change
    pushHistoryState();
    
    try {
      const updatedData = { ...selectedNode.data, ...updates };
      await axios.put(`${API}/workflows/${workflowId}/nodes/${selectedNode.id}`, {
        ...selectedNode,
        data: updatedData,
      });
      setNodes((nds) => nds.map(n => 
        n.id === selectedNode.id ? { ...n, data: updatedData } : n
      ));
      setSelectedNode({ ...selectedNode, data: updatedData });
    } catch (error) {
      console.error('Error updating node:', error);
    }
  };

  return (
    <div className="h-full w-full relative" ref={flowRef}>
      {/* Breadcrumb Navigation - Enhanced */}
      <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur rounded-xl p-1 shadow-lg border flex items-center gap-1">
        {/* Strategic - Always shown */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant={layer === 'STRATEGIC' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => onBreadcrumbClick?.('STRATEGIC', null)}
              className={layer === 'STRATEGIC' ? 'bg-primary text-primary-foreground' : ''}
            >
              <Home className="w-4 h-4 mr-1" />
              Strategic
            </Button>
          </TooltipTrigger>
          <TooltipContent>🏔️ High-level goals and major initiatives</TooltipContent>
        </Tooltip>
        
        {/* Tactical level in breadcrumb */}
        {breadcrumb?.filter(b => b.layer === 'TACTICAL').map((crumb, i) => (
          <React.Fragment key={`tactical-${i}`}>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={layer === 'TACTICAL' && parentNodeId === crumb.node_id ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => onBreadcrumbClick?.('TACTICAL', crumb.node_id)}
                  className={`max-w-[150px] truncate ${layer === 'TACTICAL' ? 'bg-amber-500 text-white hover:bg-amber-600' : ''}`}
                >
                  <Target className="w-4 h-4 mr-1 flex-shrink-0" />
                  <span className="truncate">{crumb.label}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>⚔️ Tactical: {crumb.label}</TooltipContent>
            </Tooltip>
          </React.Fragment>
        ))}
        
        {/* Execution level in breadcrumb */}
        {breadcrumb?.filter(b => b.layer === 'EXECUTION').map((crumb, i) => (
          <React.Fragment key={`execution-${i}`}>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={layer === 'EXECUTION' ? 'default' : 'ghost'} 
                  size="sm"
                  onClick={() => onBreadcrumbClick?.('EXECUTION', crumb.node_id)}
                  className={`max-w-[150px] truncate ${layer === 'EXECUTION' ? 'bg-green-500 text-white hover:bg-green-600' : ''}`}
                >
                  <CheckCircle2 className="w-4 h-4 mr-1 flex-shrink-0" />
                  <span className="truncate">{crumb.label}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>🎯 Execution: {crumb.label}</TooltipContent>
            </Tooltip>
          </React.Fragment>
        ))}
        
        {/* Current Layer Badge */}
        <div className="ml-2 pl-2 border-l flex items-center gap-2">
          <Badge 
            variant="secondary" 
            className={`
              ${layer === 'STRATEGIC' ? 'bg-primary/10 text-primary' : ''}
              ${layer === 'TACTICAL' ? 'bg-amber-100 text-amber-700' : ''}
              ${layer === 'EXECUTION' ? 'bg-green-100 text-green-700' : ''}
            `}
          >
            {layer === 'STRATEGIC' && '🏔️'}
            {layer === 'TACTICAL' && '⚔️'}
            {layer === 'EXECUTION' && '🎯'}
            {' '}{layer}
          </Badge>
          <ActionHint layer={layer} show={true} />
        </div>
      </div>

      {/* Toolbar */}
      <div className="absolute top-4 right-4 z-10 bg-background/90 backdrop-blur rounded-lg p-2 shadow-md flex items-center gap-2">
        {/* Undo/Redo Buttons */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleUndo} 
              disabled={!canUndo}
              data-testid="undo-btn"
            >
              <Undo className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleRedo} 
              disabled={!canRedo}
              data-testid="redo-btn"
            >
              <Redo className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6" />

        <Dialog open={showNodeDialog} onOpenChange={setShowNodeDialog}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="add-node-btn">
              <Plus className="w-4 h-4 mr-1" /> Add Node
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Node</DialogTitle>
              <DialogDescription>Create a new node on the canvas</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Node Type</Label>
                <Select value={newNodeType} onValueChange={setNewNodeType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ISSUE">Issue (Problem/Trigger)</SelectItem>
                    <SelectItem value="ACTION">Action (Process Step)</SelectItem>
                    <SelectItem value="RESOURCE">Resource (Tool/Asset)</SelectItem>
                    <SelectItem value="DELIVERABLE">Deliverable (Output)</SelectItem>
                    <SelectItem value="STICKY_NOTE">Sticky Note</SelectItem>
                    {layer === 'EXECUTION' && (
                      <>
                        <SelectItem value="TASK">Task</SelectItem>
                        <SelectItem value="BLOCKER">Blocker</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Label</Label>
                <Input 
                  value={newNodeData.label} 
                  onChange={(e) => setNewNodeData({...newNodeData, label: e.target.value})}
                  placeholder="Node label"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea 
                  value={newNodeData.description} 
                  onChange={(e) => setNewNodeData({...newNodeData, description: e.target.value})}
                  placeholder="Optional description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNodeDialog(false)}>Cancel</Button>
              <Button onClick={() => addNode(newNodeType)}>Add Node</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Export as PNG Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleExportPNG}
              disabled={isExporting || nodes.length === 0}
              data-testid="export-png-btn"
            >
              {isExporting ? (
                <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <FileImage className="w-4 h-4 mr-1" />
              )}
              Export PNG
            </Button>
          </TooltipTrigger>
          <TooltipContent>Export workflow as PNG image</TooltipContent>
        </Tooltip>

        {/* Save Selected as Template */}
        <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
          <DialogTrigger asChild>
            <Button 
              size="sm" 
              variant="outline" 
              disabled={selectedNodes.length === 0}
              data-testid="save-template-btn"
            >
              <Save className="w-4 h-4 mr-1" /> Save Template
              {selectedNodes.length > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                  {selectedNodes.length}
                </Badge>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save as Template</DialogTitle>
              <DialogDescription>
                Save {selectedNodes.length} selected node{selectedNodes.length !== 1 ? 's' : ''} as a reusable template
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Template Name</Label>
                <Input 
                  value={newTemplateName} 
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="My Custom Template"
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={newTemplateCategory} onValueChange={setNewTemplateCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SALES">Sales</SelectItem>
                    <SelectItem value="MARKETING">Marketing</SelectItem>
                    <SelectItem value="DEVELOPMENT">Development</SelectItem>
                    <SelectItem value="OPERATIONS">Operations</SelectItem>
                    <SelectItem value="FINANCE">Finance</SelectItem>
                    <SelectItem value="HR">HR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <Label className="text-xs text-muted-foreground">Selected Nodes:</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedNodes.map(n => (
                    <Badge key={n.id} variant="outline" className="text-xs">
                      {n.data.label}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSaveTemplateDialog(false)}>Cancel</Button>
              <Button onClick={saveSelectedAsTemplate} disabled={!newTemplateName.trim()}>
                Save Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Layers className="w-4 h-4 mr-1" /> Templates
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Action Templates</DialogTitle>
              <DialogDescription>Insert pre-configured action with resources and deliverables</DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-[400px]">
              <div className="grid grid-cols-2 gap-4 p-2">
                {actionTemplates?.map((template) => (
                  <Card 
                    key={template.id} 
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => addFromActionTemplate(template)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{template.action_name}</CardTitle>
                      <Badge variant="outline">{template.category}</Badge>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      <p className="mb-2">{template.description}</p>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          <FolderOpen className="w-3 h-3" />
                          <span>{template.resources?.length || 0} Resources</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          <span>{template.deliverables?.length || 0} Deliverables</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        <Separator orientation="vertical" className="h-6" />
        
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" variant="ghost" onClick={applyAutoLayout} data-testid="auto-layout-btn">
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Auto-arrange nodes</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" variant="ghost" onClick={() => fitView({ padding: 0.2 })}>
              <Maximize2 className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Fit to view</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6" />

        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          {saveStatus === 'saving' && <RefreshCw className="w-3 h-3 animate-spin" />}
          {saveStatus === 'saved' && <span className="text-green-500">✓</span>}
          {saveStatus === 'error' && <span className="text-red-500">!</span>}
          <span className="text-xs">
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Error'}
          </span>
        </div>
      </div>

      {/* Selected Node Panel - Enhanced */}
      {selectedNode && (
        <div className="absolute bottom-4 left-4 z-10 bg-white rounded-xl shadow-xl w-80 border overflow-hidden">
          {/* Header with color accent */}
          <div 
            className="px-4 py-3 border-b"
            style={{ 
              background: `linear-gradient(90deg, ${NODE_CONFIG[selectedNode.data.node_type]?.iconBg} 0%, white 100%)` 
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm"
                  style={{ backgroundColor: 'white' }}
                >
                  {(() => {
                    const Icon = NODE_CONFIG[selectedNode.data.node_type]?.icon || Zap;
                    return <Icon className="w-5 h-5" style={{ color: NODE_CONFIG[selectedNode.data.node_type]?.accentColor }} />;
                  })()}
                </div>
                <div>
                  <h3 className="font-semibold text-sm leading-tight">{selectedNode.data.label}</h3>
                  <Badge 
                    variant="outline" 
                    className="text-xs mt-0.5"
                    style={{ 
                      borderColor: NODE_CONFIG[selectedNode.data.node_type]?.accentColor,
                      color: NODE_CONFIG[selectedNode.data.node_type]?.accentColor 
                    }}
                  >
                    {NODE_CONFIG[selectedNode.data.node_type]?.label}
                  </Badge>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setSelectedNode(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Description */}
            {selectedNode.data.description && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Description</Label>
                <p className="text-sm text-foreground bg-muted/50 rounded-lg p-2">{selectedNode.data.description}</p>
              </div>
            )}

            {/* Connection info */}
            <div className="flex gap-2">
              <div className="flex-1 bg-muted/50 rounded-lg p-2 text-center">
                <div className="text-lg font-semibold">{edges.filter(e => e.target === selectedNode.id).length}</div>
                <div className="text-xs text-muted-foreground">Incoming</div>
              </div>
              <div className="flex-1 bg-muted/50 rounded-lg p-2 text-center">
                <div className="text-lg font-semibold">{edges.filter(e => e.source === selectedNode.id).length}</div>
                <div className="text-xs text-muted-foreground">Outgoing</div>
              </div>
            </div>

            {/* Assignee picker for ACTION nodes */}
            {selectedNode.data.node_type === 'ACTION' && (
              <div>
                <Label className="text-xs text-gray-500">Assign Team Members</Label>
                <Select
                  value={selectedNode.data.assignee_ids?.[0] || ''}
                  onValueChange={(value) => {
                    const newAssignees = value ? [value] : [];
                    updateSelectedNode({ assignee_ids: newAssignees });
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers?.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        <div className="flex items-center gap-2">
                          <span>{member.name}</span>
                          <Badge variant="outline" className="text-xs">{member.workload}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Software picker for RESOURCE nodes */}
            {selectedNode.data.node_type === 'RESOURCE' && (
              <div>
                <Label className="text-xs text-gray-500">Software/Tool</Label>
                <Select
                  value={selectedNode.data.software_instance || ''}
                  onValueChange={(value) => updateSelectedNode({ software_instance: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select software" />
                  </SelectTrigger>
                  <SelectContent>
                    {software?.map((sw) => (
                      <SelectItem key={sw.id} value={sw.name}>
                        <div className="flex items-center gap-2">
                          <span>{sw.name}</span>
                          <Badge variant="outline" className="text-xs">{sw.category}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Task status for TASK nodes */}
            {selectedNode.data.node_type === 'TASK' && (
              <div>
                <Label className="text-xs text-gray-500">Status</Label>
                <Select
                  value={selectedNode.data.status || 'TODO'}
                  onValueChange={(value) => updateSelectedNode({ status: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TODO">To Do</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="BLOCKED">Blocked</SelectItem>
                    <SelectItem value="DONE">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-2 pt-2 border-t mt-2">
              {(selectedNode.data.node_type === 'ACTION' && layer !== 'EXECUTION') && (
                <Button size="sm" variant="outline" className="flex-1" onClick={() => onNodeDblClick(null, selectedNode)}>
                  <ChevronRight className="w-4 h-4 mr-1" /> Drill Down
                </Button>
              )}
              <Button size="sm" variant="destructive" onClick={deleteSelectedNode}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* React Flow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDblClick}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[25, 25]}
        connectionMode="loose"
        connectionLineType="smoothstep"
        selectionMode={SelectionMode.Partial}
        selectNodesOnDrag={false}
        multiSelectionKeyCode="Shift"
        defaultEdgeOptions={{
          type: 'smoothstep',
          markerEnd: { 
            type: MarkerType.ArrowClosed,
            color: '#64748b',
            width: 20,
            height: 20,
          },
          style: { strokeWidth: 2, stroke: '#64748b' },
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Controls className="!bg-white !rounded-lg !shadow-lg !border" />
        <MiniMap 
          nodeColor={(node) => NODE_CONFIG[node.data?.node_type]?.accentColor || '#94a3b8'}
          maskColor="rgba(0,0,0,0.08)"
          className="!bg-white !rounded-lg !shadow-lg !border"
          pannable
          zoomable
        />
        <Background variant="dots" gap={25} size={1} color="#e2e8f0" />
        
        {/* Node Type Legend */}
        <Panel position="bottom-right" className="!mb-2 !mr-2">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border p-2 flex gap-3">
            {Object.entries(NODE_CONFIG).slice(0, 5).map(([type, config]) => (
              <Tooltip key={type}>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 cursor-help">
                    <div 
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: config.accentColor }}
                    />
                    <span className="text-xs text-muted-foreground">{config.label}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">{config.label} node - Click to see details</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </Panel>
      </ReactFlow>
      
      {/* Layer Guide Bubble */}
      <LayerGuide 
        layer={layer} 
        isVisible={true}
        position="bottom-left"
      />
    </div>
  );
};

// ==================== MAIN WORKFLOWVIZ COMPONENT ====================

const WorkflowViz = () => {
  const [workflows, setWorkflows] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [currentLayer, setCurrentLayer] = useState('STRATEGIC');
  const [parentNodeId, setParentNodeId] = useState(null);
  const [breadcrumb, setBreadcrumb] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [software, setSoftware] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [actionTemplates, setActionTemplates] = useState([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [loading, setLoading] = useState(true);

  // Update URL when workflow selection changes
  useEffect(() => {
    if (selectedWorkflow) {
      const url = new URL(window.location);
      url.searchParams.set('workflow', selectedWorkflow.id);
      window.history.replaceState({}, '', url);
    }
  }, [selectedWorkflow]);

  // Load initial data and restore workflow from URL
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [workflowsRes, teamRes, softwareRes, templatesRes, actionRes] = await Promise.all([
          axios.get(`${API}/workflows`),
          axios.get(`${API}/team`),
          axios.get(`${API}/software`),
          axios.get(`${API}/templates`),
          axios.get(`${API}/action-templates`),
        ]);
        setWorkflows(workflowsRes.data);
        setTeamMembers(teamRes.data);
        setSoftware(softwareRes.data);
        setTemplates(templatesRes.data);
        setActionTemplates(actionRes.data);

        // Restore selected workflow from URL query parameter
        const urlParams = new URLSearchParams(window.location.search);
        const workflowIdFromUrl = urlParams.get('workflow');
        if (workflowIdFromUrl && workflowsRes.data.length > 0) {
          const savedWorkflow = workflowsRes.data.find(wf => wf.id === workflowIdFromUrl);
          if (savedWorkflow) {
            setSelectedWorkflow(savedWorkflow);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  const createWorkflow = async () => {
    if (!newWorkflowName.trim()) return;
    try {
      const response = await axios.post(`${API}/workflows`, {
        name: newWorkflowName,
        description: '',
        access_level: 'PUBLIC',
      });
      setWorkflows([response.data, ...workflows]);
      setSelectedWorkflow(response.data);
      setCurrentLayer('STRATEGIC');
      setParentNodeId(null);
      setBreadcrumb([]);
      setShowCreateDialog(false);
      setNewWorkflowName('');
    } catch (error) {
      console.error('Error creating workflow:', error);
    }
  };

  const selectWorkflow = (workflow) => {
    setSelectedWorkflow(workflow);
    setCurrentLayer('STRATEGIC');
    setParentNodeId(null);
    setBreadcrumb([]);
  };

  const handleNodeDoubleClick = (node) => {
    if (!node || node.data.node_type !== 'ACTION') return;
    
    const nextLayerMap = {
      'STRATEGIC': 'TACTICAL',
      'TACTICAL': 'EXECUTION',
    };
    
    const nextLayer = nextLayerMap[currentLayer];
    if (!nextLayer) return; // Already at EXECUTION level
    
    // Build new breadcrumb trail
    const newBreadcrumb = [
      ...breadcrumb,
      { 
        layer: nextLayer, 
        node_id: node.id, 
        label: node.data.label,
        parent_layer: currentLayer
      }
    ];
    
    setBreadcrumb(newBreadcrumb);
    setCurrentLayer(nextLayer);
    setParentNodeId(node.id);
  };

  const navigateToLayer = (targetLayer, targetNodeId = null) => {
    if (targetLayer === 'STRATEGIC') {
      setCurrentLayer('STRATEGIC');
      setParentNodeId(null);
      setBreadcrumb([]);
    } else {
      const idx = breadcrumb.findIndex(b => b.layer === targetLayer && b.node_id === targetNodeId);
      if (idx >= 0) {
        setBreadcrumb(breadcrumb.slice(0, idx + 1));
        setCurrentLayer(targetLayer);
        setParentNodeId(targetNodeId);
      }
    }
  };

  const handleBreadcrumbClick = (layer, nodeId) => {
    navigateToLayer(layer, nodeId);
  };

  const exportWorkflow = async () => {
    if (!selectedWorkflow) return;
    try {
      const response = await axios.get(`${API}/workflows/${selectedWorkflow.id}/export`);
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedWorkflow.name.replace(/\s+/g, '_')}_export.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting workflow:', error);
    }
  };

  const refreshWorkflows = async () => {
    try {
      const response = await axios.get(`${API}/workflows`);
      setWorkflows(response.data);
    } catch (error) {
      console.error('Error refreshing workflows:', error);
    }
  };

  // Handle AI generated workflow
  const handleAIWorkflowGenerated = async (result) => {
    if (result?.success && result?.workflow_id) {
      await refreshWorkflows();
      // Select the new workflow
      const newWorkflows = await axios.get(`${API}/workflows`);
      const newWorkflow = newWorkflows.data.find(w => w.id === result.workflow_id);
      if (newWorkflow) {
        selectWorkflow(newWorkflow);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <TooltipProvider>
    <div className="h-[calc(100vh-200px)] min-h-[600px] flex" data-testid="workflowviz">
      {/* Sidebar */}
      <div className="w-72 border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold flex items-center gap-2">
              Workflows
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="w-4 h-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p className="font-semibold">🔄 Workflows</p>
                  <p className="text-sm">Visual process maps showing how work flows through your organization.</p>
                  <p className="text-xs text-primary mt-1">💡 Drag nodes, draw connections, build your perfect process!</p>
                </TooltipContent>
              </Tooltip>
            </h2>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="create-workflow-btn">
                  <Plus className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Workflow</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Workflow Name</Label>
                    <Input 
                      value={newWorkflowName}
                      onChange={(e) => setNewWorkflowName(e.target.value)}
                      placeholder="Enter workflow name"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={createWorkflow}>Create</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          {/* AI Generate Workflow Button */}
          <AIGenerateDialog 
            contentType="workflow" 
            onGenerated={handleAIWorkflowGenerated}
            trigger={
              <Button variant="outline" size="sm" className="w-full" data-testid="ai-generate-workflow-btn">
                <Sparkles className="w-4 h-4 mr-2" /> Generate with AI
              </Button>
            }
          />
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {workflows.map((wf) => (
              <div
                key={wf.id}
                className={`
                  p-3 rounded-lg cursor-pointer transition-colors
                  ${selectedWorkflow?.id === wf.id ? 'bg-primary/10 border border-primary' : 'hover:bg-muted'}
                `}
                onClick={() => selectWorkflow(wf)}
              >
                <div className="font-medium text-sm flex items-center gap-2">
                  {wf.name}
                  {wf.ai_generated && (
                    <Tooltip>
                      <TooltipTrigger>
                        <Sparkles className="w-3 h-3 text-primary" />
                      </TooltipTrigger>
                      <TooltipContent>AI Generated</TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Updated {new Date(wf.updated_at).toLocaleDateString()}
                </div>
              </div>
            ))}
            {workflows.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No workflows yet. Create one to get started!
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Sidebar Footer */}
        <div className="p-4 border-t space-y-2">
          <Button variant="outline" size="sm" className="w-full" onClick={exportWorkflow} disabled={!selectedWorkflow}>
            <Download className="w-4 h-4 mr-2" /> Export JSON
          </Button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative">
        {selectedWorkflow ? (
          <ReactFlowProvider>
            <WorkflowCanvas
              workflowId={selectedWorkflow.id}
              layer={currentLayer}
              parentNodeId={parentNodeId}
              onNodeDoubleClick={handleNodeDoubleClick}
              breadcrumb={breadcrumb}
              onBreadcrumbClick={handleBreadcrumbClick}
              teamMembers={teamMembers}
              software={software}
              templates={templates}
              actionTemplates={actionTemplates}
              onSave={refreshWorkflows}
            />
          </ReactFlowProvider>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-gradient-to-b from-slate-50 to-white">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Layers className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Welcome to WorkflowViz</h3>
              <p className="text-sm mb-6">Create visual process maps to organize your business operations. Select a workflow from the sidebar or generate one with AI.</p>
              
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {Object.entries(NODE_CONFIG).slice(0, 5).map(([type, config]) => (
                  <div key={type} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted">
                    <div 
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: config.accentColor }}
                    />
                    <span className="text-xs">{config.label}</span>
                  </div>
                ))}
              </div>
              
              <div className="text-xs text-muted-foreground">
                <p className="flex items-center justify-center gap-1 mb-1">
                  <LayoutGrid className="w-3 h-3" /> Auto-layout for clean organization
                </p>
                <p className="flex items-center justify-center gap-1">
                  <Sparkles className="w-3 h-3" /> AI generates workflows from descriptions
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Templates */}
      <div className="w-64 border-l bg-muted/30 hidden lg:block">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Workflow Templates</h3>
        </div>
        <ScrollArea className="h-[calc(100%-60px)]">
          <div className="p-2 space-y-2">
            {templates.map((template) => (
              <Card key={template.id} className="cursor-pointer hover:border-primary transition-colors">
                <CardHeader className="p-3 pb-1">
                  <CardTitle className="text-sm">{template.name}</CardTitle>
                  <Badge variant="outline" className="w-fit text-xs">{template.category}</Badge>
                </CardHeader>
                <CardContent className="p-3 pt-1">
                  <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
    </TooltipProvider>
  );
};

export default WorkflowViz;
