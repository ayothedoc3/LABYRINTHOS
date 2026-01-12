"""
Team Dashboard Routes - Comprehensive dashboard data for Elev8 team
Includes: Revenue tracking, campaigns, sales, contracts, events, resources, budgets, performers
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from bson import ObjectId
import os
import motor.motor_asyncio

router = APIRouter(prefix="/team-dashboard", tags=["Team Dashboard"])

# MongoDB connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "labyrinth")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# ==================== MODELS ====================

class CampaignProgress(BaseModel):
    id: str
    name: str
    client_name: str
    progress_percent: float
    current_package: str
    goal_package: str
    status: str

class ScaledCampaign(BaseModel):
    id: str
    name: str
    client_name: str
    scaled_revenue: float
    revenue_goal: float
    progress_percent: float

class RecentSale(BaseModel):
    id: str
    client_name: str
    amount: float
    date: str
    salesperson: str
    package: str

class ContractSummary(BaseModel):
    pending: int
    available: int
    closed: int
    total: int

class CompanyEvent(BaseModel):
    id: str
    title: str
    date: str
    type: str  # meeting, deadline, milestone, event
    description: str

class ResourceRequest(BaseModel):
    id: str
    type: str  # software, personnel, training
    title: str
    requested_by: str
    status: str  # pending, approved, rejected
    priority: str
    date: str

class ProjectBudget(BaseModel):
    id: str
    name: str
    completion_date: str
    completion_percent: float
    budget_total: float
    budget_used: float
    budget_remaining: float

class CampaignAdBudget(BaseModel):
    id: str
    campaign_name: str
    budget_total: float
    budget_used: float
    budget_remaining: float
    platform: str

class MilestoneDeadline(BaseModel):
    id: str
    title: str
    project_name: str
    due_date: str
    days_remaining: int
    status: str

class PerformerStats(BaseModel):
    id: str
    name: str
    role: str
    avatar: Optional[str] = None
    kpi_score: float
    scorecard_rating: float
    tasks_completed: int
    deliverables_completed: int = 0

class UpcomingProject(BaseModel):
    id: str
    name: str
    client_name: str
    start_date: str
    status: str
    priority: str

class TeamDashboardData(BaseModel):
    # Revenue Goal
    revenue_goal: float = 100000000  # $100M
    current_revenue: float
    revenue_progress_percent: float
    
    # Campaigns
    top_campaigns: List[CampaignProgress]
    scaled_campaigns: List[ScaledCampaign]
    
    # Sales
    recent_sales: List[RecentSale]
    
    # Contracts
    contracts_summary: ContractSummary
    
    # Events
    upcoming_events: List[CompanyEvent]
    
    # Resources
    resource_requests: List[ResourceRequest]
    
    # Budgets
    project_budgets: List[ProjectBudget]
    campaign_ad_budgets: List[CampaignAdBudget]
    
    # Milestones
    upcoming_milestones: List[MilestoneDeadline]
    
    # Performers
    top_individual_performers: List[PerformerStats]
    top_team_performers: List[PerformerStats]
    
    # Projects
    upcoming_projects: List[UpcomingProject]

# ==================== HELPER FUNCTIONS ====================

def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable dict"""
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

# ==================== ENDPOINTS ====================

@router.get("/overview", response_model=TeamDashboardData)
async def get_team_dashboard():
    """Get comprehensive team dashboard data"""
    
    # Calculate date ranges
    now = datetime.utcnow()
    week_start = now - timedelta(days=now.weekday())
    four_weeks = now + timedelta(weeks=4)
    
    # Get revenue data from sales
    sales_cursor = db.sales_leads.find({"status": "closed_won"})
    sales_list = await sales_cursor.to_list(length=1000)
    total_revenue = sum(s.get("value", 0) for s in sales_list)
    
    # Get campaigns from contracts/execution plans
    campaigns_cursor = db.execution_plans.find({"status": {"$in": ["active", "draft"]}}).sort("created_at", -1).limit(5)
    campaigns_list = await campaigns_cursor.to_list(length=5)
    
    top_campaigns = []
    for c in campaigns_list:
        milestones = c.get("milestones", [])
        completed = len([m for m in milestones if m.get("status") == "completed"])
        total = len(milestones) if milestones else 1
        progress = (completed / total) * 100 if total > 0 else 0
        
        top_campaigns.append(CampaignProgress(
            id=str(c.get("_id", "")),
            name=c.get("title", "Unnamed Campaign"),
            client_name=c.get("client_name", "Unknown Client"),
            progress_percent=round(progress, 1),
            current_package=c.get("tier", "TIER_2"),
            goal_package=c.get("goal_tier", "TIER_1"),
            status=c.get("status", "active")
        ))
    
    # Get scaled campaigns (those with revenue tracking)
    scaled_cursor = db.execution_plans.find({"scaled_revenue": {"$exists": True}}).sort("scaled_revenue", -1).limit(3)
    scaled_list = await scaled_cursor.to_list(length=3)
    
    scaled_campaigns = []
    for s in scaled_list:
        scaled_campaigns.append(ScaledCampaign(
            id=str(s.get("_id", "")),
            name=s.get("title", "Unnamed"),
            client_name=s.get("client_name", "Unknown"),
            scaled_revenue=s.get("scaled_revenue", 0),
            revenue_goal=s.get("revenue_goal", 100000),
            progress_percent=min(100, (s.get("scaled_revenue", 0) / max(s.get("revenue_goal", 100000), 1)) * 100)
        ))
    
    # Fill with demo data if empty
    if not scaled_campaigns:
        scaled_campaigns = [
            ScaledCampaign(id="sc1", name="Frylow National", client_name="Frylow", scaled_revenue=245000, revenue_goal=500000, progress_percent=49),
            ScaledCampaign(id="sc2", name="TechStart Growth", client_name="TechStart Inc", scaled_revenue=180000, revenue_goal=300000, progress_percent=60),
            ScaledCampaign(id="sc3", name="Acme Enterprise", client_name="Acme Corp", scaled_revenue=95000, revenue_goal=200000, progress_percent=47.5),
        ]
    
    # Get recent sales
    recent_sales_cursor = db.sales_leads.find({"status": "closed_won"}).sort("updated_at", -1).limit(10)
    recent_sales_list = await recent_sales_cursor.to_list(length=10)
    
    recent_sales = []
    for sale in recent_sales_list:
        recent_sales.append(RecentSale(
            id=str(sale.get("_id", "")),
            client_name=sale.get("company_name", sale.get("name", "Unknown")),
            amount=sale.get("value", 0),
            date=sale.get("updated_at", datetime.utcnow()).strftime("%Y-%m-%d") if isinstance(sale.get("updated_at"), datetime) else str(sale.get("updated_at", ""))[:10],
            salesperson=sale.get("assigned_to", "Unassigned"),
            package=sale.get("package", "Standard")
        ))
    
    # Fill with demo sales if empty
    if not recent_sales:
        recent_sales = [
            RecentSale(id="s1", client_name="Global Finance Ltd", amount=15000, date="2026-01-12", salesperson="Sarah Johnson", package="Gold"),
            RecentSale(id="s2", client_name="TechStart Inc", amount=25000, date="2026-01-11", salesperson="Mike Chen", package="Enterprise"),
            RecentSale(id="s3", client_name="Acme Corporation", amount=8500, date="2026-01-10", salesperson="Sarah Johnson", package="Silver"),
            RecentSale(id="s4", client_name="Innovate Co", amount=12000, date="2026-01-09", salesperson="Alex Kim", package="Gold"),
            RecentSale(id="s5", client_name="Summit Holdings", amount=35000, date="2026-01-08", salesperson="Mike Chen", package="Enterprise"),
        ]
    
    # Get contracts summary for the week
    contracts_cursor = db.contracts.find({})
    contracts_list = await contracts_cursor.to_list(length=1000)
    
    pending_count = len([c for c in contracts_list if c.get("status") in ["proposal", "bid_submitted", "in_queue"]])
    available_count = len([c for c in contracts_list if c.get("status") in ["active", "available"]])
    closed_count = len([c for c in contracts_list if c.get("status") in ["completed", "closed"]])
    
    contracts_summary = ContractSummary(
        pending=pending_count or 5,
        available=available_count or 8,
        closed=closed_count or 3,
        total=(pending_count + available_count + closed_count) or 16
    )
    
    # Get upcoming events
    events_cursor = db.company_events.find({
        "date": {"$gte": now.isoformat(), "$lte": four_weeks.isoformat()}
    }).sort("date", 1).limit(10)
    events_list = await events_cursor.to_list(length=10)
    
    upcoming_events = []
    for e in events_list:
        upcoming_events.append(CompanyEvent(
            id=str(e.get("_id", "")),
            title=e.get("title", "Untitled Event"),
            date=e.get("date", ""),
            type=e.get("type", "event"),
            description=e.get("description", "")
        ))
    
    # Fill with demo events if empty
    if not upcoming_events:
        upcoming_events = [
            CompanyEvent(id="e1", title="Q1 Planning Meeting", date="2026-01-15", type="meeting", description="Quarterly planning session"),
            CompanyEvent(id="e2", title="Frylow Campaign Launch", date="2026-01-18", type="milestone", description="National campaign go-live"),
            CompanyEvent(id="e3", title="Team Training: New CRM", date="2026-01-20", type="training", description="System training session"),
            CompanyEvent(id="e4", title="Client Review: TechStart", date="2026-01-22", type="meeting", description="Monthly client review"),
            CompanyEvent(id="e5", title="Sprint Demo", date="2026-01-25", type="deadline", description="Sprint 4 demonstration"),
        ]
    
    # Get resource requests
    resources_cursor = db.resource_requests.find({}).sort("created_at", -1).limit(10)
    resources_list = await resources_cursor.to_list(length=10)
    
    resource_requests = []
    for r in resources_list:
        resource_requests.append(ResourceRequest(
            id=str(r.get("_id", "")),
            type=r.get("type", "software"),
            title=r.get("title", "Untitled"),
            requested_by=r.get("requested_by", "Unknown"),
            status=r.get("status", "pending"),
            priority=r.get("priority", "medium"),
            date=r.get("created_at", datetime.utcnow()).strftime("%Y-%m-%d") if isinstance(r.get("created_at"), datetime) else str(r.get("created_at", ""))[:10]
        ))
    
    # Fill with demo resources if empty
    if not resource_requests:
        resource_requests = [
            ResourceRequest(id="r1", type="software", title="Adobe Creative Suite License", requested_by="Design Team", status="pending", priority="high", date="2026-01-12"),
            ResourceRequest(id="r2", type="personnel", title="Junior Developer", requested_by="Tech Team", status="approved", priority="high", date="2026-01-10"),
            ResourceRequest(id="r3", type="training", title="Advanced Analytics Course", requested_by="Marketing", status="pending", priority="medium", date="2026-01-09"),
            ResourceRequest(id="r4", type="software", title="Project Management Tool Upgrade", requested_by="Operations", status="pending", priority="medium", date="2026-01-08"),
        ]
    
    # Get project budgets
    budgets_cursor = db.execution_plans.find({"budget": {"$exists": True}}).limit(6)
    budgets_list = await budgets_cursor.to_list(length=6)
    
    project_budgets = []
    for b in budgets_list:
        budget_total = b.get("budget", 50000)
        budget_used = b.get("budget_used", budget_total * 0.4)
        milestones = b.get("milestones", [])
        completed = len([m for m in milestones if m.get("status") == "completed"])
        total_m = len(milestones) if milestones else 1
        
        project_budgets.append(ProjectBudget(
            id=str(b.get("_id", "")),
            name=b.get("title", "Unnamed Project"),
            completion_date=b.get("end_date", (datetime.utcnow() + timedelta(days=30)).strftime("%Y-%m-%d")),
            completion_percent=round((completed / total_m) * 100, 1) if total_m > 0 else 0,
            budget_total=budget_total,
            budget_used=budget_used,
            budget_remaining=budget_total - budget_used
        ))
    
    # Fill with demo budgets if empty
    if not project_budgets:
        project_budgets = [
            ProjectBudget(id="pb1", name="Frylow National Campaign", completion_date="2026-03-15", completion_percent=35, budget_total=150000, budget_used=52500, budget_remaining=97500),
            ProjectBudget(id="pb2", name="TechStart Platform Build", completion_date="2026-02-28", completion_percent=60, budget_total=85000, budget_used=51000, budget_remaining=34000),
            ProjectBudget(id="pb3", name="Acme Marketing Sprint", completion_date="2026-01-31", completion_percent=80, budget_total=45000, budget_used=36000, budget_remaining=9000),
            ProjectBudget(id="pb4", name="Summit Brand Refresh", completion_date="2026-04-01", completion_percent=15, budget_total=120000, budget_used=18000, budget_remaining=102000),
        ]
    
    # Campaign ad budgets
    campaign_ad_budgets = [
        CampaignAdBudget(id="ab1", campaign_name="Frylow - Facebook", budget_total=25000, budget_used=12500, budget_remaining=12500, platform="Facebook"),
        CampaignAdBudget(id="ab2", campaign_name="Frylow - Google", budget_total=35000, budget_used=28000, budget_remaining=7000, platform="Google"),
        CampaignAdBudget(id="ab3", campaign_name="TechStart - LinkedIn", budget_total=15000, budget_used=8000, budget_remaining=7000, platform="LinkedIn"),
        CampaignAdBudget(id="ab4", campaign_name="Acme - Instagram", budget_total=10000, budget_used=6500, budget_remaining=3500, platform="Instagram"),
    ]
    
    # Get upcoming milestones
    milestones_cursor = db.execution_plans.aggregate([
        {"$unwind": "$milestones"},
        {"$match": {"milestones.status": {"$ne": "completed"}}},
        {"$sort": {"milestones.due_date": 1}},
        {"$limit": 8}
    ])
    milestones_list = await milestones_cursor.to_list(length=8)
    
    upcoming_milestones = []
    for m in milestones_list:
        milestone = m.get("milestones", {})
        due_date = milestone.get("due_date", (datetime.utcnow() + timedelta(days=7)).isoformat())
        if isinstance(due_date, str):
            try:
                due_dt = datetime.fromisoformat(due_date.replace("Z", "+00:00"))
            except:
                due_dt = datetime.utcnow() + timedelta(days=7)
        else:
            due_dt = due_date
        
        days_remaining = (due_dt - datetime.utcnow()).days
        
        upcoming_milestones.append(MilestoneDeadline(
            id=str(milestone.get("id", "")),
            title=milestone.get("title", "Untitled Milestone"),
            project_name=m.get("title", "Unknown Project"),
            due_date=due_dt.strftime("%Y-%m-%d"),
            days_remaining=max(0, days_remaining),
            status=milestone.get("status", "pending")
        ))
    
    # Fill with demo milestones if empty
    if not upcoming_milestones:
        upcoming_milestones = [
            MilestoneDeadline(id="m1", title="Campaign Creative Approval", project_name="Frylow National", due_date="2026-01-16", days_remaining=4, status="in_progress"),
            MilestoneDeadline(id="m2", title="Platform Beta Launch", project_name="TechStart Platform", due_date="2026-01-20", days_remaining=8, status="pending"),
            MilestoneDeadline(id="m3", title="Content Delivery", project_name="Acme Marketing", due_date="2026-01-18", days_remaining=6, status="in_progress"),
            MilestoneDeadline(id="m4", title="Client Review Meeting", project_name="Summit Brand", due_date="2026-01-25", days_remaining=13, status="pending"),
        ]
    
    # Top performers
    top_individual_performers = [
        PerformerStats(id="p1", name="Sarah Johnson", role="Sales Lead", kpi_score=94.5, scorecard_rating=4.8, tasks_completed=28, deliverables_completed=12),
        PerformerStats(id="p2", name="Mike Chen", role="Project Manager", kpi_score=92.0, scorecard_rating=4.7, tasks_completed=35, deliverables_completed=15),
        PerformerStats(id="p3", name="Alex Kim", role="Designer", kpi_score=89.5, scorecard_rating=4.6, tasks_completed=22, deliverables_completed=18),
        PerformerStats(id="p4", name="Jordan Lee", role="Developer", kpi_score=88.0, scorecard_rating=4.5, tasks_completed=30, deliverables_completed=10),
        PerformerStats(id="p5", name="Taylor Martinez", role="Marketing Specialist", kpi_score=87.5, scorecard_rating=4.4, tasks_completed=25, deliverables_completed=8),
    ]
    
    top_team_performers = [
        PerformerStats(id="t1", name="Sales Team", role="Revenue Generation", kpi_score=91.0, scorecard_rating=4.6, tasks_completed=85, deliverables_completed=32),
        PerformerStats(id="t2", name="Development Team", role="Product Delivery", kpi_score=89.0, scorecard_rating=4.5, tasks_completed=120, deliverables_completed=45),
        PerformerStats(id="t3", name="Design Team", role="Creative Output", kpi_score=88.5, scorecard_rating=4.5, tasks_completed=65, deliverables_completed=38),
    ]
    
    # Upcoming projects
    upcoming_projects = [
        UpcomingProject(id="up1", name="Q2 Brand Campaign", client_name="Frylow", start_date="2026-02-01", status="planning", priority="high"),
        UpcomingProject(id="up2", name="Mobile App V2", client_name="TechStart Inc", start_date="2026-02-15", status="planning", priority="high"),
        UpcomingProject(id="up3", name="Website Redesign", client_name="Summit Holdings", start_date="2026-02-20", status="draft", priority="medium"),
        UpcomingProject(id="up4", name="Analytics Dashboard", client_name="Global Finance", start_date="2026-03-01", status="draft", priority="medium"),
        UpcomingProject(id="up5", name="Marketing Automation", client_name="Acme Corp", start_date="2026-03-15", status="planning", priority="low"),
    ]
    
    # Calculate total revenue and progress
    current_revenue = total_revenue if total_revenue > 0 else 12500000  # Demo: $12.5M
    revenue_goal = 100000000  # $100M
    
    return TeamDashboardData(
        revenue_goal=revenue_goal,
        current_revenue=current_revenue,
        revenue_progress_percent=round((current_revenue / revenue_goal) * 100, 2),
        top_campaigns=top_campaigns if top_campaigns else [
            CampaignProgress(id="c1", name="Frylow National Campaign", client_name="Frylow", progress_percent=65, current_package="Gold", goal_package="Enterprise", status="active"),
            CampaignProgress(id="c2", name="TechStart Growth Initiative", client_name="TechStart Inc", progress_percent=45, current_package="Silver", goal_package="Gold", status="active"),
            CampaignProgress(id="c3", name="Acme Digital Transformation", client_name="Acme Corporation", progress_percent=80, current_package="Enterprise", goal_package="Enterprise", status="active"),
            CampaignProgress(id="c4", name="Summit Brand Awareness", client_name="Summit Holdings", progress_percent=25, current_package="Bronze", goal_package="Gold", status="active"),
            CampaignProgress(id="c5", name="Global Finance Expansion", client_name="Global Finance Ltd", progress_percent=55, current_package="Gold", goal_package="Enterprise", status="active"),
        ],
        scaled_campaigns=scaled_campaigns,
        recent_sales=recent_sales,
        contracts_summary=contracts_summary,
        upcoming_events=upcoming_events,
        resource_requests=resource_requests,
        project_budgets=project_budgets,
        campaign_ad_budgets=campaign_ad_budgets,
        upcoming_milestones=upcoming_milestones,
        top_individual_performers=top_individual_performers,
        top_team_performers=top_team_performers,
        upcoming_projects=upcoming_projects
    )


# ==================== RESOURCE REQUESTS CRUD ====================

class ResourceRequestCreate(BaseModel):
    type: str  # software, personnel, training
    title: str
    description: Optional[str] = ""
    requested_by: str
    priority: str = "medium"

@router.post("/resource-requests")
async def create_resource_request(request: ResourceRequestCreate):
    """Create a new resource request"""
    doc = {
        "type": request.type,
        "title": request.title,
        "description": request.description,
        "requested_by": request.requested_by,
        "priority": request.priority,
        "status": "pending",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    result = await db.resource_requests.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Resource request created"}

@router.patch("/resource-requests/{request_id}/status")
async def update_resource_request_status(request_id: str, status: str):
    """Update resource request status"""
    result = await db.resource_requests.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": {"status": status, "updated_at": datetime.utcnow()}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Request not found")
    return {"message": "Status updated"}


# ==================== COMPANY EVENTS CRUD ====================

class CompanyEventCreate(BaseModel):
    title: str
    date: str
    type: str
    description: Optional[str] = ""

@router.post("/events")
async def create_company_event(event: CompanyEventCreate):
    """Create a new company event"""
    doc = {
        "title": event.title,
        "date": event.date,
        "type": event.type,
        "description": event.description,
        "created_at": datetime.utcnow()
    }
    result = await db.company_events.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Event created"}

@router.get("/events")
async def get_company_events():
    """Get all company events"""
    cursor = db.company_events.find({}).sort("date", 1)
    events = await cursor.to_list(length=100)
    return serialize_doc(events)

@router.delete("/events/{event_id}")
async def delete_company_event(event_id: str):
    """Delete a company event"""
    result = await db.company_events.delete_one({"_id": ObjectId(event_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event deleted"}


# ==================== SEED DEMO DATA ====================

@router.post("/seed-demo")
async def seed_demo_data():
    """Seed demo data for the team dashboard"""
    
    # Seed company events
    events = [
        {"title": "Q1 All-Hands Meeting", "date": "2026-01-15", "type": "meeting", "description": "Quarterly company meeting"},
        {"title": "Frylow Campaign Launch", "date": "2026-01-18", "type": "milestone", "description": "National campaign go-live"},
        {"title": "New CRM Training", "date": "2026-01-20", "type": "training", "description": "Team training on new CRM features"},
        {"title": "TechStart Client Review", "date": "2026-01-22", "type": "meeting", "description": "Monthly progress review"},
        {"title": "Sprint 4 Demo", "date": "2026-01-25", "type": "deadline", "description": "Development sprint demonstration"},
        {"title": "Marketing Strategy Session", "date": "2026-01-28", "type": "meeting", "description": "Q2 marketing planning"},
        {"title": "Team Building Event", "date": "2026-02-01", "type": "event", "description": "Virtual team bonding"},
        {"title": "Client Onboarding: Summit", "date": "2026-02-05", "type": "milestone", "description": "New client kickoff"},
    ]
    
    for event in events:
        event["created_at"] = datetime.utcnow()
        await db.company_events.update_one(
            {"title": event["title"]},
            {"$set": event},
            upsert=True
        )
    
    # Seed resource requests
    resources = [
        {"type": "software", "title": "Adobe Creative Cloud - 5 Licenses", "requested_by": "Design Team", "priority": "high", "status": "pending"},
        {"type": "personnel", "title": "Junior Full-Stack Developer", "requested_by": "Tech Team", "priority": "high", "status": "approved"},
        {"type": "training", "title": "Google Analytics Certification", "requested_by": "Marketing Team", "priority": "medium", "status": "pending"},
        {"type": "software", "title": "Figma Enterprise Upgrade", "requested_by": "Design Team", "priority": "medium", "status": "pending"},
        {"type": "personnel", "title": "Content Writer (Part-time)", "requested_by": "Content Team", "priority": "low", "status": "pending"},
        {"type": "training", "title": "Leadership Workshop", "requested_by": "Management", "priority": "medium", "status": "approved"},
    ]
    
    for resource in resources:
        resource["created_at"] = datetime.utcnow()
        resource["updated_at"] = datetime.utcnow()
        await db.resource_requests.update_one(
            {"title": resource["title"]},
            {"$set": resource},
            upsert=True
        )
    
    return {"message": "Demo data seeded successfully", "events_count": len(events), "resources_count": len(resources)}
