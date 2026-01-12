"""
Role-Based Access Control (RBAC) System
Manages permissions for:
- Admin-only workflow access
- Position-specific SOP/workflow visibility
- Bidding access (Manager & Accountability = edit, others = view)
- Training role-based access
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from enum import Enum

router = APIRouter(prefix="/permissions", tags=["Permissions"])

# ==================== ROLE DEFINITIONS ====================

class UserRole(str, Enum):
    ADMINISTRATOR = "Administrator"
    EXECUTIVE = "Executive"
    PROJECT_DIRECTOR = "Project Director"
    ACCOUNTABILITY = "Accountability"
    MANAGER = "Manager"
    COORDINATOR = "Coordinator"
    ADVISOR = "Advisor"
    SPECIALIST = "Specialist"
    AFFILIATE = "Affiliate"
    CLIENT = "Client"

# ==================== PERMISSION DEFINITIONS ====================

class Permission(str, Enum):
    # Workflow permissions
    WORKFLOW_VIEW = "workflow_view"
    WORKFLOW_EDIT = "workflow_edit"
    WORKFLOW_CREATE = "workflow_create"
    WORKFLOW_DELETE = "workflow_delete"
    
    # SOP permissions
    SOP_VIEW = "sop_view"
    SOP_EDIT = "sop_edit"
    SOP_CREATE = "sop_create"
    
    # Bidding permissions
    BIDDING_VIEW = "bidding_view"
    BIDDING_EDIT = "bidding_edit"
    BIDDING_APPROVE = "bidding_approve"
    
    # Training permissions
    TRAINING_VIEW = "training_view"
    TRAINING_EDIT = "training_edit"
    TRAINING_CREATE = "training_create"
    TRAINING_MODERATE = "training_moderate"
    
    # Contract permissions
    CONTRACT_VIEW = "contract_view"
    CONTRACT_EDIT = "contract_edit"
    CONTRACT_CREATE = "contract_create"
    CONTRACT_APPROVE = "contract_approve"
    
    # Team permissions
    TEAM_VIEW = "team_view"
    TEAM_MANAGE = "team_manage"
    
    # Analytics permissions
    ANALYTICS_VIEW = "analytics_view"
    ANALYTICS_EXPORT = "analytics_export"
    
    # Settings permissions
    SETTINGS_VIEW = "settings_view"
    SETTINGS_EDIT = "settings_edit"

# ==================== ROLE-PERMISSION MAPPING ====================

ROLE_PERMISSIONS: Dict[UserRole, List[Permission]] = {
    UserRole.ADMINISTRATOR: [
        # Full access to everything
        Permission.WORKFLOW_VIEW, Permission.WORKFLOW_EDIT, Permission.WORKFLOW_CREATE, Permission.WORKFLOW_DELETE,
        Permission.SOP_VIEW, Permission.SOP_EDIT, Permission.SOP_CREATE,
        Permission.BIDDING_VIEW, Permission.BIDDING_EDIT, Permission.BIDDING_APPROVE,
        Permission.TRAINING_VIEW, Permission.TRAINING_EDIT, Permission.TRAINING_CREATE, Permission.TRAINING_MODERATE,
        Permission.CONTRACT_VIEW, Permission.CONTRACT_EDIT, Permission.CONTRACT_CREATE, Permission.CONTRACT_APPROVE,
        Permission.TEAM_VIEW, Permission.TEAM_MANAGE,
        Permission.ANALYTICS_VIEW, Permission.ANALYTICS_EXPORT,
        Permission.SETTINGS_VIEW, Permission.SETTINGS_EDIT,
    ],
    
    UserRole.EXECUTIVE: [
        Permission.WORKFLOW_VIEW, Permission.WORKFLOW_EDIT, Permission.WORKFLOW_CREATE,
        Permission.SOP_VIEW, Permission.SOP_EDIT,
        Permission.BIDDING_VIEW, Permission.BIDDING_APPROVE,
        Permission.TRAINING_VIEW, Permission.TRAINING_EDIT,
        Permission.CONTRACT_VIEW, Permission.CONTRACT_EDIT, Permission.CONTRACT_APPROVE,
        Permission.TEAM_VIEW, Permission.TEAM_MANAGE,
        Permission.ANALYTICS_VIEW, Permission.ANALYTICS_EXPORT,
        Permission.SETTINGS_VIEW,
    ],
    
    UserRole.PROJECT_DIRECTOR: [
        Permission.WORKFLOW_VIEW,
        Permission.SOP_VIEW, Permission.SOP_EDIT,
        Permission.BIDDING_VIEW,
        Permission.TRAINING_VIEW, Permission.TRAINING_EDIT,
        Permission.CONTRACT_VIEW, Permission.CONTRACT_EDIT,
        Permission.TEAM_VIEW,
        Permission.ANALYTICS_VIEW,
    ],
    
    UserRole.ACCOUNTABILITY: [
        Permission.WORKFLOW_VIEW,
        Permission.SOP_VIEW, Permission.SOP_EDIT,
        Permission.BIDDING_VIEW, Permission.BIDDING_EDIT,  # Can edit bidding
        Permission.TRAINING_VIEW,
        Permission.CONTRACT_VIEW, Permission.CONTRACT_EDIT, Permission.CONTRACT_APPROVE,
        Permission.TEAM_VIEW,
        Permission.ANALYTICS_VIEW,
    ],
    
    UserRole.MANAGER: [
        Permission.WORKFLOW_VIEW,
        Permission.SOP_VIEW, Permission.SOP_EDIT,
        Permission.BIDDING_VIEW, Permission.BIDDING_EDIT,  # Can edit bidding
        Permission.TRAINING_VIEW, Permission.TRAINING_MODERATE,
        Permission.CONTRACT_VIEW, Permission.CONTRACT_EDIT,
        Permission.TEAM_VIEW,
        Permission.ANALYTICS_VIEW,
    ],
    
    UserRole.COORDINATOR: [
        Permission.WORKFLOW_VIEW,
        Permission.SOP_VIEW,  # View only for their position
        Permission.BIDDING_VIEW,  # View only
        Permission.TRAINING_VIEW,
        Permission.CONTRACT_VIEW,
        Permission.TEAM_VIEW,
    ],
    
    UserRole.ADVISOR: [
        Permission.WORKFLOW_VIEW,
        Permission.SOP_VIEW,
        Permission.BIDDING_VIEW,
        Permission.TRAINING_VIEW,
        Permission.CONTRACT_VIEW,
        Permission.ANALYTICS_VIEW,
    ],
    
    UserRole.SPECIALIST: [
        Permission.SOP_VIEW,  # Position-specific only
        Permission.BIDDING_VIEW,
        Permission.TRAINING_VIEW,
        Permission.CONTRACT_VIEW,
    ],
    
    UserRole.AFFILIATE: [
        Permission.SOP_VIEW,  # Limited
        Permission.TRAINING_VIEW,  # Limited
        Permission.CONTRACT_VIEW,  # Their contracts only
    ],
    
    UserRole.CLIENT: [
        Permission.CONTRACT_VIEW,  # Their contracts only
        Permission.TRAINING_VIEW,  # Client training only
    ],
}

# ==================== FEATURE ACCESS CONTROL ====================

FEATURE_ACCESS = {
    "workflows": {
        "full_access": [UserRole.ADMINISTRATOR],  # Admin only
        "view_access": [
            UserRole.EXECUTIVE, UserRole.PROJECT_DIRECTOR, UserRole.ACCOUNTABILITY,
            UserRole.MANAGER, UserRole.COORDINATOR, UserRole.ADVISOR
        ],
    },
    "sops": {
        "full_access": [UserRole.ADMINISTRATOR, UserRole.EXECUTIVE],
        "edit_access": [UserRole.PROJECT_DIRECTOR, UserRole.ACCOUNTABILITY, UserRole.MANAGER],
        "view_access": [UserRole.COORDINATOR, UserRole.ADVISOR, UserRole.SPECIALIST, UserRole.AFFILIATE],
        "position_restricted": True,  # Users see SOPs relevant to their position
    },
    "bidding": {
        "full_access": [UserRole.ADMINISTRATOR],
        "edit_access": [UserRole.MANAGER, UserRole.ACCOUNTABILITY],  # Only these can edit
        "view_access": [
            UserRole.EXECUTIVE, UserRole.PROJECT_DIRECTOR, UserRole.COORDINATOR,
            UserRole.ADVISOR, UserRole.SPECIALIST
        ],
    },
    "training": {
        "full_access": [UserRole.ADMINISTRATOR],
        "moderate_access": [UserRole.MANAGER],  # Can moderate Q&A
        "edit_access": [UserRole.EXECUTIVE, UserRole.PROJECT_DIRECTOR],
        "view_access": [
            UserRole.ACCOUNTABILITY, UserRole.COORDINATOR, UserRole.ADVISOR,
            UserRole.SPECIALIST, UserRole.AFFILIATE, UserRole.CLIENT
        ],
        "position_restricted": True,  # Users see training relevant to their role
    },
}

# ==================== MODELS ====================

class PermissionCheck(BaseModel):
    role: str
    permission: str
    resource_id: Optional[str] = None

class PermissionResult(BaseModel):
    allowed: bool
    reason: str
    permissions: List[str] = []

class RolePermissions(BaseModel):
    role: str
    permissions: List[str]
    feature_access: Dict[str, str]

# ==================== HELPER FUNCTIONS ====================

def get_role_permissions(role_name: str) -> List[Permission]:
    """Get all permissions for a role"""
    try:
        role = UserRole(role_name)
        return ROLE_PERMISSIONS.get(role, [])
    except ValueError:
        return []

def has_permission(role_name: str, permission: Permission) -> bool:
    """Check if a role has a specific permission"""
    permissions = get_role_permissions(role_name)
    return permission in permissions

def get_feature_access_level(role_name: str, feature: str) -> str:
    """Get the access level for a feature"""
    try:
        role = UserRole(role_name)
        feature_config = FEATURE_ACCESS.get(feature, {})
        
        if role in feature_config.get("full_access", []):
            return "full"
        elif role in feature_config.get("moderate_access", []):
            return "moderate"
        elif role in feature_config.get("edit_access", []):
            return "edit"
        elif role in feature_config.get("view_access", []):
            return "view"
        else:
            return "none"
    except ValueError:
        return "none"

# ==================== ENDPOINTS ====================

@router.get("/check")
async def check_permission(role: str, permission: str) -> PermissionResult:
    """Check if a role has a specific permission"""
    try:
        perm = Permission(permission)
        allowed = has_permission(role, perm)
        return PermissionResult(
            allowed=allowed,
            reason=f"{'Granted' if allowed else 'Denied'}: {permission} for {role}",
            permissions=[p.value for p in get_role_permissions(role)]
        )
    except ValueError:
        return PermissionResult(
            allowed=False,
            reason=f"Invalid permission: {permission}",
            permissions=[]
        )

@router.get("/role/{role_name}")
async def get_role_info(role_name: str) -> RolePermissions:
    """Get all permissions and feature access for a role"""
    permissions = [p.value for p in get_role_permissions(role_name)]
    
    feature_access = {}
    for feature in FEATURE_ACCESS.keys():
        feature_access[feature] = get_feature_access_level(role_name, feature)
    
    return RolePermissions(
        role=role_name,
        permissions=permissions,
        feature_access=feature_access
    )

@router.get("/feature/{feature_name}")
async def get_feature_access(feature_name: str, role: str) -> Dict[str, Any]:
    """Get access level for a specific feature"""
    access_level = get_feature_access_level(role, feature_name)
    feature_config = FEATURE_ACCESS.get(feature_name, {})
    
    return {
        "feature": feature_name,
        "role": role,
        "access_level": access_level,
        "position_restricted": feature_config.get("position_restricted", False),
        "can_view": access_level in ["full", "moderate", "edit", "view"],
        "can_edit": access_level in ["full", "moderate", "edit"],
        "can_moderate": access_level in ["full", "moderate"],
        "has_full_access": access_level == "full",
    }

@router.get("/roles")
async def get_all_roles() -> List[Dict[str, Any]]:
    """Get all available roles with their permission summaries"""
    roles = []
    for role in UserRole:
        permissions = get_role_permissions(role.value)
        
        # Summarize feature access
        feature_summary = {}
        for feature in FEATURE_ACCESS.keys():
            feature_summary[feature] = get_feature_access_level(role.value, feature)
        
        roles.append({
            "role": role.value,
            "permission_count": len(permissions),
            "feature_access": feature_summary,
            "is_internal": role not in [UserRole.AFFILIATE, UserRole.CLIENT],
        })
    
    return roles

@router.get("/features")
async def get_all_features() -> Dict[str, Any]:
    """Get all features with their access configurations"""
    return FEATURE_ACCESS
