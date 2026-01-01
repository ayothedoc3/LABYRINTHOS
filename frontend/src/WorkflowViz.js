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
  Plus, Save, Undo, Redo, Download, Upload, Share2, ZoomIn, ZoomOut, Maximize2,
  AlertTriangle, Zap, FolderOpen, FileText, StickyNote, ListTodo, Ban,
  ChevronRight, ChevronLeft, Home, Users, Settings2, Layers, Search,
  RefreshCw, Trash2, Copy, Eye, X
} from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api/workflowviz`;

// ==================== NODE STYLES ====================

const NODE_STYLES = {
  ISSUE: {
    background: '#EF4444',
    color: 'white',
    icon: AlertTriangle,
    shape: 'hexagon',
  },
  ACTION: {
    background: '#3B82F6',
    color: 'white',
    icon: Zap,
    shape: 'rounded',
  },
  RESOURCE: {
    background: '#10B981',
    color: 'white',
    icon: FolderOpen,
    shape: 'circle',
  },
  DELIVERABLE: {
    background: '#8B5CF6',
    color: 'white',
    icon: FileText,
    shape: 'diamond',
  },
  STICKY_NOTE: {
    background: '#FCD34D',
    color: 'black',
    icon: StickyNote,
    shape: 'square',
  },
  TASK: {
    background: '#06B6D4',
    color: 'white',
    icon: ListTodo,
    shape: 'rounded',
  },
  BLOCKER: {
    background: '#F97316',
    color: 'white',
    icon: Ban,
    shape: 'rounded',
  },
};

// ==================== CUSTOM NODE COMPONENT ====================

const CustomNode = ({ data, selected }) => {
  const style = NODE_STYLES[data.node_type] || NODE_STYLES.ACTION;
  const Icon = style.icon;

  const getShapeClass = () => {
    switch (style.shape) {
      case 'hexagon':
        return 'clip-hexagon';
      case 'circle':
        return 'rounded-full aspect-square';
      case 'diamond':
        return 'rotate-45';
      default:
        return 'rounded-lg';
    }
  };

  return (
    <div
      className={`
        min-w-[140px] max-w-[200px] p-3 shadow-lg transition-all duration-200
        ${style.shape === 'diamond' ? '' : getShapeClass()}
        ${selected ? 'ring-2 ring-primary ring-offset-2 scale-105' : 'hover:shadow-xl hover:scale-102'}
      `}
      style={{
        backgroundColor: style.background,
        color: style.color,
        transform: style.shape === 'diamond' ? 'rotate(45deg)' : undefined,
      }}
    >
      <div style={{ transform: style.shape === 'diamond' ? 'rotate(-45deg)' : undefined }}>
        <div className="flex items-center gap-2 mb-1">
          <Icon className="w-4 h-4 flex-shrink-0" />
          <span className="font-semibold text-sm truncate">{data.label}</span>
        </div>
        {data.description && (
          <p className="text-xs opacity-80 line-clamp-2">{data.description}</p>
        )}
        {data.assignee_ids && data.assignee_ids.length > 0 && (
          <div className="flex items-center gap-1 mt-2">
            <Users className="w-3 h-3" />
            <span className="text-xs">{data.assignee_ids.length} assigned</span>
          </div>
        )}
        {data.status && (
          <Badge variant="secondary" className="mt-1 text-xs">
            {data.status}
          </Badge>
        )}
      </div>
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
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
          markerEnd: { type: MarkerType.ArrowClosed },
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
    if (nodes.length > 0 || edges.length > 0) {
      triggerAutoSave();
    }
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [nodes, edges, triggerAutoSave]);

  const onConnect = useCallback((params) => {
    const newEdge = {
      ...params,
      id: `edge-${Date.now()}`,
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed },
      layer,
      workflow_id: workflowId,
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
    const timestamp = Date.now();

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
        
        <Button size="sm" variant="ghost" onClick={() => fitView({ padding: 0.2 })}>
          <Maximize2 className="w-4 h-4" />
        </Button>

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

      {/* Selected Node Panel */}
      {selectedNode && (
        <div className="absolute bottom-4 left-4 z-10 bg-background/95 backdrop-blur rounded-lg p-4 shadow-lg w-80">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">{selectedNode.data.label}</h3>
            <Button variant="ghost" size="sm" onClick={() => setSelectedNode(null)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-3">
            <Badge style={{ backgroundColor: NODE_STYLES[selectedNode.data.node_type]?.background }}>
              {selectedNode.data.node_type}
            </Badge>
            
            {selectedNode.data.description && (
              <p className="text-sm text-muted-foreground">{selectedNode.data.description}</p>
            )}

            {/* Assignee picker for ACTION nodes */}
            {selectedNode.data.node_type === 'ACTION' && (
              <div>
                <Label className="text-xs">Assign Team Members</Label>
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
                <Label className="text-xs">Software/Tool</Label>
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
                <Label className="text-xs">Status</Label>
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

            <div className="flex gap-2 pt-2">
              {(selectedNode.data.node_type === 'ACTION' && layer !== 'EXECUTION') && (
                <Button size="sm" variant="outline" onClick={() => onNodeDblClick(null, selectedNode)}>
                  <ChevronRight className="w-4 h-4 mr-1" /> Drill Down
                </Button>
              )}
              <Button size="sm" variant="destructive" onClick={deleteSelectedNode}>
                <Trash2 className="w-4 h-4 mr-1" /> Delete
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
        snapGrid={[15, 15]}
        connectionMode="loose"
        defaultEdgeOptions={{
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed },
        }}
      >
        <Controls />
        <MiniMap 
          nodeColor={(node) => NODE_STYLES[node.data?.node_type]?.background || '#999'}
          maskColor="rgba(0,0,0,0.1)"
        />
        <Background variant="dots" gap={20} size={1} />
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

  // Load initial data
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-200px)] min-h-[600px] flex" data-testid="workflowviz">
      {/* Sidebar */}
      <div className="w-72 border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Workflows</h2>
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
                <div className="font-medium text-sm">{wf.name}</div>
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
  );
};

export default WorkflowViz;
