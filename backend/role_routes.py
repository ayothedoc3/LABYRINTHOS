"""
Labyrinth Role System - API Routes
Role-based access control endpoints
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timezone
import os
from motor.motor_asyncio import AsyncIOMotorClient

from role_models import (
    RoleType, PermissionType, User, UserCreate, Session,
    RoleInfo, ROLE_PERMISSIONS, ROLE_DASHBOARD_TILES, ROLE_INFO
)

router = APIRouter(prefix="/roles", tags=["Roles"])

# Database connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "labyrinth_db")
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


def serialize_doc(doc: dict) -> dict:
    """Convert MongoDB document for JSON serialization"""
    if doc is None:
        return None
    if "_id" in doc:
        del doc["_id"]
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
    return doc


# ==================== ROLE INFO ENDPOINTS ====================

@router.get("/info", response_model=List[dict])
async def get_all_roles_info():
    """Get information about all available roles"""
    roles_info = []
    for role in RoleType:
        info = ROLE_INFO.get(role, {})
        permissions = [p.value for p in ROLE_PERMISSIONS.get(role, [])]
        tiles = ROLE_DASHBOARD_TILES.get(role, [])
        roles_info.append({
            "role": role.value,
            "display_name": info.get("display_name", role.value),
            "description": info.get("description", ""),
            "color": info.get("color", "#64748B"),
            "icon": info.get("icon", "User"),
            "permissions": permissions,
            "dashboard_tiles": tiles,
        })
    return roles_info


@router.get("/info/{role}", response_model=dict)
async def get_role_info(role: RoleType):
    """Get information about a specific role"""
    info = ROLE_INFO.get(role, {})
    permissions = [p.value for p in ROLE_PERMISSIONS.get(role, [])]
    tiles = ROLE_DASHBOARD_TILES.get(role, [])
    return {
        "role": role.value,
        "display_name": info.get("display_name", role.value),
        "description": info.get("description", ""),
        "color": info.get("color", "#64748B"),
        "icon": info.get("icon", "User"),
        "permissions": permissions,
        "dashboard_tiles": tiles,
    }


# ==================== USER ENDPOINTS ====================

@router.get("/users", response_model=List[dict])
async def get_users(
    role: Optional[RoleType] = None,
    function: Optional[str] = None,
    is_active: Optional[bool] = True,
    skip: int = 0,
    limit: int = 100
):
    """Get all users with optional filtering"""
    query = {}
    if role:
        query["role"] = role.value
    if function:
        query["function"] = function
    if is_active is not None:
        query["is_active"] = is_active
    
    users = await db.users.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    return [serialize_doc(u) for u in users]


@router.get("/users/{user_id}", response_model=dict)
async def get_user(user_id: str):
    """Get a specific user by ID"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return serialize_doc(user)


@router.post("/users", response_model=dict)
async def create_user(user_create: UserCreate):
    """Create a new user"""
    user = User(
        name=user_create.name,
        email=user_create.email,
        role=user_create.role,
        function=user_create.function,
        avatar_url=user_create.avatar_url,
        is_active=user_create.is_active,
    )
    user_dict = user.model_dump()
    user_dict["created_at"] = user_dict["created_at"].isoformat()
    user_dict["updated_at"] = user_dict["updated_at"].isoformat()
    
    await db.users.insert_one(user_dict)
    return serialize_doc(user_dict)


@router.put("/users/{user_id}", response_model=dict)
async def update_user(user_id: str, user_update: UserCreate):
    """Update a user"""
    existing = await db.users.find_one({"id": user_id})
    if not existing:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = user_update.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.users.update_one({"id": user_id}, {"$set": update_data})
    updated = await db.users.find_one({"id": user_id}, {"_id": 0})
    return serialize_doc(updated)


@router.delete("/users/{user_id}")
async def delete_user(user_id: str):
    """Delete a user (soft delete - sets is_active to False)"""
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deactivated"}


# ==================== SESSION/AUTH ENDPOINTS ====================

@router.post("/session", response_model=dict)
async def create_session(role: RoleType, user_id: Optional[str] = None):
    """
    Create a session for a role (MVP - no real auth).
    In production, this would validate credentials.
    """
    # For MVP, create or get a demo user for this role
    if user_id:
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
    else:
        # Get or create demo user for this role
        user = await db.users.find_one({"role": role.value, "email": f"demo_{role.value.lower()}@labyrinth.local"}, {"_id": 0})
        if not user:
            # Create demo user
            demo_user = User(
                name=f"Demo {ROLE_INFO[role]['display_name']}",
                email=f"demo_{role.value.lower()}@labyrinth.local",
                role=role,
            )
            user_dict = demo_user.model_dump()
            user_dict["created_at"] = user_dict["created_at"].isoformat()
            user_dict["updated_at"] = user_dict["updated_at"].isoformat()
            await db.users.insert_one(user_dict)
            user = user_dict
    
    # Create session
    from datetime import timedelta
    session = Session(
        user_id=user["id"],
        role=role,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    session_dict = session.model_dump()
    session_dict["created_at"] = session_dict["created_at"].isoformat()
    session_dict["expires_at"] = session_dict["expires_at"].isoformat()
    
    await db.sessions.insert_one(session_dict)
    
    return {
        "session_id": session.id,
        "user": serialize_doc(user),
        "role": role.value,
        "permissions": [p.value for p in ROLE_PERMISSIONS.get(role, [])],
        "dashboard_tiles": ROLE_DASHBOARD_TILES.get(role, []),
        "expires_at": session_dict["expires_at"],
    }


@router.get("/session/{session_id}", response_model=dict)
async def get_session(session_id: str):
    """Get session information"""
    session = await db.sessions.find_one({"id": session_id, "is_active": True}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    
    user = await db.users.find_one({"id": session["user_id"]}, {"_id": 0})
    role = RoleType(session["role"])
    
    return {
        "session_id": session["id"],
        "user": serialize_doc(user) if user else None,
        "role": session["role"],
        "permissions": [p.value for p in ROLE_PERMISSIONS.get(role, [])],
        "dashboard_tiles": ROLE_DASHBOARD_TILES.get(role, []),
        "expires_at": session["expires_at"],
    }


@router.delete("/session/{session_id}")
async def end_session(session_id: str):
    """End a session (logout)"""
    result = await db.sessions.update_one(
        {"id": session_id},
        {"$set": {"is_active": False}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session ended"}


# ==================== PERMISSION CHECK ENDPOINT ====================

@router.get("/check-permission")
async def check_permission(
    role: RoleType,
    permission: PermissionType
):
    """Check if a role has a specific permission"""
    role_perms = ROLE_PERMISSIONS.get(role, [])
    has_permission = (
        permission in role_perms or 
        PermissionType.VIEW_ALL in role_perms or 
        PermissionType.EDIT_ALL in role_perms
    )
    return {
        "role": role.value,
        "permission": permission.value,
        "allowed": has_permission,
    }


# ==================== SEED DEMO USERS ====================

@router.post("/seed-demo-users")
async def seed_demo_users():
    """Seed demo users for each role"""
    created = []
    for role in RoleType:
        email = f"demo_{role.value.lower()}@labyrinth.local"
        existing = await db.users.find_one({"email": email})
        if not existing:
            info = ROLE_INFO.get(role, {})
            user = User(
                name=f"Demo {info.get('display_name', role.value)}",
                email=email,
                role=role,
                function="OPERATIONS" if role in [RoleType.COORDINATOR, RoleType.SPECIALIST] else None,
            )
            user_dict = user.model_dump()
            user_dict["created_at"] = user_dict["created_at"].isoformat()
            user_dict["updated_at"] = user_dict["updated_at"].isoformat()
            await db.users.insert_one(user_dict)
            created.append(role.value)
    
    return {"message": f"Created demo users for roles: {created}"}
