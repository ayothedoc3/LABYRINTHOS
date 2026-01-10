"""
Client Portal Routes
Handles client-facing journey: Sign Up, Lobby V1, Lobby V2
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/client-portal", tags=["Client Portal"])

# In-memory storage (would be MongoDB in production)
clients_db = {}
client_progress_db = {}

class ClientSignup(BaseModel):
    company_name: str
    email: EmailStr
    phone: str
    company_size: str

class ClientResponse(BaseModel):
    id: str
    company_name: str
    email: str
    phone: str
    company_size: str
    status: str
    created_at: str
    lobby_progress: dict

class LobbyStepUpdate(BaseModel):
    step_id: str
    completed: bool
    data: Optional[dict] = None

# ==================== SIGN UP ====================

@router.post("/signup", response_model=ClientResponse)
async def client_signup(signup: ClientSignup):
    """Create a new client account and begin onboarding"""
    # Check if email already exists
    for client in clients_db.values():
        if client["email"] == signup.email:
            raise HTTPException(status_code=400, detail="Email already registered")
    
    client_id = f"client_{uuid.uuid4().hex[:8]}"
    
    client = {
        "id": client_id,
        "company_name": signup.company_name,
        "email": signup.email,
        "phone": signup.phone,
        "company_size": signup.company_size,
        "status": "unverified",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "lobby_progress": {
            "current_stage": "lobby1",
            "completed_steps": [],
            "access_provided": {},
            "documents_signed": False,
            "video_watched": False
        }
    }
    
    clients_db[client_id] = client
    return client

@router.get("/clients/{client_id}", response_model=ClientResponse)
async def get_client(client_id: str):
    """Get client details and progress"""
    if client_id not in clients_db:
        raise HTTPException(status_code=404, detail="Client not found")
    return clients_db[client_id]

# ==================== LOBBY V1 ====================

@router.patch("/clients/{client_id}/lobby-progress")
async def update_lobby_progress(client_id: str, update: LobbyStepUpdate):
    """Update client's lobby progress"""
    if client_id not in clients_db:
        raise HTTPException(status_code=404, detail="Client not found")
    
    client = clients_db[client_id]
    progress = client["lobby_progress"]
    
    if update.completed and update.step_id not in progress["completed_steps"]:
        progress["completed_steps"].append(update.step_id)
    
    # Handle specific step data
    if update.step_id == "video":
        progress["video_watched"] = update.completed
    elif update.step_id == "sign":
        progress["documents_signed"] = update.completed
    elif update.step_id == "access" and update.data:
        progress["access_provided"].update(update.data)
    
    # Check if Lobby V1 is complete
    required_steps = ["video", "review", "sign", "access"]
    if all(step in progress["completed_steps"] for step in required_steps):
        progress["current_stage"] = "lobby2"
        client["status"] = "active"
    
    clients_db[client_id] = client
    
    return {
        "message": "Progress updated",
        "client_id": client_id,
        "progress": progress
    }

@router.post("/clients/{client_id}/provide-access")
async def provide_access(client_id: str, access_type: str):
    """Record that client has provided access to a system"""
    if client_id not in clients_db:
        raise HTTPException(status_code=404, detail="Client not found")
    
    client = clients_db[client_id]
    client["lobby_progress"]["access_provided"][access_type] = {
        "provided_at": datetime.now(timezone.utc).isoformat(),
        "status": "pending_verification"
    }
    
    clients_db[client_id] = client
    
    return {
        "message": f"Access to {access_type} recorded",
        "access_type": access_type
    }

# ==================== LOBBY V2 ====================

@router.get("/clients/{client_id}/dashboard")
async def get_client_dashboard(client_id: str):
    """Get client's Lobby V2 dashboard data"""
    if client_id not in clients_db:
        raise HTTPException(status_code=404, detail="Client not found")
    
    client = clients_db[client_id]
    
    # Return dashboard metrics
    return {
        "client": {
            "id": client["id"],
            "company_name": client["company_name"],
            "status": client["status"]
        },
        "metrics": {
            "project_progress": 87,
            "completed_tasks": 12,
            "active_sprints": 3,
            "engagement_score": "A+"
        },
        "tiles": [
            {"id": "training", "title": "Training Portal", "status": "available"},
            {"id": "howto", "title": "How to Work With Us", "status": "available"},
            {"id": "insights", "title": "Insights & Guidance", "status": "available"},
            {"id": "reports", "title": "Reports", "status": "available"},
            {"id": "collaborate", "title": "Collaborate", "status": "available"},
            {"id": "rewards", "title": "Rewards & Progress", "status": "available"}
        ]
    }

# ==================== ADMIN / DEMO ====================

@router.post("/seed-demo-client")
async def seed_demo_client():
    """Create a demo client for testing"""
    demo_client = {
        "id": "client_demo",
        "company_name": "Demo Corporation",
        "email": "demo@example.com",
        "phone": "+1 (555) 123-4567",
        "company_size": "21-50",
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "lobby_progress": {
            "current_stage": "lobby2",
            "completed_steps": ["video", "review", "sign", "access"],
            "access_provided": {
                "quickbooks": {"provided_at": datetime.now(timezone.utc).isoformat(), "status": "verified"},
                "meta_ads": {"provided_at": datetime.now(timezone.utc).isoformat(), "status": "verified"},
                "google_analytics": {"provided_at": datetime.now(timezone.utc).isoformat(), "status": "verified"},
                "crm": {"provided_at": datetime.now(timezone.utc).isoformat(), "status": "verified"}
            },
            "documents_signed": True,
            "video_watched": True
        }
    }
    
    clients_db["client_demo"] = demo_client
    
    return {
        "message": "Demo client created",
        "client": demo_client
    }

@router.get("/clients")
async def list_clients():
    """List all clients (admin)"""
    return list(clients_db.values())
