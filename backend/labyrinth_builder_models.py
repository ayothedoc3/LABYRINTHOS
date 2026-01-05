"""
Labyrinth Builder - Data Models
Spreadsheet-to-Workflow Renderer System
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


# ==================== ENUMS ====================

class IssueCategory(str, Enum):
    CLIENT_SERVICES = "CLIENT_SERVICES"
    OPERATIONS = "OPERATIONS"
    CONSULTATION = "CONSULTATION"
    CRISIS_MANAGEMENT = "CRISIS_MANAGEMENT"
    APP_DEVELOPMENT = "APP_DEVELOPMENT"


class SprintTimeline(str, Enum):
    URGENT = "URGENT"           # 1-3 days (Red)
    ONE_WEEK = "ONE_WEEK"       # 1 week (Orange)
    TWO_WEEKS = "TWO_WEEKS"     # 2 weeks (Yellow)
    THREE_FOUR_WEEKS = "THREE_FOUR_WEEKS"  # 3-4 weeks (Green)
    FIVE_WEEKS = "FIVE_WEEKS"   # 5 weeks (Blue)
    SIX_PLUS_WEEKS = "SIX_PLUS_WEEKS"  # 6+ weeks (Purple)


class PlaybookTier(str, Enum):
    TIER_1 = "TIER_1"  # Top resources, best personnel, premium software
    TIER_2 = "TIER_2"  # Standard resources
    TIER_3 = "TIER_3"  # Basic/minimal resources


# ==================== SPRINT CONFIG ====================

SPRINT_CONFIG = {
    SprintTimeline.URGENT: {"label": "Urgent (1-3 days)", "color": "#EF4444", "days": 3},
    SprintTimeline.ONE_WEEK: {"label": "1 Week", "color": "#F97316", "days": 7},
    SprintTimeline.TWO_WEEKS: {"label": "2 Weeks", "color": "#EAB308", "days": 14},
    SprintTimeline.THREE_FOUR_WEEKS: {"label": "3-4 Weeks", "color": "#22C55E", "days": 28},
    SprintTimeline.FIVE_WEEKS: {"label": "5 Weeks", "color": "#3B82F6", "days": 35},
    SprintTimeline.SIX_PLUS_WEEKS: {"label": "6+ Weeks", "color": "#8B5CF6", "days": 42},
}


# ==================== ISSUE TYPES ====================

ISSUE_TYPES = {
    IssueCategory.CLIENT_SERVICES: [
        {"id": "bronze", "name": "Bronze Package", "description": "Entry-level client services"},
        {"id": "silver", "name": "Silver Package", "description": "Standard client services"},
        {"id": "gold", "name": "Gold Package", "description": "Premium client services"},
        {"id": "platinum", "name": "Platinum Package", "description": "Elite client services"},
        {"id": "black", "name": "Black Package", "description": "VIP exclusive services"},
    ],
    IssueCategory.OPERATIONS: [
        {"id": "trainings", "name": "Trainings", "description": "Team training and development"},
        {"id": "sop_creation", "name": "SOP Creation", "description": "Creating new standard operating procedures"},
        {"id": "promotions", "name": "Promotions", "description": "Team promotions and advancement"},
        {"id": "team_events", "name": "Team Events", "description": "Company events and team building"},
        {"id": "recruitment", "name": "Recruitment", "description": "Hiring new team members"},
        {"id": "acquisitions", "name": "Acquisitions", "description": "Company acquisitions"},
        {"id": "meeting_itineraries", "name": "Meeting Itineraries", "description": "Meeting planning and agendas"},
        {"id": "conferences", "name": "Conferences", "description": "YASA conferences and events"},
        {"id": "client_surveys", "name": "Client Surveys", "description": "Customer feedback collection"},
        {"id": "it_maintenance", "name": "IT Maintenance", "description": "Technology upkeep"},
        {"id": "customer_service", "name": "Customer Service", "description": "Client support operations"},
        {"id": "associate_service", "name": "Associate Service", "description": "Internal team support"},
        {"id": "data_storage_security", "name": "Data Storage & Security", "description": "Data management and protection"},
    ],
    IssueCategory.CONSULTATION: [
        {"id": "finance_consultation", "name": "Finance", "description": "Financial advisory services"},
        {"id": "marketing_consultation", "name": "Marketing", "description": "Marketing strategy consultation"},
        {"id": "development_consultation", "name": "Development", "description": "Product/tech development advisory"},
        {"id": "operations_consultation", "name": "Operations", "description": "Operational efficiency consulting"},
    ],
    IssueCategory.CRISIS_MANAGEMENT: [
        {"id": "team_disputes", "name": "Team Disputes", "description": "Internal conflict resolution"},
        {"id": "layoffs", "name": "Layoffs", "description": "Workforce reduction management"},
        {"id": "natural_disasters", "name": "Natural Disasters", "description": "Emergency response protocols"},
        {"id": "software_compromise", "name": "Software Compromise", "description": "System downtime response"},
        {"id": "pandemics", "name": "Pandemics", "description": "Health crisis protocols"},
        {"id": "data_compromise", "name": "Data Compromise", "description": "Data breach response"},
        {"id": "org_compromise", "name": "Organization Compromise", "description": "Security breach handling"},
        {"id": "customer_complaints", "name": "Customer Public Complaints", "description": "PR crisis management"},
        {"id": "ex_team_complaints", "name": "Ex-Team Member Complaints", "description": "Former employee issues"},
        {"id": "opposition_attacks", "name": "Opposition Attacks", "description": "Competitive threat response"},
        {"id": "supply_issues", "name": "Product Supply Issues", "description": "Supply chain disruption"},
    ],
    IssueCategory.APP_DEVELOPMENT: [
        {"id": "market_research", "name": "Market Research", "description": "Market analysis and validation"},
        {"id": "prototype_development", "name": "Prototype Development", "description": "Initial product build"},
        {"id": "market_surveys", "name": "Market Surveys", "description": "User feedback collection"},
        {"id": "testing", "name": "Testing", "description": "QA and product testing"},
        {"id": "product_manual", "name": "Product Manual", "description": "Documentation creation"},
        {"id": "launch", "name": "Launch", "description": "Product release"},
        {"id": "iteration", "name": "Iteration", "description": "Product improvements"},
    ],
}


# ==================== PYDANTIC MODELS ====================

class LabyrinthIssue(BaseModel):
    """Issue/Challenge definition"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category: IssueCategory
    issue_type_id: str
    name: str
    description: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LabyrinthCampaign(BaseModel):
    """Campaign/Resource definition"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    issue_category: IssueCategory
    issue_type_ids: List[str] = []  # Which issue types this campaign applies to
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LabyrinthSOP(BaseModel):
    """SOP linked to a specific tier and issue"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    issue_category: IssueCategory
    issue_type_id: str
    tier: PlaybookTier
    steps: List[Dict[str, Any]] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LabyrinthTemplate(BaseModel):
    """Deliverable template"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    template_type: str  # e.g., "document", "spreadsheet", "design"
    file_url: Optional[str] = None
    linked_sop_ids: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class LabyrinthContract(BaseModel):
    """Contract definition"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    contract_type: str  # "PROJECT" or "RECURRING"
    linked_sop_ids: List[str] = []
    deliverables: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class BuilderSelection(BaseModel):
    """User's selections in the builder"""
    issue_category: IssueCategory
    issue_type_id: str
    sprint: SprintTimeline
    tier: PlaybookTier


class WorkflowRenderRequest(BaseModel):
    """Request to render a workflow from selections"""
    selection: BuilderSelection
    workflow_name: str
    description: str = ""


class WorkflowRenderResponse(BaseModel):
    """Response after rendering workflow"""
    workflow_id: str
    name: str
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    selection: BuilderSelection
    sops: List[Dict[str, Any]]
    templates: List[Dict[str, Any]]
    contracts: List[Dict[str, Any]]
