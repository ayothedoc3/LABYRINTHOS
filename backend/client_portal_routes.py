"""
Client Portal Routes
Handles client-facing journey: Sign Up, Verification, Lobby V1, Lobby V2
With MongoDB persistence
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import uuid
import random
import string
import os

router = APIRouter(prefix="/client-portal", tags=["Client Portal"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME', 'labyrinth_db')

if mongo_url:
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    clients_collection = db["clients"]
    verification_collection = db["client_verifications"]
else:
    clients_collection = None
    verification_collection = None

# In-memory fallback
clients_db = {}
verification_codes = {}

# ==================== MODELS ====================

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
    verification_sent: Optional[bool] = False

class LobbyStepUpdate(BaseModel):
    step_id: str
    completed: bool
    data: Optional[dict] = None

class VerificationRequest(BaseModel):
    code: str

class AccessProvision(BaseModel):
    access_type: str
    credentials: Optional[dict] = None

# ==================== HELPERS ====================

def client_to_dict(client: dict) -> dict:
    """Convert MongoDB document to API response format"""
    result = {k: v for k, v in client.items() if k != "_id"}
    return result

def generate_verification_code() -> str:
    """Generate a 6-digit verification code"""
    return ''.join(random.choices(string.digits, k=6))

# ==================== SIGN UP ====================

@router.post("/signup", response_model=ClientResponse)
async def client_signup(signup: ClientSignup):
    """Create a new client account and begin onboarding"""
    
    # Check if email already exists
    if clients_collection is not None:
        existing = await clients_collection.find_one({"email": signup.email})
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
    else:
        for c in clients_db.values():
            if c["email"] == signup.email:
                raise HTTPException(status_code=400, detail="Email already registered")
    
    client_id = f"client_{uuid.uuid4().hex[:8]}"
    verification_code = generate_verification_code()
    
    client = {
        "id": client_id,
        "company_name": signup.company_name,
        "email": signup.email,
        "phone": signup.phone,
        "company_size": signup.company_size,
        "status": "unverified",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "verification_sent": True,
        "lobby_progress": {
            "current_stage": "verification",
            "completed_steps": [],
            "access_provided": {},
            "documents_signed": False,
            "video_watched": False
        }
    }
    
    # Store verification code
    verification_data = {
        "client_id": client_id,
        "code": verification_code,
        "email": signup.email,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": datetime.now(timezone.utc).isoformat(),  # In production, add 15 min
        "verified": False
    }
    
    # Persist to MongoDB or fallback
    if clients_collection is not None:
        await clients_collection.insert_one(client)
        await verification_collection.insert_one(verification_data)
    else:
        clients_db[client_id] = client
        verification_codes[client_id] = verification_data
    
    # In production, send email/SMS with verification_code
    # For demo, return it in response (would be removed in prod)
    print(f"[VERIFICATION] Code for {signup.email}: {verification_code}")
    
    return client_to_dict(client)

@router.post("/verify/{client_id}")
async def verify_client(client_id: str, verification: VerificationRequest):
    """Verify client with code sent to email/phone"""
    
    if clients_collection is not None:
        client = await clients_collection.find_one({"id": client_id})
        verification_record = await verification_collection.find_one({"client_id": client_id})
    else:
        client = clients_db.get(client_id)
        verification_record = verification_codes.get(client_id)
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    if not verification_record:
        raise HTTPException(status_code=400, detail="No verification pending")
    
    if verification_record["verified"]:
        raise HTTPException(status_code=400, detail="Already verified")
    
    if verification_record["code"] != verification.code:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    # Update client status
    update_data = {
        "status": "verified",
        "lobby_progress.current_stage": "lobby1"
    }
    
    if clients_collection is not None:
        await clients_collection.update_one(
            {"id": client_id},
            {"$set": update_data}
        )
        await verification_collection.update_one(
            {"client_id": client_id},
            {"$set": {"verified": True}}
        )
        client = await clients_collection.find_one({"id": client_id})
    else:
        client["status"] = "verified"
        client["lobby_progress"]["current_stage"] = "lobby1"
        verification_codes[client_id]["verified"] = True
    
    return {
        "message": "Verification successful",
        "client": client_to_dict(client)
    }

@router.post("/resend-verification/{client_id}")
async def resend_verification(client_id: str):
    """Resend verification code"""
    
    if clients_collection is not None:
        client = await clients_collection.find_one({"id": client_id})
    else:
        client = clients_db.get(client_id)
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    if client["status"] != "unverified":
        raise HTTPException(status_code=400, detail="Client already verified")
    
    new_code = generate_verification_code()
    
    verification_data = {
        "client_id": client_id,
        "code": new_code,
        "email": client["email"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": datetime.now(timezone.utc).isoformat(),
        "verified": False
    }
    
    if clients_collection is not None:
        await verification_collection.update_one(
            {"client_id": client_id},
            {"$set": verification_data},
            upsert=True
        )
    else:
        verification_codes[client_id] = verification_data
    
    print(f"[VERIFICATION] New code for {client['email']}: {new_code}")
    
    return {
        "message": "Verification code resent",
        "email": client["email"]
    }

# ==================== CLIENT RETRIEVAL ====================

@router.get("/clients/{client_id}", response_model=ClientResponse)
async def get_client(client_id: str):
    """Get client details and progress"""
    
    if clients_collection is not None:
        client = await clients_collection.find_one({"id": client_id})
    else:
        client = clients_db.get(client_id)
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    return client_to_dict(client)

@router.get("/clients")
async def list_clients(status: Optional[str] = None):
    """List all clients (admin)"""
    
    if clients_collection is not None:
        query = {}
        if status:
            query["status"] = status
        cursor = clients_collection.find(query)
        clients = await cursor.to_list(length=100)
        return [client_to_dict(c) for c in clients]
    else:
        clients = list(clients_db.values())
        if status:
            clients = [c for c in clients if c["status"] == status]
        return clients

# ==================== LOBBY V1 ====================

@router.patch("/clients/{client_id}/lobby-progress")
async def update_lobby_progress(client_id: str, update: LobbyStepUpdate):
    """Update client's lobby progress"""
    
    if clients_collection is not None:
        client = await clients_collection.find_one({"id": client_id})
    else:
        client = clients_db.get(client_id)
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
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
    
    if clients_collection is not None:
        await clients_collection.update_one(
            {"id": client_id},
            {"$set": {
                "lobby_progress": progress,
                "status": client["status"]
            }}
        )
        client = await clients_collection.find_one({"id": client_id})
    else:
        clients_db[client_id] = client
    
    return {
        "message": "Progress updated",
        "client_id": client_id,
        "progress": progress
    }

@router.post("/clients/{client_id}/provide-access")
async def provide_access(client_id: str, access: AccessProvision):
    """Record that client has provided access to a system"""
    
    if clients_collection is not None:
        client = await clients_collection.find_one({"id": client_id})
    else:
        client = clients_db.get(client_id)
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    access_data = {
        "provided_at": datetime.now(timezone.utc).isoformat(),
        "status": "pending_verification"
    }
    if access.credentials:
        access_data["has_credentials"] = True
    
    client["lobby_progress"]["access_provided"][access.access_type] = access_data
    
    if clients_collection is not None:
        await clients_collection.update_one(
            {"id": client_id},
            {"$set": {
                f"lobby_progress.access_provided.{access.access_type}": access_data
            }}
        )
    else:
        clients_db[client_id] = client
    
    return {
        "message": f"Access to {access.access_type} recorded",
        "access_type": access.access_type,
        "status": "pending_verification"
    }

# ==================== LOBBY V2 ====================

@router.get("/clients/{client_id}/dashboard")
async def get_client_dashboard(client_id: str):
    """Get client's Lobby V2 dashboard data"""
    
    if clients_collection is not None:
        client = await clients_collection.find_one({"id": client_id})
    else:
        client = clients_db.get(client_id)
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
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
            {"id": "training", "title": "Training Portal", "status": "available", "description": "Learn how to work with our systems"},
            {"id": "howto", "title": "How to Work With Us", "status": "available", "description": "Communication and collaboration guide"},
            {"id": "insights", "title": "Insights & Guidance", "status": "available", "description": "AI-powered recommendations"},
            {"id": "reports", "title": "Reports", "status": "available", "description": "Monthly summaries and outcomes"},
            {"id": "collaborate", "title": "Collaborate", "status": "available", "description": "Submit ideas and questions"},
            {"id": "rewards", "title": "Rewards & Progress", "status": "available", "description": "Track your achievements"}
        ],
        "recent_activity": [
            {"type": "task_completed", "title": "Q4 Financial Review", "time": "2 hours ago"},
            {"type": "message", "title": "New message from coordinator", "time": "5 hours ago"},
            {"type": "report", "title": "Monthly report available", "time": "1 day ago"}
        ]
    }

# ==================== TRAININGS ====================

@router.get("/trainings")
async def get_trainings():
    """Get available training modules"""
    return {
        "modules": [
            {
                "id": "onboarding",
                "title": "Getting Started",
                "description": "Introduction to Labyrinth and your team",
                "duration": "15 min",
                "status": "required",
                "progress": 0
            },
            {
                "id": "communication",
                "title": "Communication Guidelines",
                "description": "How to communicate effectively with your team",
                "duration": "20 min",
                "status": "required",
                "progress": 0
            },
            {
                "id": "tools",
                "title": "Tools & Platforms",
                "description": "Overview of tools you'll be using",
                "duration": "30 min",
                "status": "recommended",
                "progress": 0
            },
            {
                "id": "reporting",
                "title": "Understanding Reports",
                "description": "How to read and interpret your dashboards",
                "duration": "25 min",
                "status": "recommended",
                "progress": 0
            }
        ]
    }

@router.get("/trainings/{client_id}/progress")
async def get_training_progress(client_id: str):
    """Get client's training progress"""
    
    if clients_collection is not None:
        client = await clients_collection.find_one({"id": client_id})
    else:
        client = clients_db.get(client_id)
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Return training progress (could be stored in client document)
    training_progress = client.get("training_progress", {})
    
    return {
        "client_id": client_id,
        "completed_modules": training_progress.get("completed", []),
        "in_progress": training_progress.get("in_progress", []),
        "total_time_spent": training_progress.get("total_time", 0)
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
        "verification_sent": True,
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
        },
        "training_progress": {
            "completed": ["onboarding", "communication"],
            "in_progress": ["tools"],
            "total_time": 45
        }
    }
    
    if clients_collection is not None:
        await clients_collection.update_one(
            {"id": "client_demo"},
            {"$set": demo_client},
            upsert=True
        )
    else:
        clients_db["client_demo"] = demo_client
    
    return {
        "message": "Demo client created",
        "client": demo_client
    }

@router.delete("/clients/{client_id}")
async def delete_client(client_id: str):
    """Delete a client (admin)"""
    
    if clients_collection is not None:
        result = await clients_collection.delete_one({"id": client_id})
        await verification_collection.delete_many({"client_id": client_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Client not found")
    else:
        if client_id not in clients_db:
            raise HTTPException(status_code=404, detail="Client not found")
        del clients_db[client_id]
        verification_codes.pop(client_id, None)
    
    return {"message": f"Client {client_id} deleted"}
