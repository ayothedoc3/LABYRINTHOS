"""
Labyrinth Operating System - Data Models
7-Gate Constraint System for Elev8 Matrix
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


# ==================== ENUMS ====================

class FunctionType(str, Enum):
    SALES = "SALES"
    MARKETING = "MARKETING"
    DEVELOPMENT = "DEVELOPMENT"
    FINANCE = "FINANCE"
    OPERATIONS = "OPERATIONS"
    POWERHOUSE = "POWERHOUSE"


class LevelType(str, Enum):
    ACQUIRE = "ACQUIRE"
    MAINTAIN = "MAINTAIN"
    SCALE = "SCALE"


class TierLevel(int, Enum):
    TIER_1 = 1
    TIER_2 = 2
    TIER_3 = 3


class AlertStatus(str, Enum):
    GREEN = "GREEN"
    YELLOW = "YELLOW"
    RED = "RED"


class GateType(str, Enum):
    STRATEGY_SELECTION = "STRATEGY_SELECTION"
    LEVEL_SELECTION = "LEVEL_SELECTION"
    PLAYBOOK_SELECTION = "PLAYBOOK_SELECTION"
    TALENT_MATCHING = "TALENT_MATCHING"
    SOP_ACTIVATION = "SOP_ACTIVATION"
    CONTRACT_ENFORCEMENT = "CONTRACT_ENFORCEMENT"
    KPI_FEEDBACK = "KPI_FEEDBACK"


class GateStatus(str, Enum):
    PASSED = "PASSED"
    BLOCKED = "BLOCKED"
    PENDING = "PENDING"


class ClientPackage(str, Enum):
    BRONZE = "BRONZE"
    SILVER = "SILVER"
    GOLD = "GOLD"
    BLACK = "BLACK"


# ==================== PLAYBOOK MODELS ====================

class PlaybookBase(BaseModel):
    playbook_id: str  # e.g., SALES-ACQ-01
    name: str
    function: FunctionType
    level: LevelType
    min_tier: int = Field(ge=1, le=3)
    description: str
    linked_sop_ids: List[str] = []


class PlaybookCreate(PlaybookBase):
    pass


class Playbook(PlaybookBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True


# ==================== SOP MODELS ====================

class SOPStep(BaseModel):
    step_number: int
    title: str
    description: str
    checklist_items: List[str] = []


class SOPBase(BaseModel):
    sop_id: str  # e.g., SOP-SALES-001
    name: str
    function: FunctionType
    linked_playbook_ids: List[str] = []
    template_required: str
    steps: List[SOPStep] = []
    estimated_time_minutes: int = 30


class SOPCreate(SOPBase):
    pass


class SOP(SOPBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True


# ==================== TALENT MODELS ====================

class CompetencyScores(BaseModel):
    """7 competency metrics (1-5 scale each)"""
    communication: float = Field(ge=1.0, le=5.0, default=3.0)
    technical_skills: float = Field(ge=1.0, le=5.0, default=3.0)
    problem_solving: float = Field(ge=1.0, le=5.0, default=3.0)
    time_management: float = Field(ge=1.0, le=5.0, default=3.0)
    leadership: float = Field(ge=1.0, le=5.0, default=3.0)
    adaptability: float = Field(ge=1.0, le=5.0, default=3.0)
    domain_expertise: float = Field(ge=1.0, le=5.0, default=3.0)


class TalentBase(BaseModel):
    name: str
    email: str
    function: FunctionType
    subfunction: Optional[str] = None
    competency_scores: CompetencyScores = Field(default_factory=CompetencyScores)
    tags: List[str] = []
    notes: Optional[str] = None
    manatal_id: Optional[str] = None  # For future Manatal integration


class TalentCreate(TalentBase):
    pass


class Talent(TalentBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    current_tier: int = Field(ge=1, le=3, default=1)
    tier_score: float = Field(ge=1.0, le=5.0, default=3.0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True
    
    def calculate_tier(self) -> int:
        """Calculate tier based on average competency score"""
        scores = self.competency_scores
        avg = (scores.communication + scores.technical_skills + scores.problem_solving +
               scores.time_management + scores.leadership + scores.adaptability +
               scores.domain_expertise) / 7
        self.tier_score = round(avg, 2)
        if avg <= 2.0:
            return 1
        elif avg <= 3.5:
            return 2
        else:
            return 3


# ==================== CONTRACT MODELS ====================

class ContractBoundary(BaseModel):
    max_hours_per_week: int = 40
    response_time_hours: int = 24
    deliverable_quality_min: float = Field(ge=1.0, le=5.0, default=3.5)
    escalation_threshold_days: int = 3


class ContractBase(BaseModel):
    talent_id: str
    client_name: str
    client_package: ClientPackage
    assigned_playbook_ids: List[str] = []
    assigned_sop_ids: List[str] = []
    kpi_ids: List[str] = []
    boundaries: ContractBoundary = Field(default_factory=ContractBoundary)
    start_date: datetime
    end_date: Optional[datetime] = None
    hourly_rate: Optional[float] = None
    monthly_retainer: Optional[float] = None


class ContractCreate(ContractBase):
    pass


class Contract(ContractBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True


# ==================== KPI MODELS ====================

class KPIThresholds(BaseModel):
    target: float
    yellow_threshold: float
    red_threshold: float
    is_higher_better: bool = True  # True if higher values are better


class KPIBase(BaseModel):
    kpi_id: str  # e.g., KPI-SALES-001
    name: str
    function: FunctionType
    description: str
    unit: str  # e.g., "%", "minutes", "days", "x"
    thresholds: KPIThresholds
    measurement_formula: str


class KPICreate(KPIBase):
    pass


class KPI(KPIBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True


# ==================== KPI TRACKING ====================

class KPIValue(BaseModel):
    kpi_id: str
    function: FunctionType
    current_value: float
    target_value: float
    status: AlertStatus
    recorded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    notes: Optional[str] = None


class KPIValueCreate(BaseModel):
    kpi_id: str
    current_value: float
    notes: Optional[str] = None


class KPIValueRecord(KPIValue):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))


# ==================== GATE EXECUTION MODELS ====================

class GateExecutionRequest(BaseModel):
    gate_type: GateType
    context: Dict[str, Any] = {}  # Flexible context for different gates
    talent_id: Optional[str] = None
    playbook_id: Optional[str] = None
    strategy: Optional[str] = None
    level: Optional[LevelType] = None


class GateExecutionResult(BaseModel):
    gate_type: GateType
    status: GateStatus
    message: str
    details: Dict[str, Any] = {}
    next_gate: Optional[GateType] = None
    blocked_reason: Optional[str] = None


class GateLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    gate_type: GateType
    status: GateStatus
    talent_id: Optional[str] = None
    playbook_id: Optional[str] = None
    request_context: Dict[str, Any] = {}
    result_details: Dict[str, Any] = {}
    message: str
    executed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    executed_by: Optional[str] = None


# ==================== ALERT MODELS ====================

class Alert(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    alert_type: str  # "GATE_BLOCK", "KPI_DRIFT", "CONTRACT_VIOLATION"
    severity: AlertStatus
    function: Optional[FunctionType] = None
    title: str
    message: str
    details: Dict[str, Any] = {}
    is_resolved: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None


class AlertCreate(BaseModel):
    alert_type: str
    severity: AlertStatus
    function: Optional[FunctionType] = None
    title: str
    message: str
    details: Dict[str, Any] = {}


# ==================== PLATFORM CREDENTIALS ====================

class PlatformCredentials(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    platform: str  # "n8n", "clickup", "manatal", "discord", "suitedash"
    credentials: Dict[str, str] = {}  # Encrypted in production
    is_active: bool = True
    last_verified: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PlatformCredentialsCreate(BaseModel):
    platform: str
    credentials: Dict[str, str]


# ==================== WORKFLOW EXECUTION ====================

class WorkflowExecution(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    workflow_name: str
    talent_id: Optional[str] = None
    client_name: Optional[str] = None
    gates_passed: List[GateType] = []
    current_gate: Optional[GateType] = None
    status: str = "IN_PROGRESS"  # IN_PROGRESS, COMPLETED, BLOCKED, CANCELLED
    context: Dict[str, Any] = {}
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = None
    blocked_at_gate: Optional[GateType] = None
    blocked_reason: Optional[str] = None


class WorkflowExecutionCreate(BaseModel):
    workflow_name: str
    talent_id: Optional[str] = None
    client_name: Optional[str] = None
    context: Dict[str, Any] = {}


# ==================== DASHBOARD STATS ====================

class FunctionStats(BaseModel):
    function: FunctionType
    total_playbooks: int
    active_playbooks: int
    total_sops: int
    total_talents: int
    tier_1_count: int
    tier_2_count: int
    tier_3_count: int
    kpi_status: AlertStatus  # Worst KPI status for this function
    active_alerts: int


class DashboardStats(BaseModel):
    total_playbooks: int
    total_sops: int
    total_talents: int
    total_contracts: int
    total_kpis: int
    active_alerts: int
    gate_blocks_today: int
    workflows_in_progress: int
    function_stats: List[FunctionStats]
    recent_alerts: List[Alert]
    kpi_overview: Dict[str, AlertStatus]  # Function -> worst status
