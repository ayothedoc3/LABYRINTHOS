"""
Sales CRM Models
Pydantic models for lead management, qualification, and proposals
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid


class LeadSource(str, Enum):
    """Sources where leads can originate"""
    WEBSITE = "WEBSITE"
    REFERRAL = "REFERRAL"
    COLD_OUTREACH = "COLD_OUTREACH"
    SOCIAL_MEDIA = "SOCIAL_MEDIA"
    EVENT = "EVENT"
    ADVERTISEMENT = "ADVERTISEMENT"
    PARTNER = "PARTNER"
    OTHER = "OTHER"


class LeadStage(str, Enum):
    """Lead qualification stages"""
    NEW = "NEW"
    CONTACTED = "CONTACTED"
    QUALIFIED = "QUALIFIED"
    PROPOSAL_SENT = "PROPOSAL_SENT"
    NEGOTIATION = "NEGOTIATION"
    WON = "WON"
    LOST = "LOST"
    NURTURING = "NURTURING"


class LeadPriority(str, Enum):
    """Lead priority levels"""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


class ProposalStatus(str, Enum):
    """Proposal status"""
    DRAFT = "DRAFT"
    SENT = "SENT"
    VIEWED = "VIEWED"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"


# Stage configuration with colors and valid transitions
LEAD_STAGE_CONFIG = {
    LeadStage.NEW: {
        "display_name": "New",
        "color": "#64748B",
        "icon": "UserPlus",
        "valid_transitions": [LeadStage.CONTACTED, LeadStage.LOST]
    },
    LeadStage.CONTACTED: {
        "display_name": "Contacted",
        "color": "#3B82F6",
        "icon": "Phone",
        "valid_transitions": [LeadStage.QUALIFIED, LeadStage.NURTURING, LeadStage.LOST]
    },
    LeadStage.QUALIFIED: {
        "display_name": "Qualified",
        "color": "#22C55E",
        "icon": "CheckCircle",
        "valid_transitions": [LeadStage.PROPOSAL_SENT, LeadStage.NURTURING, LeadStage.LOST]
    },
    LeadStage.PROPOSAL_SENT: {
        "display_name": "Proposal Sent",
        "color": "#F59E0B",
        "icon": "FileText",
        "valid_transitions": [LeadStage.NEGOTIATION, LeadStage.WON, LeadStage.LOST]
    },
    LeadStage.NEGOTIATION: {
        "display_name": "Negotiation",
        "color": "#8B5CF6",
        "icon": "MessageSquare",
        "valid_transitions": [LeadStage.WON, LeadStage.LOST, LeadStage.PROPOSAL_SENT]
    },
    LeadStage.WON: {
        "display_name": "Won",
        "color": "#10B981",
        "icon": "Trophy",
        "valid_transitions": []
    },
    LeadStage.LOST: {
        "display_name": "Lost",
        "color": "#EF4444",
        "icon": "XCircle",
        "valid_transitions": [LeadStage.NURTURING]
    },
    LeadStage.NURTURING: {
        "display_name": "Nurturing",
        "color": "#06B6D4",
        "icon": "Heart",
        "valid_transitions": [LeadStage.CONTACTED, LeadStage.LOST]
    }
}


class ContactInfo(BaseModel):
    """Contact information for a lead"""
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    position: Optional[str] = None
    linkedin: Optional[str] = None
    website: Optional[str] = None


class LeadActivity(BaseModel):
    """Activity log entry for a lead"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # call, email, meeting, note, stage_change
    description: str
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: Optional[dict] = None


class LeadBase(BaseModel):
    """Base lead model"""
    name: str
    contact: ContactInfo
    source: LeadSource = LeadSource.OTHER
    priority: LeadPriority = LeadPriority.MEDIUM
    estimated_value: Optional[float] = None
    notes: Optional[str] = None
    tags: List[str] = []
    assigned_to: Optional[str] = None
    function: Optional[str] = None  # SALES, MARKETING, etc.


class LeadCreate(LeadBase):
    """Model for creating a new lead"""
    pass


class Lead(LeadBase):
    """Full lead model with all fields"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    stage: LeadStage = LeadStage.NEW
    activities: List[LeadActivity] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_contacted: Optional[datetime] = None
    next_follow_up: Optional[datetime] = None
    conversion_probability: float = 0.0  # 0-100%
    proposal_id: Optional[str] = None  # Link to proposal if created


class ProposalLineItem(BaseModel):
    """Line item in a proposal"""
    description: str
    quantity: int = 1
    unit_price: float
    discount_percent: float = 0.0
    
    @property
    def total(self) -> float:
        return self.quantity * self.unit_price * (1 - self.discount_percent / 100)


class ProposalBase(BaseModel):
    """Base proposal model"""
    lead_id: str
    title: str
    description: Optional[str] = None
    valid_until: Optional[datetime] = None
    terms: Optional[str] = None
    notes: Optional[str] = None


class ProposalCreate(ProposalBase):
    """Model for creating a proposal"""
    line_items: List[ProposalLineItem] = []


class Proposal(ProposalBase):
    """Full proposal model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: ProposalStatus = ProposalStatus.DRAFT
    line_items: List[ProposalLineItem] = []
    total_value: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    sent_at: Optional[datetime] = None
    viewed_at: Optional[datetime] = None
    responded_at: Optional[datetime] = None
    created_by: str = "system"


class SalesCRMStats(BaseModel):
    """Sales CRM statistics"""
    total_leads: int = 0
    leads_by_stage: dict = {}
    leads_by_source: dict = {}
    leads_by_priority: dict = {}
    total_pipeline_value: float = 0.0
    conversion_rate: float = 0.0
    avg_deal_size: float = 0.0
    proposals_sent: int = 0
    proposals_accepted: int = 0
