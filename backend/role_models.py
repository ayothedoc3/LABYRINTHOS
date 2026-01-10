"""
Labyrinth Role System - Data Models
Role-based access control for the Labyrinth Operating System
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


# ==================== ROLE ENUMS ====================

class RoleType(str, Enum):
    ADMIN = "ADMIN"
    EXECUTIVE = "EXECUTIVE"
    PROJECT_DIRECTOR = "PROJECT_DIRECTOR"
    ACCOUNTABILITY = "ACCOUNTABILITY"
    MANAGER = "MANAGER"
    COORDINATOR = "COORDINATOR"
    ADVISOR = "ADVISOR"
    SPECIALIST = "SPECIALIST"
    AFFILIATE = "AFFILIATE"
    CLIENT = "CLIENT"


class PermissionType(str, Enum):
    # View permissions
    VIEW_ALL = "VIEW_ALL"
    VIEW_CONTRACTS = "VIEW_CONTRACTS"
    VIEW_CONTRACTS_READONLY = "VIEW_CONTRACTS_READONLY"
    VIEW_TASKS = "VIEW_TASKS"
    VIEW_OWN_TASKS = "VIEW_OWN_TASKS"
    VIEW_DASHBOARDS = "VIEW_DASHBOARDS"
    VIEW_FUNCTION_DASHBOARD = "VIEW_FUNCTION_DASHBOARD"
    VIEW_KPIs = "VIEW_KPIs"
    VIEW_TEAM = "VIEW_TEAM"
    VIEW_ANALYTICS = "VIEW_ANALYTICS"
    VIEW_EARNINGS = "VIEW_EARNINGS"
    
    # Edit permissions
    EDIT_ALL = "EDIT_ALL"
    EDIT_CONTRACTS = "EDIT_CONTRACTS"
    EDIT_CONTRACT_STATUS = "EDIT_CONTRACT_STATUS"
    EDIT_TASKS = "EDIT_TASKS"
    EDIT_OWN_TASKS = "EDIT_OWN_TASKS"
    EDIT_PLAYBOOKS = "EDIT_PLAYBOOKS"
    EDIT_SOPs = "EDIT_SOPs"
    EDIT_KPIs = "EDIT_KPIs"
    EDIT_TRAINING = "EDIT_TRAINING"
    
    # Action permissions
    CREATE_CONTRACTS = "CREATE_CONTRACTS"
    ACTIVATE_CONTRACTS = "ACTIVATE_CONTRACTS"
    APPROVE_BIDS = "APPROVE_BIDS"
    CREATE_TASKS = "CREATE_TASKS"
    ASSIGN_TASKS = "ASSIGN_TASKS"
    APPROVE_PROPOSALS = "APPROVE_PROPOSALS"
    
    # Communication permissions
    COMMUNICATE_ALL = "COMMUNICATE_ALL"
    COMMUNICATE_INTERNAL = "COMMUNICATE_INTERNAL"
    COMMUNICATE_FUNCTION = "COMMUNICATE_FUNCTION"
    COMMUNICATE_CLIENT = "COMMUNICATE_CLIENT"
    
    # System permissions
    MANAGE_USERS = "MANAGE_USERS"
    MANAGE_AUTOMATIONS = "MANAGE_AUTOMATIONS"
    MANAGE_SETTINGS = "MANAGE_SETTINGS"


# ==================== ROLE DEFINITIONS ====================

ROLE_PERMISSIONS: Dict[RoleType, List[PermissionType]] = {
    RoleType.ADMIN: [
        PermissionType.VIEW_ALL,
        PermissionType.EDIT_ALL,
        PermissionType.CREATE_CONTRACTS,
        PermissionType.ACTIVATE_CONTRACTS,
        PermissionType.APPROVE_BIDS,
        PermissionType.CREATE_TASKS,
        PermissionType.ASSIGN_TASKS,
        PermissionType.APPROVE_PROPOSALS,
        PermissionType.COMMUNICATE_ALL,
        PermissionType.MANAGE_USERS,
        PermissionType.MANAGE_AUTOMATIONS,
        PermissionType.MANAGE_SETTINGS,
    ],
    RoleType.EXECUTIVE: [
        PermissionType.VIEW_ALL,
        PermissionType.EDIT_CONTRACTS,
        PermissionType.EDIT_PLAYBOOKS,
        PermissionType.EDIT_KPIs,
        PermissionType.APPROVE_PROPOSALS,
        PermissionType.APPROVE_BIDS,
        PermissionType.COMMUNICATE_ALL,
    ],
    RoleType.PROJECT_DIRECTOR: [
        PermissionType.VIEW_CONTRACTS,
        PermissionType.VIEW_TASKS,
        PermissionType.VIEW_DASHBOARDS,
        PermissionType.VIEW_KPIs,
        PermissionType.COMMUNICATE_INTERNAL,
        PermissionType.COMMUNICATE_CLIENT,
    ],
    RoleType.ACCOUNTABILITY: [
        PermissionType.VIEW_ALL,
        PermissionType.EDIT_CONTRACT_STATUS,
        PermissionType.EDIT_KPIs,
        PermissionType.ACTIVATE_CONTRACTS,
        PermissionType.COMMUNICATE_INTERNAL,
    ],
    RoleType.MANAGER: [
        PermissionType.VIEW_CONTRACTS_READONLY,
        PermissionType.VIEW_FUNCTION_DASHBOARD,
        PermissionType.APPROVE_BIDS,
        PermissionType.COMMUNICATE_FUNCTION,
    ],
    RoleType.COORDINATOR: [
        PermissionType.VIEW_CONTRACTS,
        PermissionType.VIEW_TASKS,
        PermissionType.EDIT_TASKS,
        PermissionType.EDIT_SOPs,
        PermissionType.CREATE_TASKS,
        PermissionType.ASSIGN_TASKS,
        PermissionType.COMMUNICATE_INTERNAL,
    ],
    RoleType.ADVISOR: [
        PermissionType.VIEW_CONTRACTS_READONLY,
        PermissionType.EDIT_TRAINING,
        PermissionType.COMMUNICATE_INTERNAL,
    ],
    RoleType.SPECIALIST: [
        PermissionType.VIEW_OWN_TASKS,
        PermissionType.EDIT_OWN_TASKS,
        PermissionType.COMMUNICATE_FUNCTION,
    ],
    RoleType.AFFILIATE: [
        PermissionType.VIEW_EARNINGS,
    ],
    RoleType.CLIENT: [
        PermissionType.VIEW_DASHBOARDS,
        PermissionType.VIEW_KPIs,
    ],
}


# ==================== ROLE DASHBOARD TILES ====================

ROLE_DASHBOARD_TILES: Dict[RoleType, List[str]] = {
    RoleType.ADMIN: [
        "system_overview",
        "all_contracts",
        "all_users",
        "automations",
        "settings",
        "analytics",
    ],
    RoleType.EXECUTIVE: [
        "executive_summary",
        "finance_overview",
        "sales_pipeline",
        "operations_health",
        "project_health",
        "strategic_kpis",
    ],
    RoleType.PROJECT_DIRECTOR: [
        "my_projects",
        "client_communications",
        "deliverables",
        "timeline",
        "team_status",
    ],
    RoleType.ACCOUNTABILITY: [
        "compliance_dashboard",
        "overdue_items",
        "contract_lifecycle",
        "escalations",
        "performance_metrics",
    ],
    RoleType.MANAGER: [
        "function_overview",
        "team_bids",
        "proposals",
        "strategy_inputs",
    ],
    RoleType.COORDINATOR: [
        "active_tasks",
        "sop_library",
        "team_assignments",
        "milestone_tracker",
    ],
    RoleType.ADVISOR: [
        "training_content",
        "contract_overview",
        "guidance_requests",
    ],
    RoleType.SPECIALIST: [
        "my_tasks",
        "my_deliverables",
        "instructions",
    ],
    RoleType.AFFILIATE: [
        "referral_link",
        "leads_overview",
        "conversions",
        "commissions",
        "marketing_resources",
        "training",
    ],
    RoleType.CLIENT: [
        "project_dashboard",
        "deliverables",
        "reports",
        "timeline",
        "support",
    ],
}


# ==================== USER MODEL ====================

class UserBase(BaseModel):
    name: str
    email: str
    role: RoleType
    function: Optional[str] = None  # For function-specific roles
    avatar_url: Optional[str] = None
    is_active: bool = True


class UserCreate(UserBase):
    password: Optional[str] = None  # Optional for MVP


class User(UserBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_login: Optional[datetime] = None
    
    def has_permission(self, permission: PermissionType) -> bool:
        """Check if user has a specific permission"""
        role_perms = ROLE_PERMISSIONS.get(self.role, [])
        return permission in role_perms or PermissionType.VIEW_ALL in role_perms or PermissionType.EDIT_ALL in role_perms
    
    def get_dashboard_tiles(self) -> List[str]:
        """Get the dashboard tiles for this user's role"""
        return ROLE_DASHBOARD_TILES.get(self.role, [])


# ==================== SESSION MODEL ====================

class Session(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    role: RoleType
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime
    is_active: bool = True


# ==================== ROLE INFO RESPONSE ====================

class RoleInfo(BaseModel):
    role: RoleType
    display_name: str
    description: str
    permissions: List[str]
    dashboard_tiles: List[str]
    color: str
    icon: str


ROLE_INFO: Dict[RoleType, Dict[str, Any]] = {
    RoleType.ADMIN: {
        "display_name": "Administrator",
        "description": "Full system access. Protects and repairs the system.",
        "color": "#EF4444",  # Red
        "icon": "Shield",
    },
    RoleType.EXECUTIVE: {
        "display_name": "Executive",
        "description": "Governs direction and structure. Views all, approves strategy.",
        "color": "#8B5CF6",  # Purple
        "icon": "Crown",
    },
    RoleType.PROJECT_DIRECTOR: {
        "display_name": "Project Director",
        "description": "Voice of Elev8 to client. Manages client communication.",
        "color": "#06B6D4",  # Teal
        "icon": "Users",
    },
    RoleType.ACCOUNTABILITY: {
        "display_name": "Accountability",
        "description": "Enforces discipline, timing, structure. Moves contracts.",
        "color": "#F97316",  # Orange
        "icon": "CheckCircle",
    },
    RoleType.MANAGER: {
        "display_name": "Manager",
        "description": "Shapes strategy within function. Reviews bids and proposals.",
        "color": "#3B82F6",  # Blue
        "icon": "Briefcase",
    },
    RoleType.COORDINATOR: {
        "display_name": "Coordinator",
        "description": "Turns strategy into structured execution. Manages tasks.",
        "color": "#10B981",  # Green
        "icon": "ListTodo",
    },
    RoleType.ADVISOR: {
        "display_name": "Advisor",
        "description": "Thinks, guides, teaches. Maintains training content.",
        "color": "#6366F1",  # Indigo
        "icon": "BookOpen",
    },
    RoleType.SPECIALIST: {
        "display_name": "Specialist",
        "description": "Executes tasks cleanly and focused. Sees own work only.",
        "color": "#64748B",  # Slate
        "icon": "Wrench",
    },
    RoleType.AFFILIATE: {
        "display_name": "Affiliate",
        "description": "Refers leads. Views earnings and referral performance.",
        "color": "#EC4899",  # Pink
        "icon": "Link",
    },
    RoleType.CLIENT: {
        "display_name": "Client",
        "description": "Views project progress, deliverables, and reports.",
        "color": "#14B8A6",  # Teal
        "icon": "User",
    },
}
