"""
Labyrinth Contract Lifecycle - Data Models
Stage-gated contract progression system

WORKFLOW: Strategy → SOW → Bids/Proposals → Contracts → Milestones → Execution
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


# ==================== CONTRACT LIFECYCLE ENUMS ====================

class ContractStage(str, Enum):
    """Contract lifecycle stages - CANNOT skip stages
    
    WORKFLOW: Strategy → SOW → Bids/Proposals → Contracts → Milestones → Execution
    """
    STRATEGY = "STRATEGY"               # Initial strategy development
    SOW = "SOW"                         # Scope of Work creation
    PROPOSAL = "PROPOSAL"               # Proposal created from SOW
    BID_SUBMITTED = "BID_SUBMITTED"     # Internal bids submitted
    BID_APPROVED = "BID_APPROVED"       # Bids approved by manager
    CONTRACT = "CONTRACT"               # Contract finalization
    INACTIVE = "INACTIVE"               # Contract created but not started
    QUEUED = "QUEUED"                   # Approved, waiting for capacity
    ACTIVE = "ACTIVE"                   # Currently executing (Milestones)
    EXECUTION = "EXECUTION"             # Full execution phase
    PAUSED = "PAUSED"                   # Temporarily halted
    COMPLETED = "COMPLETED"             # Successfully finished
    CLOSED = "CLOSED"                   # Archived


# Valid stage transitions (stage-gating enforcement)
VALID_STAGE_TRANSITIONS: Dict[ContractStage, List[ContractStage]] = {
    ContractStage.STRATEGY: [ContractStage.SOW],
    ContractStage.SOW: [ContractStage.PROPOSAL, ContractStage.STRATEGY],  # Can go back
    ContractStage.PROPOSAL: [ContractStage.BID_SUBMITTED, ContractStage.SOW],
    ContractStage.BID_SUBMITTED: [ContractStage.BID_APPROVED, ContractStage.PROPOSAL],
    ContractStage.BID_APPROVED: [ContractStage.CONTRACT],
    ContractStage.CONTRACT: [ContractStage.INACTIVE, ContractStage.BID_APPROVED],
    ContractStage.INACTIVE: [ContractStage.QUEUED],
    ContractStage.QUEUED: [ContractStage.ACTIVE, ContractStage.INACTIVE],
    ContractStage.ACTIVE: [ContractStage.EXECUTION, ContractStage.PAUSED],
    ContractStage.EXECUTION: [ContractStage.COMPLETED, ContractStage.PAUSED],
    ContractStage.PAUSED: [ContractStage.ACTIVE, ContractStage.EXECUTION, ContractStage.CLOSED],
    ContractStage.COMPLETED: [ContractStage.CLOSED],
    ContractStage.CLOSED: [],  # Terminal state
}


class ContractType(str, Enum):
    PROJECT_BASED = "PROJECT_BASED"   # Fixed deliverables with milestones
    RECURRING = "RECURRING"           # Ongoing with KPIs
    RETAINER = "RETAINER"             # Time-based allocation


class MilestoneStatus(str, Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    REVIEW = "REVIEW"
    COMPLETED = "COMPLETED"
    BLOCKED = "BLOCKED"


# ==================== MILESTONE MODEL ====================

class Milestone(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    order: int
    status: MilestoneStatus = MilestoneStatus.PENDING
    due_date: Optional[datetime] = None
    completed_date: Optional[datetime] = None
    deliverables: List[str] = []
    dependencies: List[str] = []  # IDs of milestones that must be completed first
    assigned_to: List[str] = []   # User IDs
    kpi_ids: List[str] = []


# ==================== BID MODEL ====================

class BidStatus(str, Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    WITHDRAWN = "WITHDRAWN"


class Bid(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    contract_id: str
    bidder_id: str
    bidder_name: str
    function: str
    proposed_rate: Optional[float] = None
    proposed_hours: Optional[int] = None
    proposal_notes: str = ""
    status: BidStatus = BidStatus.PENDING
    submitted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[str] = None


# ==================== LIFECYCLE CONTRACT MODEL ====================

class LifecycleContractBase(BaseModel):
    name: str
    description: str
    client_name: str
    client_package: str  # BRONZE, SILVER, GOLD, BLACK
    contract_type: ContractType
    playbook_ids: List[str] = []
    sop_ids: List[str] = []
    function: str
    estimated_value: Optional[float] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class LifecycleContractCreate(LifecycleContractBase):
    pass


class LifecycleContract(LifecycleContractBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    stage: ContractStage = ContractStage.STRATEGY  # Start at STRATEGY
    
    # Strategy & SOW fields
    strategy_notes: str = ""
    strategy_goals: List[str] = []
    sow_document: str = ""  # SOW content/markdown
    sow_deliverables: List[str] = []
    sow_timeline: str = ""
    sow_budget: Optional[float] = None
    
    # Stage timestamps
    strategy_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    sow_date: Optional[datetime] = None
    proposal_date: Optional[datetime] = None
    bid_submitted_date: Optional[datetime] = None
    bid_approved_date: Optional[datetime] = None
    contract_date: Optional[datetime] = None
    activated_date: Optional[datetime] = None
    execution_date: Optional[datetime] = None
    paused_date: Optional[datetime] = None
    completed_date: Optional[datetime] = None
    closed_date: Optional[datetime] = None
    
    # Relationships
    milestones: List[Milestone] = []
    bids: List[Bid] = []
    assigned_team: List[str] = []  # User IDs
    kpi_ids: List[str] = []
    communication_thread_id: Optional[str] = None
    
    # Metadata
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    def can_transition_to(self, new_stage: ContractStage) -> bool:
        """Check if transition to new stage is valid"""
        valid_transitions = VALID_STAGE_TRANSITIONS.get(self.stage, [])
        return new_stage in valid_transitions
    
    def get_stage_requirements(self) -> Dict[str, Any]:
        """Get requirements to move to next stage"""
        requirements = {
            ContractStage.STRATEGY: {
                "next": ContractStage.SOW,
                "requirements": ["Define strategy goals", "Identify client needs"],
            },
            ContractStage.SOW: {
                "next": ContractStage.PROPOSAL,
                "requirements": ["Complete scope of work document", "Define deliverables"],
            },
            ContractStage.PROPOSAL: {
                "next": ContractStage.BID_SUBMITTED,
                "requirements": ["At least one bid must be submitted"],
            },
            ContractStage.BID_SUBMITTED: {
                "next": ContractStage.BID_APPROVED,
                "requirements": ["Manager must approve at least one bid"],
            },
            ContractStage.BID_APPROVED: {
                "next": ContractStage.CONTRACT,
                "requirements": ["Contract details must be finalized"],
            },
            ContractStage.CONTRACT: {
                "next": ContractStage.INACTIVE,
                "requirements": ["Legal review complete", "Terms finalized"],
            },
            ContractStage.INACTIVE: {
                "next": ContractStage.QUEUED,
                "requirements": ["Client must sign contract", "Initial payment received"],
            },
            ContractStage.QUEUED: {
                "next": ContractStage.ACTIVE,
                "requirements": ["Capacity available", "Team assigned", "Playbooks loaded"],
            },
            ContractStage.ACTIVE: {
                "next": ContractStage.EXECUTION,
                "requirements": ["All milestones defined", "Team fully onboarded"],
            },
            ContractStage.EXECUTION: {
                "next": ContractStage.COMPLETED,
                "requirements": ["All milestones completed", "Final deliverables approved"],
            },
        }
        return requirements.get(self.stage, {})


# ==================== STAGE TRANSITION LOG ====================

class StageTransition(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    contract_id: str
    from_stage: Optional[ContractStage] = None  # None for initial creation
    to_stage: ContractStage
    transitioned_by: str
    reason: str = ""
    notes: str = ""
    transitioned_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ==================== COMMUNICATION THREAD ====================

class MessageType(str, Enum):
    TASK_REQUEST = "TASK_REQUEST"
    DOCUMENT_REQUEST = "DOCUMENT_REQUEST"
    MEETING_REQUEST = "MEETING_REQUEST"
    DECISION_REQUEST = "DECISION_REQUEST"
    SYSTEM_MESSAGE = "SYSTEM_MESSAGE"
    GENERAL = "GENERAL"


class MessagePriority(str, Enum):
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    URGENT = "URGENT"


class ThreadMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    thread_id: str
    sender_id: str
    sender_name: str
    message_type: MessageType
    content: str
    priority: MessagePriority = MessagePriority.NORMAL
    due_date: Optional[datetime] = None
    assigned_to: Optional[str] = None
    is_resolved: bool = False
    resolved_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CommunicationThread(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    contract_id: str
    contract_name: str
    participants: List[str] = []  # User IDs
    messages: List[ThreadMessage] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ==================== STAGE INFO ====================

STAGE_INFO: Dict[ContractStage, Dict[str, Any]] = {
    ContractStage.STRATEGY: {
        "display_name": "Strategy",
        "description": "Initial strategy development and client discovery",
        "color": "#8B5CF6",  # Purple
        "icon": "Lightbulb",
        "allowed_roles": ["ADMIN", "EXECUTIVE", "PROJECT_DIRECTOR", "SALES"],
    },
    ContractStage.SOW: {
        "display_name": "Scope of Work",
        "description": "Defining deliverables, timeline, and requirements",
        "color": "#6366F1",  # Indigo
        "icon": "FileSignature",
        "allowed_roles": ["ADMIN", "EXECUTIVE", "PROJECT_DIRECTOR", "MANAGER"],
    },
    ContractStage.PROPOSAL: {
        "display_name": "Proposal",
        "description": "Formal proposal created from SOW, awaiting bids",
        "color": "#64748B",  # Slate
        "icon": "FileText",
        "allowed_roles": ["ADMIN", "EXECUTIVE", "MANAGER", "SALES"],
    },
    ContractStage.BID_SUBMITTED: {
        "display_name": "Bid Submitted",
        "description": "Internal bids received, awaiting approval",
        "color": "#F59E0B",  # Amber
        "icon": "Send",
        "allowed_roles": ["ADMIN", "EXECUTIVE", "MANAGER"],
    },
    ContractStage.BID_APPROVED: {
        "display_name": "Bid Approved",
        "description": "Bids approved, finalizing contract",
        "color": "#10B981",  # Emerald
        "icon": "CheckCircle",
        "allowed_roles": ["ADMIN", "EXECUTIVE", "ACCOUNTABILITY"],
    },
    ContractStage.CONTRACT: {
        "display_name": "Contract",
        "description": "Contract finalization and legal review",
        "color": "#0EA5E9",  # Sky
        "icon": "FileCheck",
        "allowed_roles": ["ADMIN", "EXECUTIVE", "ACCOUNTABILITY"],
    },
    ContractStage.INACTIVE: {
        "display_name": "Inactive",
        "description": "Contract created, awaiting client signature",
        "color": "#6B7280",  # Gray
        "icon": "Pause",
        "allowed_roles": ["ADMIN", "ACCOUNTABILITY"],
    },
    ContractStage.QUEUED: {
        "display_name": "In Queue",
        "description": "Approved and signed, waiting for capacity",
        "color": "#3B82F6",  # Blue
        "icon": "Clock",
        "allowed_roles": ["ADMIN", "ACCOUNTABILITY"],
    },
    ContractStage.ACTIVE: {
        "display_name": "Milestones",
        "description": "Active milestone tracking and delivery",
        "color": "#22C55E",  # Green
        "icon": "Target",
        "allowed_roles": ["ADMIN", "ACCOUNTABILITY", "COORDINATOR"],
    },
    ContractStage.EXECUTION: {
        "display_name": "Execution",
        "description": "Full execution phase with deliverables",
        "color": "#14B8A6",  # Teal
        "icon": "Rocket",
        "allowed_roles": ["ADMIN", "ACCOUNTABILITY", "COORDINATOR"],
    },
    ContractStage.PAUSED: {
        "display_name": "Paused",
        "description": "Temporarily halted",
        "color": "#EAB308",  # Yellow
        "icon": "PauseCircle",
        "allowed_roles": ["ADMIN", "ACCOUNTABILITY"],
    },
    ContractStage.COMPLETED: {
        "display_name": "Completed",
        "description": "Successfully finished",
        "color": "#8B5CF6",  # Purple
        "icon": "CheckCircle2",
        "allowed_roles": ["ADMIN", "ACCOUNTABILITY"],
    },
    ContractStage.CLOSED: {
        "display_name": "Closed",
        "description": "Archived",
        "color": "#1F2937",  # Dark gray
        "icon": "Archive",
        "allowed_roles": ["ADMIN"],
    },
}
