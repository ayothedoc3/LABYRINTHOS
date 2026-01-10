"""
Playbook Engine Models
Models for translating strategy inputs into execution plans
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from enum import Enum
import uuid


class ExecutionPhase(str, Enum):
    """Phases of execution plan"""
    INITIATION = "INITIATION"
    PLANNING = "PLANNING"
    EXECUTION = "EXECUTION"
    MONITORING = "MONITORING"
    CLOSURE = "CLOSURE"


class MilestoneStatus(str, Enum):
    """Milestone status"""
    NOT_STARTED = "NOT_STARTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    BLOCKED = "BLOCKED"
    OVERDUE = "OVERDUE"


class RoleType(str, Enum):
    """Types of roles in execution"""
    EXECUTIVE_SPONSOR = "EXECUTIVE_SPONSOR"
    PROJECT_LEAD = "PROJECT_LEAD"
    COORDINATOR = "COORDINATOR"
    SPECIALIST = "SPECIALIST"
    SUPPORT = "SUPPORT"
    CLIENT_CONTACT = "CLIENT_CONTACT"


# ==================== STRATEGY INPUT MODELS ====================

class StrategyInput(BaseModel):
    """Input from Labyrinth Builder for execution plan generation"""
    issue_category: str  # e.g., "CLIENT_SERVICES"
    issue_type_id: str  # e.g., "gold"
    issue_name: str  # e.g., "Gold Package"
    sprint_timeline: str  # e.g., "TWO_THREE_WEEKS"
    tier: str  # e.g., "TIER_1"
    client_name: Optional[str] = None
    client_package: Optional[str] = None
    description: Optional[str] = None
    priority: str = "MEDIUM"  # LOW, MEDIUM, HIGH, URGENT
    budget: Optional[float] = None
    custom_requirements: List[str] = []


# ==================== EXECUTION PLAN COMPONENTS ====================

class ExecutionRole(BaseModel):
    """Role assignment in execution plan"""
    id: str = Field(default_factory=lambda: f"role_{uuid.uuid4().hex[:8]}")
    role_type: RoleType
    title: str
    responsibilities: List[str] = []
    assigned_to: Optional[str] = None  # User ID
    assigned_name: Optional[str] = None
    required_skills: List[str] = []
    time_commitment: str = "full-time"  # full-time, part-time, as-needed


class ExecutionMilestone(BaseModel):
    """Milestone in execution plan"""
    id: str = Field(default_factory=lambda: f"milestone_{uuid.uuid4().hex[:8]}")
    name: str
    description: str
    phase: ExecutionPhase
    status: MilestoneStatus = MilestoneStatus.NOT_STARTED
    due_date: Optional[datetime] = None
    completed_date: Optional[datetime] = None
    dependencies: List[str] = []  # Other milestone IDs
    deliverables: List[str] = []
    success_criteria: List[str] = []
    owner_role_id: Optional[str] = None
    progress_percent: int = 0


class ExecutionTask(BaseModel):
    """Task within a milestone"""
    id: str = Field(default_factory=lambda: f"task_{uuid.uuid4().hex[:8]}")
    milestone_id: str
    title: str
    description: str = ""
    priority: str = "MEDIUM"
    status: str = "pending"
    assigned_role_id: Optional[str] = None
    estimated_hours: float = 0
    due_date: Optional[datetime] = None
    completed_date: Optional[datetime] = None
    sop_reference: Optional[str] = None  # Link to SOP
    template_reference: Optional[str] = None  # Link to template


class ExecutionContract(BaseModel):
    """Contract generated from execution plan"""
    id: str = Field(default_factory=lambda: f"exec_contract_{uuid.uuid4().hex[:8]}")
    name: str
    client_name: str
    client_package: str
    function: str
    contract_type: str = "service_agreement"
    stage: str = "PROPOSAL"
    estimated_value: float = 0
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    linked_plan_id: str  # Link to execution plan
    deliverables: List[str] = []
    terms: Optional[str] = None


class CommunicationChannel(BaseModel):
    """Communication setup for execution"""
    id: str = Field(default_factory=lambda: f"channel_{uuid.uuid4().hex[:8]}")
    name: str
    channel_type: str  # "thread", "slack", "email"
    purpose: str
    participants: List[str] = []
    thread_id: Optional[str] = None  # Link to Communication Thread


# ==================== EXECUTION PLAN MODEL ====================

class ExecutionPlan(BaseModel):
    """Complete execution plan generated from strategy"""
    id: str = Field(default_factory=lambda: f"plan_{uuid.uuid4().hex[:8]}")
    name: str
    description: str
    
    # Source info
    strategy_input: StrategyInput
    playbook_id: Optional[str] = None
    
    # Plan components
    phases: List[ExecutionPhase] = []
    roles: List[ExecutionRole] = []
    milestones: List[ExecutionMilestone] = []
    tasks: List[ExecutionTask] = []
    contracts: List[ExecutionContract] = []
    communication_channels: List[CommunicationChannel] = []
    
    # Timeline
    start_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    target_end_date: Optional[datetime] = None
    actual_end_date: Optional[datetime] = None
    
    # Status
    status: str = "draft"  # draft, active, paused, completed, cancelled
    progress_percent: int = 0
    
    # Metadata
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str = "system"
    
    # Budget tracking
    estimated_budget: float = 0
    actual_cost: float = 0
    
    # Risk and notes
    risks: List[Dict[str, Any]] = []
    notes: List[str] = []


class ExecutionPlanSummary(BaseModel):
    """Summary view of execution plan"""
    id: str
    name: str
    status: str
    progress_percent: int
    start_date: datetime
    target_end_date: Optional[datetime]
    total_milestones: int
    completed_milestones: int
    total_tasks: int
    completed_tasks: int
    client_name: Optional[str]
    issue_category: str


# ==================== PLAYBOOK TEMPLATES ====================

# Pre-defined execution templates based on issue category and tier
EXECUTION_TEMPLATES = {
    "CLIENT_SERVICES": {
        "phases": [
            ExecutionPhase.INITIATION,
            ExecutionPhase.PLANNING,
            ExecutionPhase.EXECUTION,
            ExecutionPhase.MONITORING,
            ExecutionPhase.CLOSURE
        ],
        "roles_template": [
            {"role_type": RoleType.PROJECT_LEAD, "title": "Account Manager", "time_commitment": "full-time"},
            {"role_type": RoleType.COORDINATOR, "title": "Project Coordinator", "time_commitment": "full-time"},
            {"role_type": RoleType.SPECIALIST, "title": "Service Specialist", "time_commitment": "full-time"},
            {"role_type": RoleType.CLIENT_CONTACT, "title": "Client Point of Contact", "time_commitment": "as-needed"},
        ],
        "milestones_template": [
            {"name": "Client Onboarding", "phase": ExecutionPhase.INITIATION, "day_offset": 0},
            {"name": "Requirements Gathering", "phase": ExecutionPhase.PLANNING, "day_offset": 3},
            {"name": "Service Plan Approval", "phase": ExecutionPhase.PLANNING, "day_offset": 7},
            {"name": "Service Delivery Start", "phase": ExecutionPhase.EXECUTION, "day_offset": 10},
            {"name": "Mid-Project Review", "phase": ExecutionPhase.MONITORING, "day_offset": 14},
            {"name": "Final Delivery", "phase": ExecutionPhase.EXECUTION, "day_offset": 21},
            {"name": "Client Sign-off", "phase": ExecutionPhase.CLOSURE, "day_offset": 25},
        ]
    },
    "OPERATIONS": {
        "phases": [
            ExecutionPhase.INITIATION,
            ExecutionPhase.PLANNING,
            ExecutionPhase.EXECUTION,
            ExecutionPhase.CLOSURE
        ],
        "roles_template": [
            {"role_type": RoleType.PROJECT_LEAD, "title": "Operations Lead", "time_commitment": "full-time"},
            {"role_type": RoleType.COORDINATOR, "title": "Operations Coordinator", "time_commitment": "full-time"},
            {"role_type": RoleType.SPECIALIST, "title": "Process Specialist", "time_commitment": "part-time"},
        ],
        "milestones_template": [
            {"name": "Project Kickoff", "phase": ExecutionPhase.INITIATION, "day_offset": 0},
            {"name": "Process Analysis", "phase": ExecutionPhase.PLANNING, "day_offset": 5},
            {"name": "Implementation Plan", "phase": ExecutionPhase.PLANNING, "day_offset": 10},
            {"name": "Rollout", "phase": ExecutionPhase.EXECUTION, "day_offset": 15},
            {"name": "Documentation", "phase": ExecutionPhase.CLOSURE, "day_offset": 20},
        ]
    },
    "CONSULTATION": {
        "phases": [
            ExecutionPhase.INITIATION,
            ExecutionPhase.PLANNING,
            ExecutionPhase.EXECUTION,
            ExecutionPhase.CLOSURE
        ],
        "roles_template": [
            {"role_type": RoleType.EXECUTIVE_SPONSOR, "title": "Engagement Partner", "time_commitment": "part-time"},
            {"role_type": RoleType.PROJECT_LEAD, "title": "Lead Consultant", "time_commitment": "full-time"},
            {"role_type": RoleType.SPECIALIST, "title": "Subject Matter Expert", "time_commitment": "part-time"},
        ],
        "milestones_template": [
            {"name": "Discovery Session", "phase": ExecutionPhase.INITIATION, "day_offset": 0},
            {"name": "Analysis Complete", "phase": ExecutionPhase.PLANNING, "day_offset": 7},
            {"name": "Recommendations Presented", "phase": ExecutionPhase.EXECUTION, "day_offset": 14},
            {"name": "Implementation Support", "phase": ExecutionPhase.EXECUTION, "day_offset": 21},
            {"name": "Final Report", "phase": ExecutionPhase.CLOSURE, "day_offset": 28},
        ]
    },
    "CRISIS_MANAGEMENT": {
        "phases": [
            ExecutionPhase.INITIATION,
            ExecutionPhase.EXECUTION,
            ExecutionPhase.MONITORING,
            ExecutionPhase.CLOSURE
        ],
        "roles_template": [
            {"role_type": RoleType.EXECUTIVE_SPONSOR, "title": "Crisis Commander", "time_commitment": "full-time"},
            {"role_type": RoleType.PROJECT_LEAD, "title": "Response Lead", "time_commitment": "full-time"},
            {"role_type": RoleType.COORDINATOR, "title": "Communications Coordinator", "time_commitment": "full-time"},
            {"role_type": RoleType.SPECIALIST, "title": "Technical Specialist", "time_commitment": "full-time"},
        ],
        "milestones_template": [
            {"name": "Situation Assessment", "phase": ExecutionPhase.INITIATION, "day_offset": 0},
            {"name": "Response Activated", "phase": ExecutionPhase.EXECUTION, "day_offset": 1},
            {"name": "Containment Achieved", "phase": ExecutionPhase.EXECUTION, "day_offset": 3},
            {"name": "Recovery In Progress", "phase": ExecutionPhase.MONITORING, "day_offset": 5},
            {"name": "Post-Incident Review", "phase": ExecutionPhase.CLOSURE, "day_offset": 14},
        ]
    },
    "APP_DEVELOPMENT": {
        "phases": [
            ExecutionPhase.INITIATION,
            ExecutionPhase.PLANNING,
            ExecutionPhase.EXECUTION,
            ExecutionPhase.MONITORING,
            ExecutionPhase.CLOSURE
        ],
        "roles_template": [
            {"role_type": RoleType.EXECUTIVE_SPONSOR, "title": "Product Owner", "time_commitment": "part-time"},
            {"role_type": RoleType.PROJECT_LEAD, "title": "Tech Lead", "time_commitment": "full-time"},
            {"role_type": RoleType.COORDINATOR, "title": "Scrum Master", "time_commitment": "full-time"},
            {"role_type": RoleType.SPECIALIST, "title": "Developer", "time_commitment": "full-time"},
            {"role_type": RoleType.SPECIALIST, "title": "QA Engineer", "time_commitment": "part-time"},
        ],
        "milestones_template": [
            {"name": "Project Kickoff", "phase": ExecutionPhase.INITIATION, "day_offset": 0},
            {"name": "Requirements Finalized", "phase": ExecutionPhase.PLANNING, "day_offset": 7},
            {"name": "Architecture Approved", "phase": ExecutionPhase.PLANNING, "day_offset": 14},
            {"name": "Sprint 1 Complete", "phase": ExecutionPhase.EXECUTION, "day_offset": 28},
            {"name": "Sprint 2 Complete", "phase": ExecutionPhase.EXECUTION, "day_offset": 42},
            {"name": "Testing Complete", "phase": ExecutionPhase.MONITORING, "day_offset": 49},
            {"name": "Launch Ready", "phase": ExecutionPhase.CLOSURE, "day_offset": 56},
        ]
    }
}


# Tier multipliers for timeline and resources
TIER_MULTIPLIERS = {
    "TIER_1": {"timeline": 0.75, "resources": 1.5, "budget": 1.5},  # Faster, more resources
    "TIER_2": {"timeline": 1.0, "resources": 1.0, "budget": 1.0},   # Standard
    "TIER_3": {"timeline": 1.25, "resources": 0.75, "budget": 0.75}  # Slower, fewer resources
}


# Sprint timeline to days mapping
SPRINT_DAYS = {
    "YESTERDAY": 1,
    "THREE_DAYS": 3,
    "ONE_WEEK": 7,
    "TWO_THREE_WEEKS": 21,
    "FOUR_SIX_WEEKS": 42,
    "SIX_PLUS_WEEKS": 49
}
