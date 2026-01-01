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
} from 'reactflow';
import 'reactflow/dist/style.css';
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
  Clock, Target, Package, Lightbulb, Sparkles, HelpCircle, ArrowRight, LayoutGrid
} from 'lucide-react';
import axios from 'axios';
import AIGenerateDialog from './AIGenerateDialog';

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
  const [showNodeDialog, setShowNodeDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [newNodeType, setNewNodeType] = useState('ACTION');
  const [newNodeData, setNewNodeData] = useState({ label: '', description: '' });
  const [saveStatus, setSaveStatus] = useState('saved');
  const saveTimeoutRef = useRef(null);
  const { project, fitView } = useReactFlow();

  // Auto-layout function
  const applyAutoLayout = useCallback(() => {
    if (nodes.length === 0) return;
    
    const layoutedNodes = calculateAutoLayout(nodes, edges);
    setNodes(layoutedNodes);
    setTimeout(() => fitView({ padding: 0.2 }), 100);
  }, [nodes, edges, setNodes, fitView]);

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
        
        setNodes(nodesRes.data.map(n => ({
          ...n,
          type: 'custom',
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
        
        setTimeout(() => fitView({ padding: 0.2 }), 100);
      } catch (error) {
        console.error('Error loading workflow data:', error);
      }
    };
    loadData();
  }, [workflowId, layer, parentNodeId, setNodes, setEdges, fitView]);

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
  }, [setEdges, layer, workflowId]);

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  const onNodeDblClick = useCallback((event, node) => {
    if (node.data.node_type === 'ACTION' && layer !== 'EXECUTION') {
      onNodeDoubleClick?.(node);
    }
  }, [onNodeDoubleClick, layer]);

  const addNode = async (nodeType, templateData = null) => {
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
      
      setNodes((nds) => [...nds, { ...response.data, type: 'custom' }]);
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
    <div className="h-full w-full relative">
      {/* Breadcrumb Navigation */}
      <div className="absolute top-4 left-4 z-10 bg-background/90 backdrop-blur rounded-lg p-2 shadow-md flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => onBreadcrumbClick?.('STRATEGIC', null)}>
          <Home className="w-4 h-4 mr-1" />
          Strategic
        </Button>
        {breadcrumb?.map((crumb, i) => (
          <React.Fragment key={i}>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onBreadcrumbClick?.(crumb.layer, crumb.node_id)}
            >
              {crumb.label}
            </Button>
          </React.Fragment>
        ))}
        <Badge variant="outline" className="ml-2">{layer}</Badge>
      </div>

      {/* Toolbar */}
      <div className="absolute top-4 right-4 z-10 bg-background/90 backdrop-blur rounded-lg p-2 shadow-md flex items-center gap-2">
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
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[25, 25]}
        connectionMode="loose"
        connectionLineType="smoothstep"
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
      </ReactFlow>
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
    if (currentLayer === 'STRATEGIC') {
      setBreadcrumb([{ layer: 'TACTICAL', node_id: node.id, label: node.data.label }]);
      setCurrentLayer('TACTICAL');
      setParentNodeId(node.id);
    } else if (currentLayer === 'TACTICAL') {
      setBreadcrumb([
        ...breadcrumb,
        { layer: 'EXECUTION', node_id: node.id, label: node.data.label }
      ]);
      setCurrentLayer('EXECUTION');
      setParentNodeId(node.id);
    }
  };

  const handleBreadcrumbClick = (layer, nodeId) => {
    if (layer === 'STRATEGIC') {
      setCurrentLayer('STRATEGIC');
      setParentNodeId(null);
      setBreadcrumb([]);
    } else {
      const idx = breadcrumb.findIndex(b => b.layer === layer && b.node_id === nodeId);
      if (idx >= 0) {
        setBreadcrumb(breadcrumb.slice(0, idx + 1));
        setCurrentLayer(layer);
        setParentNodeId(nodeId);
      }
    }
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
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Layers className="w-16 h-16 mb-4 opacity-20" />
            <h3 className="text-lg font-medium">Select or create a workflow</h3>
            <p className="text-sm">Choose a workflow from the sidebar to start editing</p>
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
