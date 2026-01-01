"""
WorkflowViz - Data Models
Hierarchical Workflow Visualization System
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


# ==================== ENUMS ====================

class WorkflowLayer(str, Enum):
    STRATEGIC = "STRATEGIC"
    TACTICAL = "TACTICAL"
    EXECUTION = "EXECUTION"


class NodeType(str, Enum):
    ISSUE = "ISSUE"
    ACTION = "ACTION"
    RESOURCE = "RESOURCE"
    DELIVERABLE = "DELIVERABLE"
    STICKY_NOTE = "STICKY_NOTE"
    TASK = "TASK"
    BLOCKER = "BLOCKER"


class BlockerCategory(str, Enum):
    TECHNICAL = "TECHNICAL"
    RESOURCE = "RESOURCE"
    APPROVAL = "APPROVAL"
    EXTERNAL = "EXTERNAL"


class TaskStatus(str, Enum):
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    BLOCKED = "BLOCKED"
    DONE = "DONE"


class WorkflowAccessLevel(str, Enum):
    PUBLIC = "PUBLIC"
    FUNCTION_ONLY = "FUNCTION_ONLY"
    LEADERSHIP_ONLY = "LEADERSHIP_ONLY"
    PRIVATE = "PRIVATE"


class TemplateCategory(str, Enum):
    SALES = "SALES"
    MARKETING = "MARKETING"
    OPERATIONS = "OPERATIONS"
    FINANCE = "FINANCE"
    DEVELOPMENT = "DEVELOPMENT"
    POWERHOUSE = "POWERHOUSE"


class SoftwareCategory(str, Enum):
    CRM = "CRM"
    PROJECT_MANAGEMENT = "PROJECT_MANAGEMENT"
    AUTOMATION = "AUTOMATION"
    RECRUITMENT = "RECRUITMENT"
    COMMUNICATION = "COMMUNICATION"
    FILE_STORAGE = "FILE_STORAGE"
    DEVELOPMENT = "DEVELOPMENT"
    DESIGN = "DESIGN"
    CUSTOM = "CUSTOM"


class WorkloadLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


# ==================== POSITION & STYLE ====================

class NodePosition(BaseModel):
    x: float = 0
    y: float = 0


class NodeStyle(BaseModel):
    width: Optional[float] = None
    height: Optional[float] = None
    backgroundColor: Optional[str] = None
    borderColor: Optional[str] = None
    borderWidth: Optional[int] = None


# ==================== SOFTWARE DEFINITIONS ====================

class Software(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: SoftwareCategory
    icon: Optional[str] = None  # Icon identifier
    instance_url: Optional[str] = None  # e.g., "ClickUp Space: Marketing"
    is_predefined: bool = True


# ==================== TEAM MEMBER ====================

class TeamMember(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    role: str
    function: str  # Sales, Marketing, Ops, Finance, Dev, Powerhouse
    photo_url: Optional[str] = None
    workload: WorkloadLevel = WorkloadLevel.LOW
    active_assignments: int = 0
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TeamMemberCreate(BaseModel):
    name: str
    email: str
    role: str
    function: str
    photo_url: Optional[str] = None


# ==================== WORKFLOW NODE ====================

class WorkflowNodeData(BaseModel):
    """Data stored inside a workflow node"""
    label: str
    description: Optional[str] = None
    node_type: NodeType
    
    # Assignment fields
    assignee_ids: List[str] = []  # Team member IDs
    software_id: Optional[str] = None  # For Resource nodes
    software_instance: Optional[str] = None  # e.g., "ClickUp Space: Marketing"
    
    # Task-specific fields (Execution layer)
    status: Optional[TaskStatus] = None
    due_date: Optional[datetime] = None
    priority: Optional[str] = None  # Low, Medium, High, Urgent
    
    # Blocker-specific fields
    blocker_category: Optional[BlockerCategory] = None
    
    # Sticky note fields
    note_content: Optional[str] = None
    
    # Template reference
    from_template_id: Optional[str] = None
    
    # Metadata
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class WorkflowNode(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str = "custom"  # React Flow node type
    position: NodePosition
    data: WorkflowNodeData
    style: Optional[NodeStyle] = None
    
    # Hierarchy
    layer: WorkflowLayer
    parent_node_id: Optional[str] = None  # For Tactical nodes, points to Strategic parent
    workflow_id: str


class WorkflowNodeCreate(BaseModel):
    type: str = "custom"
    position: NodePosition
    data: WorkflowNodeData
    style: Optional[NodeStyle] = None
    layer: WorkflowLayer
    parent_node_id: Optional[str] = None


# ==================== WORKFLOW EDGE (CONNECTION) ====================

class WorkflowEdge(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    source: str  # Source node ID
    target: str  # Target node ID
    source_handle: Optional[str] = None
    target_handle: Optional[str] = None
    label: Optional[str] = None
    type: str = "smoothstep"  # Edge type for React Flow
    animated: bool = False
    style: Optional[Dict[str, Any]] = None
    
    # Hierarchy
    layer: WorkflowLayer
    workflow_id: str


class WorkflowEdgeCreate(BaseModel):
    source: str
    target: str
    source_handle: Optional[str] = None
    target_handle: Optional[str] = None
    label: Optional[str] = None
    type: str = "smoothstep"
    animated: bool = False
    layer: WorkflowLayer


# ==================== WORKFLOW ====================

class WorkflowBase(BaseModel):
    name: str
    description: Optional[str] = None
    access_level: WorkflowAccessLevel = WorkflowAccessLevel.PUBLIC
    function: Optional[str] = None  # For function-only access
    tags: List[str] = []


class WorkflowCreate(WorkflowBase):
    pass


class Workflow(WorkflowBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True
    
    # Version tracking
    version: int = 1
    last_auto_save: Optional[datetime] = None


# ==================== WORKFLOW VERSION (for history) ====================

class WorkflowVersion(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    workflow_id: str
    version_number: int
    nodes_snapshot: List[Dict[str, Any]]  # Serialized nodes
    edges_snapshot: List[Dict[str, Any]]  # Serialized edges
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None
    change_description: Optional[str] = None


# ==================== WORKFLOW TEMPLATE ====================

class WorkflowTemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    category: TemplateCategory
    tags: List[str] = []
    is_predefined: bool = False


class WorkflowTemplateCreate(WorkflowTemplateBase):
    nodes: List[Dict[str, Any]]  # Nodes with relative positions
    edges: List[Dict[str, Any]]  # Edges between template nodes


class WorkflowTemplate(WorkflowTemplateBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nodes: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    usage_count: int = 0
    is_active: bool = True


# ==================== PREDEFINED ACTION TEMPLATE ====================

class PredefinedActionTemplate(BaseModel):
    """Templates that auto-populate when creating specific action types"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    action_name: str  # e.g., "Discovery Call"
    resources: List[Dict[str, str]] = []  # [{name, software_id}]
    deliverables: List[str] = []  # List of deliverable names
    description: Optional[str] = None
    category: TemplateCategory
    is_active: bool = True


# ==================== LAYER CONTEXT ====================

class LayerContext(BaseModel):
    """Context when navigating between layers"""
    current_layer: WorkflowLayer
    workflow_id: str
    strategic_node_id: Optional[str] = None  # If in Tactical or Execution
    tactical_node_id: Optional[str] = None  # If in Execution
    breadcrumb: List[Dict[str, str]] = []  # [{layer, node_id, label}]


# ==================== CANVAS STATE ====================

class CanvasViewport(BaseModel):
    x: float = 0
    y: float = 0
    zoom: float = 1.0


class CanvasState(BaseModel):
    """Current state of the workflow canvas"""
    workflow_id: str
    layer: WorkflowLayer
    viewport: CanvasViewport = Field(default_factory=CanvasViewport)
    selected_node_ids: List[str] = []
    selected_edge_ids: List[str] = []
    context: Optional[LayerContext] = None


# ==================== EXPORT DATA ====================

class WorkflowExport(BaseModel):
    """Complete workflow data for export/import"""
    workflow: Workflow
    nodes: List[WorkflowNode]
    edges: List[WorkflowEdge]
    exported_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    export_version: str = "1.0"


# ==================== INTEGRATION MODELS ====================

class ClickUpTaskPush(BaseModel):
    """Data to push task to ClickUp"""
    node_id: str
    title: str
    description: Optional[str] = None
    assignee_email: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: Optional[str] = None
    list_id: str  # ClickUp list ID


class ClickUpTaskSync(BaseModel):
    """ClickUp task sync status"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    node_id: str
    clickup_task_id: str
    clickup_list_id: str
    last_synced: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    sync_status: str = "SYNCED"  # SYNCED, PENDING, ERROR


# ==================== DASHBOARD STATS ====================

class WorkflowVizStats(BaseModel):
    total_workflows: int
    total_templates: int
    total_team_members: int
    workflows_by_function: Dict[str, int]
    recent_workflows: List[Dict[str, Any]]
    popular_templates: List[Dict[str, Any]]
