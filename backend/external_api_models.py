"""
External API Models
Pydantic models for CRM integration endpoints
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid


class DealStage(str, Enum):
    """Deal stages for CRM pipeline"""
    DISCOVERY = "discovery"
    QUALIFICATION = "qualification"
    PROPOSAL = "proposal"
    NEGOTIATION = "negotiation"
    CLOSED_WON = "closed_won"
    CLOSED_LOST = "closed_lost"


class LeadStatus(str, Enum):
    """Lead statuses"""
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    UNQUALIFIED = "unqualified"


class LeadTier(str, Enum):
    """Lead tier classification"""
    BRONZE = "bronze"
    SILVER = "silver"
    GOLD = "gold"
    PLATINUM = "platinum"


class TaskPriority(str, Enum):
    """Task priority levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TaskStatus(str, Enum):
    """Task statuses"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


# ==================== DEAL MODELS ====================

class DealCreate(BaseModel):
    """Model for creating a deal from CRM"""
    name: str
    value: int  # in cents
    stage: DealStage = DealStage.DISCOVERY
    lead_id: Optional[str] = None
    owner_id: Optional[str] = None
    partner_id: Optional[str] = None  # For affiliate tracking
    created_at: Optional[datetime] = None
    metadata: Optional[dict] = None


class DealUpdate(BaseModel):
    """Model for updating a deal"""
    name: Optional[str] = None
    value: Optional[int] = None
    stage: Optional[DealStage] = None
    status: Optional[str] = None  # "won" or "lost" for closing
    owner_id: Optional[str] = None
    close_reason: Optional[str] = None
    metadata: Optional[dict] = None


class Deal(BaseModel):
    """Full deal model"""
    id: str = Field(default_factory=lambda: f"deal_{uuid.uuid4().hex[:12]}")
    name: str
    value: int
    stage: DealStage
    lead_id: Optional[str] = None
    owner_id: Optional[str] = None
    partner_id: Optional[str] = None
    contract_id: Optional[str] = None  # Created when deal is won
    communication_thread_id: Optional[str] = None
    status: str = "open"  # open, won, lost
    close_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    closed_at: Optional[datetime] = None
    metadata: Optional[dict] = None


class StageValidationResult(BaseModel):
    """Result of stage validation check"""
    allowed: bool
    message: str
    missing_requirements: List[str] = []
    current_stage: str
    requested_stage: str


# ==================== LEAD MODELS ====================

class ExternalLeadCreate(BaseModel):
    """Model for creating a lead from CRM"""
    name: str
    email: str
    company: Optional[str] = None
    phone: Optional[str] = None
    source: str = "api"
    tier: LeadTier = LeadTier.BRONZE
    status: LeadStatus = LeadStatus.NEW
    owner_id: Optional[str] = None
    metadata: Optional[dict] = None


class ExternalLeadUpdate(BaseModel):
    """Model for updating a lead"""
    name: Optional[str] = None
    email: Optional[str] = None
    company: Optional[str] = None
    phone: Optional[str] = None
    tier: Optional[LeadTier] = None
    status: Optional[LeadStatus] = None
    owner_id: Optional[str] = None
    metadata: Optional[dict] = None


class ExternalLead(BaseModel):
    """Full external lead model"""
    id: str = Field(default_factory=lambda: f"lead_{uuid.uuid4().hex[:12]}")
    name: str
    email: str
    company: Optional[str] = None
    phone: Optional[str] = None
    source: str
    tier: LeadTier
    status: LeadStatus
    owner_id: Optional[str] = None
    communication_thread_id: Optional[str] = None
    deal_id: Optional[str] = None
    qualified_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: Optional[dict] = None


# ==================== TASK MODELS ====================

class TaskCreate(BaseModel):
    """Model for creating a task from CRM"""
    title: str
    description: Optional[str] = None
    deal_id: Optional[str] = None
    lead_id: Optional[str] = None
    owner_id: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: TaskPriority = TaskPriority.MEDIUM
    metadata: Optional[dict] = None


class TaskUpdate(BaseModel):
    """Model for updating a task"""
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    owner_id: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: Optional[TaskPriority] = None
    metadata: Optional[dict] = None


class Task(BaseModel):
    """Full task model"""
    id: str = Field(default_factory=lambda: f"task_{uuid.uuid4().hex[:12]}")
    title: str
    description: Optional[str] = None
    deal_id: Optional[str] = None
    lead_id: Optional[str] = None
    owner_id: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: TaskPriority
    status: TaskStatus = TaskStatus.PENDING
    sla_breached: bool = False
    sla_breach_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: Optional[dict] = None


# ==================== PARTNER MODELS ====================

class PartnerCreate(BaseModel):
    """Model for creating a partner/affiliate from CRM"""
    name: str
    email: str
    company: Optional[str] = None
    commission_rate: float = 10.0  # percentage
    tier: str = "bronze"
    metadata: Optional[dict] = None


class Partner(BaseModel):
    """Full partner model"""
    id: str = Field(default_factory=lambda: f"partner_{uuid.uuid4().hex[:12]}")
    name: str
    email: str
    company: Optional[str] = None
    commission_rate: float
    tier: str
    referral_code: str = Field(default_factory=lambda: f"REF-{uuid.uuid4().hex[:8].upper()}")
    total_referrals: int = 0
    total_deals: int = 0
    total_commission: float = 0.0
    pending_commission: float = 0.0
    status: str = "active"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: Optional[dict] = None


# ==================== WEBHOOK MODELS ====================

class WebhookEvent(BaseModel):
    """Webhook event to send to CRM"""
    type: str  # sla.breach, contract.created, task.completed, lead.qualified
    data: dict
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class WebhookConfig(BaseModel):
    """Webhook configuration"""
    url: str
    secret: str
    events: List[str] = []  # Event types to subscribe to
    active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ==================== PIPELINE MODELS ====================

class PipelineStage(BaseModel):
    """Pipeline stage with counts and values"""
    stage: str
    display_name: str
    count: int
    total_value: int  # in cents
    color: str


class PipelineStats(BaseModel):
    """Overall pipeline statistics"""
    stages: List[PipelineStage]
    total_deals: int
    total_value: int
    avg_deal_size: int
    conversion_rate: float


# ==================== KPI MODELS ====================

class ExternalKPI(BaseModel):
    """KPI for external API"""
    name: str
    value: float
    target: Optional[float] = None
    unit: str = ""
    trend: str = "stable"  # up, down, stable
    period: str = "current_month"
