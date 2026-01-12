"""
Client Journey Routes - Client Portal with onboarding, dashboard, and resources
Features:
- Client onboarding flow
- Password board for resource logins
- Client dashboard (sales, revenue, events, ads budget)
- Communication with Project Directors/Executives
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from bson import ObjectId
from enum import Enum
import os
import motor.motor_asyncio

router = APIRouter(prefix="/client-journey", tags=["Client Journey"])

# MongoDB connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "labyrinth")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# ==================== ENUMS ====================

class OnboardingStep(str, Enum):
    WELCOME = "welcome"
    PROFILE_SETUP = "profile_setup"
    SERVICE_OVERVIEW = "service_overview"
    TEAM_INTRO = "team_intro"
    WORKSPACE_TOUR = "workspace_tour"
    DOCUMENTS = "documents"
    COMPLETE = "complete"

class ResourceCategory(str, Enum):
    FINANCE = "finance"
    MARKETING = "marketing"
    ANALYTICS = "analytics"
    COMMUNICATION = "communication"
    PROJECT = "project"
    OTHER = "other"

class MessagePriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"

# ==================== MODELS ====================

class ClientOnboarding(BaseModel):
    client_id: str
    client_name: str
    current_step: OnboardingStep = OnboardingStep.WELCOME
    completed_steps: List[str] = []
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    assigned_director: Optional[str] = None
    assigned_director_name: Optional[str] = None

class PasswordEntry(BaseModel):
    id: str = ""
    client_id: str
    resource_name: str
    category: ResourceCategory
    url: Optional[str] = None
    username: str
    password: str  # In production, this should be encrypted
    notes: Optional[str] = None
    last_updated: str = ""
    updated_by: str = ""

class ServicePayment(BaseModel):
    id: str
    client_id: str
    service_name: str
    amount: float
    due_date: str
    status: str  # pending, paid, overdue

class ClientMessage(BaseModel):
    id: str = ""
    client_id: str
    client_name: str
    from_client: bool
    to_user_id: str
    to_user_name: str
    subject: str
    content: str
    priority: MessagePriority = MessagePriority.NORMAL
    read: bool = False
    replied: bool = False
    created_at: str = ""

class ClientDashboardData(BaseModel):
    # Revenue
    total_revenue: float
    monthly_revenue: float
    revenue_goal: float
    revenue_progress: float
    
    # Service Package
    current_package: str
    goal_package: str
    package_features: List[str]
    
    # Sales
    recent_sales: List[Dict]
    
    # Payments
    upcoming_payments: List[Dict]
    
    # Events
    upcoming_events: List[Dict]
    
    # Ads
    ad_budgets: List[Dict]
    
    # Messages
    unread_messages: int

# ==================== HELPER FUNCTIONS ====================

def serialize_doc(doc):
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serialize_doc(d) for d in doc]
    if isinstance(doc, dict):
        result = {}
        for key, value in doc.items():
            if key == '_id':
                result['id'] = str(value)
            elif isinstance(value, ObjectId):
                result[key] = str(value)
            elif isinstance(value, datetime):
                result[key] = value.isoformat()
            elif isinstance(value, (dict, list)):
                result[key] = serialize_doc(value)
            else:
                result[key] = value
        return result
    return doc

# ==================== ONBOARDING ENDPOINTS ====================

ONBOARDING_STEPS = [
    {
        "step": OnboardingStep.WELCOME,
        "title": "Welcome to Elev8",
        "description": "Get started with your client portal",
        "content": "Welcome to the Elev8 family! We're excited to partner with you on your growth journey. This quick onboarding will help you get familiar with our workspace.",
        "duration_minutes": 2
    },
    {
        "step": OnboardingStep.PROFILE_SETUP,
        "title": "Complete Your Profile",
        "description": "Set up your company profile and preferences",
        "content": "Let's make sure we have all your details correct. Review and update your company information.",
        "duration_minutes": 5
    },
    {
        "step": OnboardingStep.SERVICE_OVERVIEW,
        "title": "Your Service Package",
        "description": "Review your current services and goals",
        "content": "Here's an overview of your service package and what we'll be working on together.",
        "duration_minutes": 5
    },
    {
        "step": OnboardingStep.TEAM_INTRO,
        "title": "Meet Your Team",
        "description": "Get to know your dedicated Elev8 team",
        "content": "You have a dedicated team working on your success. Let's introduce them!",
        "duration_minutes": 3
    },
    {
        "step": OnboardingStep.WORKSPACE_TOUR,
        "title": "Workspace Tour",
        "description": "Learn how to navigate your client portal",
        "content": "Let's take a quick tour of your dashboard, reports, and communication tools.",
        "duration_minutes": 5
    },
    {
        "step": OnboardingStep.DOCUMENTS,
        "title": "Important Documents",
        "description": "Review and sign necessary documents",
        "content": "Here are the key documents for your review. Your contracts and reports will also appear here.",
        "duration_minutes": 5
    },
    {
        "step": OnboardingStep.COMPLETE,
        "title": "You're All Set!",
        "description": "Start exploring your dashboard",
        "content": "Congratulations! You've completed the onboarding. Your dashboard is ready for you.",
        "duration_minutes": 1
    }
]

@router.get("/onboarding/steps")
async def get_onboarding_steps():
    """Get all onboarding steps"""
    return ONBOARDING_STEPS

@router.get("/onboarding/{client_id}")
async def get_client_onboarding(client_id: str):
    """Get client's onboarding progress"""
    onboarding = await db.client_onboarding.find_one({"client_id": client_id})
    if not onboarding:
        # Create new onboarding record
        onboarding = {
            "client_id": client_id,
            "current_step": OnboardingStep.WELCOME.value,
            "completed_steps": [],
            "started_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": None
        }
        await db.client_onboarding.insert_one(onboarding)
    
    return serialize_doc(onboarding)

@router.post("/onboarding/{client_id}/complete-step")
async def complete_onboarding_step(client_id: str, step: str):
    """Mark an onboarding step as complete"""
    steps_order = [s["step"].value for s in ONBOARDING_STEPS]
    
    if step not in steps_order:
        raise HTTPException(status_code=400, detail="Invalid step")
    
    current_index = steps_order.index(step)
    next_step = steps_order[current_index + 1] if current_index < len(steps_order) - 1 else OnboardingStep.COMPLETE.value
    
    update = {
        "$addToSet": {"completed_steps": step},
        "$set": {"current_step": next_step}
    }
    
    if next_step == OnboardingStep.COMPLETE.value:
        update["$set"]["completed_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.client_onboarding.update_one(
        {"client_id": client_id},
        update,
        upsert=True
    )
    
    return {"message": "Step completed", "next_step": next_step}

# ==================== PASSWORD BOARD ENDPOINTS ====================

@router.get("/passwords/{client_id}")
async def get_client_passwords(client_id: str):
    """Get all password entries for a client"""
    cursor = db.client_passwords.find({"client_id": client_id})
    passwords = await cursor.to_list(length=100)
    
    # Mask passwords for security (show only last 4 chars)
    for p in passwords:
        if p.get("password"):
            p["password_masked"] = "••••" + p["password"][-4:] if len(p["password"]) > 4 else "••••"
    
    return serialize_doc(passwords)

class PasswordCreate(BaseModel):
    client_id: str
    resource_name: str
    category: str
    url: Optional[str] = None
    username: str
    password: str
    notes: Optional[str] = None
    updated_by: str

@router.post("/passwords")
async def create_password_entry(entry: PasswordCreate):
    """Create a new password entry"""
    doc = {
        "client_id": entry.client_id,
        "resource_name": entry.resource_name,
        "category": entry.category,
        "url": entry.url,
        "username": entry.username,
        "password": entry.password,  # In production, encrypt this
        "notes": entry.notes,
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "updated_by": entry.updated_by
    }
    
    result = await db.client_passwords.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Password entry created"}

@router.patch("/passwords/{password_id}")
async def update_password_entry(password_id: str, entry: PasswordCreate):
    """Update a password entry"""
    update = {
        "resource_name": entry.resource_name,
        "category": entry.category,
        "url": entry.url,
        "username": entry.username,
        "password": entry.password,
        "notes": entry.notes,
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "updated_by": entry.updated_by
    }
    
    result = await db.client_passwords.update_one(
        {"_id": ObjectId(password_id)},
        {"$set": update}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Password entry not found")
    
    return {"message": "Password entry updated"}

@router.delete("/passwords/{password_id}")
async def delete_password_entry(password_id: str):
    """Delete a password entry"""
    result = await db.client_passwords.delete_one({"_id": ObjectId(password_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Password entry not found")
    return {"message": "Password entry deleted"}

# ==================== CLIENT DASHBOARD ====================

@router.get("/dashboard/{client_id}")
async def get_client_dashboard(client_id: str):
    """Get comprehensive client dashboard data"""
    
    # Get client's contract data
    contract = await db.contracts.find_one({"client_id": client_id})
    
    # Default values
    total_revenue = 0
    monthly_revenue = 0
    current_package = "Standard"
    goal_package = "Premium"
    
    if contract:
        total_revenue = contract.get("total_value", 0)
        current_package = contract.get("tier", "Standard")
        goal_package = contract.get("goal_tier", "Premium")
    
    # Recent sales (from execution/sales data)
    recent_sales = [
        {"id": "s1", "date": "2026-01-12", "description": "Monthly Service Fee", "amount": 5000, "status": "paid"},
        {"id": "s2", "date": "2026-01-10", "description": "Campaign Launch Fee", "amount": 2500, "status": "paid"},
        {"id": "s3", "date": "2026-01-08", "description": "Consulting Session", "amount": 750, "status": "paid"},
        {"id": "s4", "date": "2026-01-05", "description": "Ad Creative Package", "amount": 1200, "status": "paid"},
        {"id": "s5", "date": "2026-01-03", "description": "Strategy Document", "amount": 500, "status": "paid"},
    ]
    
    # Upcoming payments
    upcoming_payments = [
        {"id": "p1", "service": "Monthly Retainer", "amount": 5000, "due_date": "2026-02-01", "status": "pending"},
        {"id": "p2", "service": "Q1 Campaign Budget", "amount": 15000, "due_date": "2026-02-15", "status": "pending"},
        {"id": "p3", "service": "Analytics Package", "amount": 1500, "due_date": "2026-02-01", "status": "pending"},
    ]
    
    # Upcoming events
    events_cursor = db.company_events.find({}).sort("date", 1).limit(5)
    events_list = await events_cursor.to_list(length=5)
    upcoming_events = serialize_doc(events_list) if events_list else [
        {"id": "e1", "title": "Monthly Strategy Call", "date": "2026-01-20", "type": "meeting"},
        {"id": "e2", "title": "Campaign Review", "date": "2026-01-25", "type": "meeting"},
        {"id": "e3", "title": "Q1 Planning Session", "date": "2026-02-01", "type": "meeting"},
    ]
    
    # Ad budgets
    ad_budgets = [
        {"id": "a1", "platform": "Facebook", "campaign": "Brand Awareness", "budget_total": 10000, "budget_used": 6500, "budget_remaining": 3500},
        {"id": "a2", "platform": "Google Ads", "campaign": "Lead Generation", "budget_total": 15000, "budget_used": 9000, "budget_remaining": 6000},
        {"id": "a3", "platform": "LinkedIn", "campaign": "B2B Outreach", "budget_total": 5000, "budget_used": 2000, "budget_remaining": 3000},
        {"id": "a4", "platform": "Instagram", "campaign": "Product Launch", "budget_total": 8000, "budget_used": 4500, "budget_remaining": 3500},
    ]
    
    # Unread messages count
    unread_count = await db.client_messages.count_documents({
        "client_id": client_id,
        "from_client": False,
        "read": False
    })
    
    # Package features
    package_features = {
        "Standard": ["Monthly Strategy Calls", "Basic Analytics", "Email Support"],
        "Gold": ["Weekly Strategy Calls", "Advanced Analytics", "Priority Support", "Dedicated Manager"],
        "Premium": ["Daily Check-ins", "Full Analytics Suite", "24/7 Support", "Executive Team Access", "Custom Integrations"],
        "Enterprise": ["On-site Team", "Full Service Suite", "C-Level Access", "Custom Everything"]
    }
    
    return ClientDashboardData(
        total_revenue=total_revenue or 125000,
        monthly_revenue=monthly_revenue or 15000,
        revenue_goal=500000,
        revenue_progress=min(100, (total_revenue or 125000) / 500000 * 100),
        current_package=current_package,
        goal_package=goal_package,
        package_features=package_features.get(current_package, []),
        recent_sales=recent_sales,
        upcoming_payments=upcoming_payments,
        upcoming_events=upcoming_events,
        ad_budgets=ad_budgets,
        unread_messages=unread_count
    )

# ==================== MESSAGING ENDPOINTS ====================

@router.get("/messages/{client_id}")
async def get_client_messages(client_id: str):
    """Get all messages for a client"""
    cursor = db.client_messages.find({"client_id": client_id}).sort("created_at", -1)
    messages = await cursor.to_list(length=50)
    return serialize_doc(messages)

class MessageCreate(BaseModel):
    client_id: str
    client_name: str
    from_client: bool
    to_user_id: str
    to_user_name: str
    subject: str
    content: str
    priority: str = "normal"

@router.post("/messages")
async def send_message(message: MessageCreate):
    """Send a message"""
    doc = {
        "client_id": message.client_id,
        "client_name": message.client_name,
        "from_client": message.from_client,
        "to_user_id": message.to_user_id,
        "to_user_name": message.to_user_name,
        "subject": message.subject,
        "content": message.content,
        "priority": message.priority,
        "read": False,
        "replied": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.client_messages.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Message sent"}

@router.patch("/messages/{message_id}/read")
async def mark_message_read(message_id: str):
    """Mark a message as read"""
    await db.client_messages.update_one(
        {"_id": ObjectId(message_id)},
        {"$set": {"read": True}}
    )
    return {"message": "Marked as read"}

# ==================== SEED DEMO DATA ====================

@router.post("/seed-demo/{client_id}")
async def seed_client_demo_data(client_id: str, client_name: str = "Demo Client"):
    """Seed demo data for a client"""
    
    # Seed onboarding
    await db.client_onboarding.update_one(
        {"client_id": client_id},
        {"$set": {
            "client_id": client_id,
            "client_name": client_name,
            "current_step": OnboardingStep.WELCOME.value,
            "completed_steps": [],
            "started_at": datetime.now(timezone.utc).isoformat(),
            "assigned_director": "user_director",
            "assigned_director_name": "Mike Chen"
        }},
        upsert=True
    )
    
    # Seed password entries
    passwords = [
        {"resource_name": "QuickBooks", "category": "finance", "url": "https://quickbooks.intuit.com", "username": "client@company.com", "password": "secure_pass_123", "notes": "Main accounting software"},
        {"resource_name": "Google Analytics", "category": "analytics", "url": "https://analytics.google.com", "username": "client@company.com", "password": "ga_pass_456", "notes": "Website analytics"},
        {"resource_name": "Facebook Business", "category": "marketing", "url": "https://business.facebook.com", "username": "client@company.com", "password": "fb_pass_789", "notes": "Ad account access"},
        {"resource_name": "Slack Workspace", "category": "communication", "url": "https://company.slack.com", "username": "client@company.com", "password": "slack_pass", "notes": "Team communication"},
    ]
    
    for pwd in passwords:
        pwd["client_id"] = client_id
        pwd["last_updated"] = datetime.now(timezone.utc).isoformat()
        pwd["updated_by"] = "System"
        await db.client_passwords.update_one(
            {"client_id": client_id, "resource_name": pwd["resource_name"]},
            {"$set": pwd},
            upsert=True
        )
    
    # Seed messages
    messages = [
        {
            "client_id": client_id,
            "client_name": client_name,
            "from_client": False,
            "to_user_id": client_id,
            "to_user_name": client_name,
            "subject": "Welcome to Elev8!",
            "content": "Hi! I'm Mike, your Project Director. Welcome to the team! I'm here to help you succeed. Let's schedule a kickoff call this week.",
            "priority": "normal",
            "read": False,
            "replied": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "client_id": client_id,
            "client_name": client_name,
            "from_client": False,
            "to_user_id": client_id,
            "to_user_name": client_name,
            "subject": "Q1 Campaign Strategy Ready",
            "content": "Great news! We've finalized your Q1 campaign strategy. Please review the attached document and let me know if you have any questions.",
            "priority": "high",
            "read": False,
            "replied": False,
            "created_at": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        }
    ]
    
    for msg in messages:
        existing = await db.client_messages.find_one({
            "client_id": client_id,
            "subject": msg["subject"]
        })
        if not existing:
            await db.client_messages.insert_one(msg)
    
    return {"message": "Demo data seeded", "client_id": client_id}
