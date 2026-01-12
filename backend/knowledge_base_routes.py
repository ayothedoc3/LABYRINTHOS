"""
Knowledge Base / SOP Library Routes
Comprehensive documentation and SOP management with contextual display
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from enum import Enum
import uuid
import os
import re

router = APIRouter(prefix="/knowledge-base", tags=["Knowledge Base"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME', 'labyrinth_db')

if mongo_url:
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    sop_collection = db["sop_documents"]
    template_collection = db["sop_templates"]
    category_collection = db["sop_categories"]
    checklist_progress_collection = db["checklist_progress"]
else:
    sop_collection = None
    template_collection = None
    category_collection = None
    checklist_progress_collection = None

# In-memory fallback
sops_db = {}
templates_db = {}
categories_db = {}
checklist_progress_db = {}

# ==================== ENUMS ====================

class SOPCategory(str, Enum):
    SALES = "sales"
    CLIENT_SUCCESS = "client_success"
    OPERATIONS = "operations"
    FINANCE = "finance"
    TRAINING = "training"
    TEMPLATES = "templates"
    GENERAL = "general"

class ContentType(str, Enum):
    MARKDOWN = "markdown"
    RICH_TEXT = "rich_text"
    EXTERNAL_LINK = "external_link"
    EMBEDDED_DOC = "embedded_doc"

class SOPStatus(str, Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"

# ==================== MODELS ====================

class ChecklistItem(BaseModel):
    id: str
    text: str
    required: bool = True
    order: int

class TemplateVariable(BaseModel):
    name: str  # e.g., "client.name"
    label: str  # e.g., "Client Name"
    type: str = "text"  # text, number, date, select
    default_value: Optional[str] = None

class SOPCreate(BaseModel):
    title: str
    description: str
    category: SOPCategory
    content: str
    content_type: ContentType = ContentType.MARKDOWN
    relevant_stages: List[str] = []  # Deal/contract stages this SOP applies to
    relevant_deal_types: List[str] = []  # upsell, new_business, renewal
    relevant_roles: List[str] = []  # executive, coordinator, specialist
    checklist: List[ChecklistItem] = []
    template_variables: List[TemplateVariable] = []
    tags: List[str] = []
    external_url: Optional[str] = None  # Google Docs link
    parent_id: Optional[str] = None  # For nested SOPs

class SOPUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[SOPCategory] = None
    content: Optional[str] = None
    relevant_stages: Optional[List[str]] = None
    relevant_deal_types: Optional[List[str]] = None
    relevant_roles: Optional[List[str]] = None
    checklist: Optional[List[ChecklistItem]] = None
    template_variables: Optional[List[TemplateVariable]] = None
    tags: Optional[List[str]] = None
    status: Optional[SOPStatus] = None

class TemplateCreate(BaseModel):
    title: str
    description: str
    category: SOPCategory
    content: str  # Template with {variable} placeholders
    variables: List[TemplateVariable]
    output_format: str = "markdown"  # markdown, html, pdf

class ChecklistProgressUpdate(BaseModel):
    sop_id: str
    entity_type: str  # deal, contract, client
    entity_id: str
    completed_items: List[str]  # List of checklist item IDs

# ==================== HELPERS ====================

def sop_to_dict(sop: dict) -> dict:
    return {k: v for k, v in sop.items() if k != "_id"}

def template_to_dict(template: dict) -> dict:
    return {k: v for k, v in template.items() if k != "_id"}

def fill_template(content: str, data: dict) -> str:
    """Replace template variables with actual data"""
    def replace_var(match):
        var_path = match.group(1)
        parts = var_path.split('.')
        value = data
        for part in parts:
            if isinstance(value, dict):
                value = value.get(part, f'{{{var_path}}}')
            else:
                return f'{{{var_path}}}'
        return str(value) if value is not None else ''
    
    # Match {variable.path} patterns
    pattern = r'\{([a-zA-Z_][a-zA-Z0-9_.]*)\}'
    return re.sub(pattern, replace_var, content)

# ==================== CATEGORY ENDPOINTS ====================

@router.get("/categories")
async def list_categories():
    """List all SOP categories with counts"""
    
    categories = [
        {"id": "sales", "name": "Sales SOPs", "icon": "trending-up", "description": "Sales processes and techniques"},
        {"id": "client_success", "name": "Client Success", "icon": "users", "description": "Client onboarding and success"},
        {"id": "operations", "name": "Operations", "icon": "settings", "description": "Operational procedures"},
        {"id": "finance", "name": "Finance", "icon": "dollar-sign", "description": "Financial processes"},
        {"id": "training", "name": "Training Materials", "icon": "graduation-cap", "description": "Team training and development"},
        {"id": "templates", "name": "Templates", "icon": "file-text", "description": "Document templates"},
        {"id": "general", "name": "General", "icon": "book", "description": "General documentation"}
    ]
    
    # Get counts for each category
    if sop_collection is not None:
        for cat in categories:
            count = await sop_collection.count_documents({"category": cat["id"], "status": SOPStatus.PUBLISHED.value})
            cat["count"] = count
    else:
        for cat in categories:
            cat["count"] = len([s for s in sops_db.values() if s.get("category") == cat["id"]])
    
    return {"categories": categories}

# ==================== SOP CRUD ENDPOINTS ====================

@router.get("/sops")
async def list_sops(
    category: Optional[SOPCategory] = None,
    stage: Optional[str] = None,
    deal_type: Optional[str] = None,
    role: Optional[str] = None,
    search: Optional[str] = None,
    status: Optional[SOPStatus] = None,
    parent_id: Optional[str] = None
):
    """List SOPs with optional filtering"""
    
    if sop_collection is not None:
        query = {}
        if category:
            query["category"] = category.value
        if stage:
            query["relevant_stages"] = {"$in": [stage]}
        if deal_type:
            query["relevant_deal_types"] = {"$in": [deal_type]}
        if role:
            query["$or"] = [
                {"relevant_roles": {"$in": [role]}},
                {"relevant_roles": {"$size": 0}},
                {"relevant_roles": {"$exists": False}}
            ]
        if status:
            query["status"] = status.value
        else:
            query["status"] = {"$ne": SOPStatus.ARCHIVED.value}
        if parent_id:
            query["parent_id"] = parent_id
        elif parent_id is None:
            query["$or"] = [{"parent_id": None}, {"parent_id": {"$exists": False}}]
        
        cursor = sop_collection.find(query, {"_id": 0}).sort("order", 1)
        sops = await cursor.to_list(length=200)
        
        # Search filter (after query for text search)
        if search:
            search_lower = search.lower()
            sops = [s for s in sops if search_lower in s.get("title", "").lower() or search_lower in s.get("description", "").lower()]
    else:
        sops = list(sops_db.values())
        if category:
            sops = [s for s in sops if s.get("category") == category.value]
        if stage:
            sops = [s for s in sops if stage in s.get("relevant_stages", [])]
        if deal_type:
            sops = [s for s in sops if deal_type in s.get("relevant_deal_types", [])]
        if status:
            sops = [s for s in sops if s.get("status") == status.value]
        else:
            sops = [s for s in sops if s.get("status") != SOPStatus.ARCHIVED.value]
        if search:
            search_lower = search.lower()
            sops = [s for s in sops if search_lower in s.get("title", "").lower() or search_lower in s.get("description", "").lower()]
    
    return {"sops": sops, "total": len(sops)}

@router.get("/sops/{sop_id}")
async def get_sop(sop_id: str):
    """Get SOP details"""
    
    if sop_collection is not None:
        sop = await sop_collection.find_one({"id": sop_id}, {"_id": 0})
    else:
        sop = sops_db.get(sop_id)
    
    if not sop:
        raise HTTPException(status_code=404, detail="SOP not found")
    
    # Get child SOPs if any
    if sop_collection is not None:
        children = await sop_collection.find({"parent_id": sop_id}, {"_id": 0}).to_list(50)
    else:
        children = [s for s in sops_db.values() if s.get("parent_id") == sop_id]
    
    sop["children"] = children
    
    return sop

@router.post("/sops")
async def create_sop(sop: SOPCreate):
    """Create a new SOP"""
    
    sop_id = f"sop_{uuid.uuid4().hex[:8]}"
    
    sop_data = {
        "id": sop_id,
        **sop.dict(),
        "category": sop.category.value,
        "content_type": sop.content_type.value,
        "checklist": [item.dict() for item in sop.checklist],
        "template_variables": [var.dict() for var in sop.template_variables],
        "status": SOPStatus.PUBLISHED.value,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "views": 0,
        "uses": 0,
        "order": 0
    }
    
    if sop_collection is not None:
        await sop_collection.insert_one(sop_data)
    else:
        sops_db[sop_id] = sop_data
    
    return {"message": "SOP created", "sop": sop_to_dict(sop_data)}

@router.patch("/sops/{sop_id}")
async def update_sop(sop_id: str, update: SOPUpdate):
    """Update an SOP"""
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    
    if "category" in update_data:
        update_data["category"] = update_data["category"].value
    if "status" in update_data:
        update_data["status"] = update_data["status"].value
    if "checklist" in update_data:
        update_data["checklist"] = [item.dict() if hasattr(item, 'dict') else item for item in update_data["checklist"]]
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if sop_collection is not None:
        result = await sop_collection.update_one({"id": sop_id}, {"$set": update_data})
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="SOP not found")
        sop = await sop_collection.find_one({"id": sop_id}, {"_id": 0})
    else:
        if sop_id not in sops_db:
            raise HTTPException(status_code=404, detail="SOP not found")
        sops_db[sop_id].update(update_data)
        sop = sops_db[sop_id]
    
    return {"message": "SOP updated", "sop": sop}

@router.delete("/sops/{sop_id}")
async def delete_sop(sop_id: str):
    """Delete an SOP (soft delete - archive)"""
    
    if sop_collection is not None:
        result = await sop_collection.update_one(
            {"id": sop_id},
            {"$set": {"status": SOPStatus.ARCHIVED.value, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="SOP not found")
    else:
        if sop_id not in sops_db:
            raise HTTPException(status_code=404, detail="SOP not found")
        sops_db[sop_id]["status"] = SOPStatus.ARCHIVED.value
    
    return {"message": "SOP archived"}

# ==================== CONTEXTUAL SOP ENDPOINTS ====================

@router.get("/relevant")
async def get_relevant_sops(
    stage: Optional[str] = None,
    deal_type: Optional[str] = None,
    entity_type: Optional[str] = None,
    role: Optional[str] = None
):
    """Get SOPs relevant to current context (stage, deal type, etc.)"""
    
    if sop_collection is not None:
        query = {"status": SOPStatus.PUBLISHED.value}
        
        conditions = []
        if stage:
            conditions.append({"relevant_stages": {"$in": [stage]}})
        if deal_type:
            conditions.append({"relevant_deal_types": {"$in": [deal_type]}})
        
        if conditions:
            query["$or"] = conditions
        
        cursor = sop_collection.find(query, {"_id": 0}).sort("order", 1)
        sops = await cursor.to_list(length=50)
    else:
        sops = [s for s in sops_db.values() if s.get("status") == SOPStatus.PUBLISHED.value]
        if stage:
            sops = [s for s in sops if stage in s.get("relevant_stages", [])]
        if deal_type:
            sops = [s for s in sops if deal_type in s.get("relevant_deal_types", [])]
    
    # Group by category
    grouped = {}
    for sop in sops:
        cat = sop.get("category", "general")
        if cat not in grouped:
            grouped[cat] = []
        grouped[cat].append(sop)
    
    return {
        "sops": sops,
        "grouped": grouped,
        "context": {
            "stage": stage,
            "deal_type": deal_type,
            "entity_type": entity_type
        }
    }

@router.post("/sops/{sop_id}/track-view")
async def track_sop_view(sop_id: str):
    """Track SOP view for analytics"""
    
    if sop_collection is not None:
        await sop_collection.update_one({"id": sop_id}, {"$inc": {"views": 1}})
    elif sop_id in sops_db:
        sops_db[sop_id]["views"] = sops_db[sop_id].get("views", 0) + 1
    
    return {"message": "View tracked"}

@router.post("/sops/{sop_id}/track-use")
async def track_sop_use(sop_id: str):
    """Track SOP usage (template used) for analytics"""
    
    if sop_collection is not None:
        await sop_collection.update_one({"id": sop_id}, {"$inc": {"uses": 1}})
    elif sop_id in sops_db:
        sops_db[sop_id]["uses"] = sops_db[sop_id].get("uses", 0) + 1
    
    return {"message": "Use tracked"}

# ==================== TEMPLATE ENDPOINTS ====================

@router.get("/templates")
async def list_templates(category: Optional[SOPCategory] = None):
    """List document templates"""
    
    if template_collection is not None:
        query = {}
        if category:
            query["category"] = category.value
        cursor = template_collection.find(query, {"_id": 0})
        templates = await cursor.to_list(length=100)
    else:
        templates = list(templates_db.values())
        if category:
            templates = [t for t in templates if t.get("category") == category.value]
    
    return {"templates": templates, "total": len(templates)}

@router.post("/templates")
async def create_template(template: TemplateCreate):
    """Create a document template"""
    
    template_id = f"tmpl_{uuid.uuid4().hex[:8]}"
    
    template_data = {
        "id": template_id,
        **template.dict(),
        "category": template.category.value,
        "variables": [var.dict() for var in template.variables],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "uses": 0
    }
    
    if template_collection is not None:
        await template_collection.insert_one(template_data)
    else:
        templates_db[template_id] = template_data
    
    return {"message": "Template created", "template": template_to_dict(template_data)}

@router.post("/templates/{template_id}/fill")
async def fill_template_endpoint(template_id: str, data: dict):
    """Fill a template with provided data"""
    
    if template_collection is not None:
        template = await template_collection.find_one({"id": template_id}, {"_id": 0})
    else:
        template = templates_db.get(template_id)
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    filled_content = fill_template(template.get("content", ""), data)
    
    # Track usage
    if template_collection is not None:
        await template_collection.update_one({"id": template_id}, {"$inc": {"uses": 1}})
    elif template_id in templates_db:
        templates_db[template_id]["uses"] = templates_db[template_id].get("uses", 0) + 1
    
    return {
        "template_id": template_id,
        "filled_content": filled_content,
        "original_variables": template.get("variables", []),
        "data_used": data
    }

# ==================== CHECKLIST ENDPOINTS ====================

@router.get("/checklist-progress/{entity_type}/{entity_id}")
async def get_checklist_progress(entity_type: str, entity_id: str):
    """Get checklist progress for an entity (deal, contract, etc.)"""
    
    if checklist_progress_collection is not None:
        progress = await checklist_progress_collection.find(
            {"entity_type": entity_type, "entity_id": entity_id},
            {"_id": 0}
        ).to_list(100)
    else:
        progress = [p for p in checklist_progress_db.values() 
                   if p.get("entity_type") == entity_type and p.get("entity_id") == entity_id]
    
    return {"progress": progress}

@router.post("/checklist-progress")
async def update_checklist_progress(update: ChecklistProgressUpdate):
    """Update checklist progress for an entity"""
    
    progress_id = f"{update.sop_id}_{update.entity_type}_{update.entity_id}"
    
    progress_data = {
        "id": progress_id,
        **update.dict(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if checklist_progress_collection is not None:
        await checklist_progress_collection.update_one(
            {"id": progress_id},
            {"$set": progress_data},
            upsert=True
        )
    else:
        checklist_progress_db[progress_id] = progress_data
    
    return {"message": "Progress updated", "progress": progress_data}

@router.get("/checklist-complete/{entity_type}/{entity_id}/{sop_id}")
async def check_checklist_complete(entity_type: str, entity_id: str, sop_id: str):
    """Check if all required checklist items are complete for stage gating"""
    
    # Get the SOP
    if sop_collection is not None:
        sop = await sop_collection.find_one({"id": sop_id}, {"_id": 0})
    else:
        sop = sops_db.get(sop_id)
    
    if not sop:
        return {"complete": True, "message": "SOP not found"}
    
    checklist = sop.get("checklist", [])
    required_items = [item["id"] for item in checklist if item.get("required", True)]
    
    if not required_items:
        return {"complete": True, "message": "No required checklist items"}
    
    # Get progress
    progress_id = f"{sop_id}_{entity_type}_{entity_id}"
    
    if checklist_progress_collection is not None:
        progress = await checklist_progress_collection.find_one({"id": progress_id}, {"_id": 0})
    else:
        progress = checklist_progress_db.get(progress_id)
    
    completed_items = progress.get("completed_items", []) if progress else []
    
    # Check if all required items are complete
    missing = [item for item in required_items if item not in completed_items]
    
    return {
        "complete": len(missing) == 0,
        "required_items": required_items,
        "completed_items": completed_items,
        "missing_items": missing,
        "progress_percent": round(len(completed_items) / len(required_items) * 100) if required_items else 100
    }

# ==================== ANALYTICS ====================

@router.get("/analytics")
async def get_knowledge_base_analytics():
    """Get Knowledge Base usage analytics"""
    
    if sop_collection is not None:
        total_sops = await sop_collection.count_documents({"status": SOPStatus.PUBLISHED.value})
        total_views = 0
        total_uses = 0
        
        # Get view and use counts
        pipeline = [
            {"$match": {"status": SOPStatus.PUBLISHED.value}},
            {"$group": {"_id": None, "views": {"$sum": "$views"}, "uses": {"$sum": "$uses"}}}
        ]
        result = await sop_collection.aggregate(pipeline).to_list(1)
        if result:
            total_views = result[0].get("views", 0)
            total_uses = result[0].get("uses", 0)
        
        # By category
        cat_pipeline = [
            {"$match": {"status": SOPStatus.PUBLISHED.value}},
            {"$group": {"_id": "$category", "count": {"$sum": 1}, "views": {"$sum": "$views"}}}
        ]
        by_category = await sop_collection.aggregate(cat_pipeline).to_list(20)
        
        total_templates = await template_collection.count_documents({})
    else:
        published_sops = [s for s in sops_db.values() if s.get("status") == SOPStatus.PUBLISHED.value]
        total_sops = len(published_sops)
        total_views = sum(s.get("views", 0) for s in published_sops)
        total_uses = sum(s.get("uses", 0) for s in published_sops)
        
        by_category = {}
        for s in published_sops:
            cat = s.get("category", "general")
            if cat not in by_category:
                by_category[cat] = {"count": 0, "views": 0}
            by_category[cat]["count"] += 1
            by_category[cat]["views"] += s.get("views", 0)
        by_category = [{"_id": k, **v} for k, v in by_category.items()]
        
        total_templates = len(templates_db)
    
    return {
        "total_sops": total_sops,
        "total_templates": total_templates,
        "total_views": total_views,
        "total_uses": total_uses,
        "by_category": {item["_id"]: {"count": item["count"], "views": item.get("views", 0)} for item in by_category}
    }

# ==================== SEED DATA ====================

@router.post("/seed-demo")
async def seed_demo_data():
    """Seed demo Knowledge Base data"""
    
    demo_sops = [
        # Sales SOPs
        {
            "id": "sop_upsell_001",
            "title": "Upsell Trigger Protocol",
            "description": "Standard procedure for identifying and pursuing upsell opportunities",
            "category": SOPCategory.SALES.value,
            "content": """# Upsell Trigger Protocol

## Overview
This SOP outlines the process for identifying and capitalizing on upsell opportunities with existing clients.

## When to Trigger
- Client KPIs exceed targets by 20%+
- Client expresses interest in scaling
- Contract renewal approaching (90 days)
- New service/feature launch

## Step-by-Step Process

### Step 1: Review KPI Dashboard
1. Access client KPI dashboard
2. Review performance against targets
3. Identify growth metrics

### Step 2: Tag Account
1. Go to CRM → Accounts
2. Add tag "Upsell Opportunity"
3. Set priority level

### Step 3: Record Context
Use the Context Recording template to document:
- Current package tier: {client.package_tier}
- Key metrics: {client.kpi_metrics}
- Identified opportunity: {deal.upsell_context}

### Step 4: Assign Account Manager
1. Review account manager availability
2. Assign based on expertise and capacity
3. Schedule handoff meeting

## Success Metrics
- Upsell conversion rate: 30%+
- Average deal value increase: 25%+
- Time to close: < 45 days
""",
            "content_type": ContentType.MARKDOWN.value,
            "relevant_stages": ["assessment", "proposal", "negotiation"],
            "relevant_deal_types": ["upsell"],
            "relevant_roles": ["coordinator", "executive"],
            "checklist": [
                {"id": "check_1", "text": "Review client KPI dashboard", "required": True, "order": 1},
                {"id": "check_2", "text": "Tag account 'Upsell Opportunity'", "required": True, "order": 2},
                {"id": "check_3", "text": "Record context in deal notes", "required": True, "order": 3},
                {"id": "check_4", "text": "Assign account manager", "required": True, "order": 4},
                {"id": "check_5", "text": "Schedule discovery call", "required": False, "order": 5}
            ],
            "template_variables": [
                {"name": "client.name", "label": "Client Name", "type": "text"},
                {"name": "client.package_tier", "label": "Current Package", "type": "select"},
                {"name": "client.kpi_metrics", "label": "KPI Metrics", "type": "text"},
                {"name": "deal.upsell_context", "label": "Opportunity Context", "type": "text"}
            ],
            "tags": ["upsell", "sales", "growth"],
            "external_url": None,
            "status": SOPStatus.PUBLISHED.value,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "views": 45,
            "uses": 12,
            "order": 1
        },
        {
            "id": "sop_discovery_001",
            "title": "Discovery Call Process",
            "description": "Framework for conducting effective discovery calls with prospects",
            "category": SOPCategory.SALES.value,
            "content": """# Discovery Call Process

## Objective
Understand the prospect's needs, challenges, and goals to qualify the opportunity.

## Pre-Call Preparation
1. Research company background
2. Review any previous interactions
3. Prepare discovery questions
4. Set up call recording

## Call Structure (45-60 min)

### Opening (5 min)
- Introduce yourself and company
- Set agenda and expectations
- Confirm time available

### Discovery Questions (30 min)
1. **Current Situation**
   - "What does your current process look like?"
   - "How long have you been doing it this way?"

2. **Pain Points**
   - "What challenges are you facing?"
   - "How is this affecting your business?"

3. **Goals**
   - "What would success look like?"
   - "What's your timeline?"

4. **Decision Process**
   - "Who else is involved in this decision?"
   - "What's your budget range?"

### Next Steps (10 min)
- Summarize key points
- Propose next steps
- Schedule follow-up

## Post-Call Actions
- [ ] Complete call notes within 2 hours
- [ ] Update CRM with qualification data
- [ ] Send follow-up email
- [ ] Schedule next meeting
""",
            "content_type": ContentType.MARKDOWN.value,
            "relevant_stages": ["discovery", "qualification"],
            "relevant_deal_types": ["new_business"],
            "relevant_roles": ["specialist", "coordinator"],
            "checklist": [
                {"id": "disc_1", "text": "Research company background", "required": True, "order": 1},
                {"id": "disc_2", "text": "Prepare discovery questions", "required": True, "order": 2},
                {"id": "disc_3", "text": "Conduct discovery call", "required": True, "order": 3},
                {"id": "disc_4", "text": "Complete call notes", "required": True, "order": 4},
                {"id": "disc_5", "text": "Update CRM qualification data", "required": True, "order": 5},
                {"id": "disc_6", "text": "Send follow-up email", "required": True, "order": 6}
            ],
            "template_variables": [],
            "tags": ["discovery", "sales", "qualification"],
            "status": SOPStatus.PUBLISHED.value,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "views": 78,
            "uses": 34,
            "order": 2
        },
        # Client Success SOPs
        {
            "id": "sop_onboarding_001",
            "title": "Client Onboarding - Bronze Tier",
            "description": "Standard onboarding process for Bronze tier clients",
            "category": SOPCategory.CLIENT_SUCCESS.value,
            "content": """# Bronze Tier Onboarding

## Timeline: 2 Weeks

### Week 1: Setup & Introduction

**Day 1-2: Welcome**
- Send welcome email with portal access
- Schedule kickoff call
- Share onboarding checklist

**Day 3-5: Access Setup**
- Create client portal account
- Grant system access
- Configure dashboards

### Week 2: Training & Launch

**Day 6-8: Training**
- Conduct platform walkthrough
- Share training videos
- Complete Q&A session

**Day 9-10: Go Live**
- Confirm all systems working
- Transition to BAU support
- Schedule 30-day check-in

## Client Information
- **Company:** {client.name}
- **Primary Contact:** {client.contact_name}
- **Email:** {client.email}
- **Package:** {client.package_tier}
- **Start Date:** {client.start_date}

## Success Criteria
- [ ] Portal access confirmed
- [ ] Training completed
- [ ] First report generated
- [ ] Support channel established
""",
            "content_type": ContentType.MARKDOWN.value,
            "relevant_stages": ["onboarding", "implementation"],
            "relevant_deal_types": [],
            "relevant_roles": ["coordinator", "specialist"],
            "checklist": [
                {"id": "onb_1", "text": "Send welcome email", "required": True, "order": 1},
                {"id": "onb_2", "text": "Schedule kickoff call", "required": True, "order": 2},
                {"id": "onb_3", "text": "Create portal account", "required": True, "order": 3},
                {"id": "onb_4", "text": "Grant system access", "required": True, "order": 4},
                {"id": "onb_5", "text": "Conduct training session", "required": True, "order": 5},
                {"id": "onb_6", "text": "Confirm go-live", "required": True, "order": 6},
                {"id": "onb_7", "text": "Schedule 30-day check-in", "required": True, "order": 7}
            ],
            "template_variables": [
                {"name": "client.name", "label": "Company Name", "type": "text"},
                {"name": "client.contact_name", "label": "Contact Name", "type": "text"},
                {"name": "client.email", "label": "Email", "type": "text"},
                {"name": "client.package_tier", "label": "Package Tier", "type": "select"},
                {"name": "client.start_date", "label": "Start Date", "type": "date"}
            ],
            "tags": ["onboarding", "bronze", "client-success"],
            "status": SOPStatus.PUBLISHED.value,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "views": 56,
            "uses": 23,
            "order": 1
        },
        # Training Materials
        {
            "id": "sop_crm_training_001",
            "title": "CRM Usage Guide",
            "description": "Complete guide to using the Labyrinth CRM system",
            "category": SOPCategory.TRAINING.value,
            "content": """# Labyrinth CRM Usage Guide

## Getting Started

### Logging In
1. Go to Labyrinth portal
2. Enter your credentials
3. Complete 2FA verification

### Dashboard Overview
- **Deals Pipeline:** Active opportunities
- **Tasks:** Your assigned work
- **Notifications:** Alerts and reminders
- **Reports:** Performance metrics

## Key Features

### Managing Deals
1. Click "New Deal" button
2. Fill in deal details
3. Select appropriate stage
4. Assign team members

### Task Management
- View tasks in "Execution" tab
- Update status as you progress
- Add notes and attachments

### Using SOPs
- SOPs appear in sidebar based on current stage
- Follow checklists to ensure compliance
- Use templates for consistent output

## Best Practices
- Update deal status daily
- Complete all checklist items before stage changes
- Log all client interactions
- Review dashboards weekly
""",
            "content_type": ContentType.MARKDOWN.value,
            "relevant_stages": [],
            "relevant_deal_types": [],
            "relevant_roles": [],
            "checklist": [],
            "template_variables": [],
            "tags": ["training", "crm", "getting-started"],
            "status": SOPStatus.PUBLISHED.value,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "views": 124,
            "uses": 0,
            "order": 1
        },
        # Templates
        {
            "id": "sop_proposal_template",
            "title": "Proposal Template",
            "description": "Standard proposal template with auto-fill fields",
            "category": SOPCategory.TEMPLATES.value,
            "content": """# Business Proposal

**Prepared for:** {client.name}
**Prepared by:** {user.name}
**Date:** {current_date}

---

## Executive Summary

{client.name} has expressed interest in {deal.service_type}. Based on our discovery call on {deal.discovery_date}, we understand your key challenges are:

{deal.pain_points}

## Proposed Solution

We recommend our {deal.proposed_package} package, which includes:

{deal.deliverables}

## Investment

| Item | Amount |
|------|--------|
| {deal.proposed_package} | ${deal.value} |
| Implementation | Included |
| Training | Included |
| **Total** | **${deal.value}** |

## Timeline

- **Start Date:** {deal.proposed_start}
- **Duration:** {deal.duration}

## Next Steps

1. Review this proposal
2. Schedule follow-up call
3. Finalize agreement
4. Begin onboarding

---

*This proposal is valid for 30 days.*
""",
            "content_type": ContentType.MARKDOWN.value,
            "relevant_stages": ["proposal"],
            "relevant_deal_types": ["new_business", "upsell"],
            "relevant_roles": [],
            "checklist": [],
            "template_variables": [
                {"name": "client.name", "label": "Client Name", "type": "text"},
                {"name": "user.name", "label": "Your Name", "type": "text"},
                {"name": "current_date", "label": "Date", "type": "date"},
                {"name": "deal.service_type", "label": "Service Type", "type": "text"},
                {"name": "deal.discovery_date", "label": "Discovery Date", "type": "date"},
                {"name": "deal.pain_points", "label": "Pain Points", "type": "text"},
                {"name": "deal.proposed_package", "label": "Proposed Package", "type": "select"},
                {"name": "deal.deliverables", "label": "Deliverables", "type": "text"},
                {"name": "deal.value", "label": "Deal Value", "type": "number"},
                {"name": "deal.proposed_start", "label": "Start Date", "type": "date"},
                {"name": "deal.duration", "label": "Duration", "type": "text"}
            ],
            "tags": ["template", "proposal", "sales"],
            "status": SOPStatus.PUBLISHED.value,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "views": 89,
            "uses": 45,
            "order": 1
        },
        # Contract Lifecycle SOPs
        {
            "id": "sop_active_contract_001",
            "title": "Active Contract Management",
            "description": "Daily procedures for managing active contracts",
            "category": SOPCategory.OPERATIONS.value,
            "content": """# Active Contract Management

## Overview
This SOP covers daily management procedures for active contracts.

## Daily Checklist
1. Review pending deliverables
2. Check client communications
3. Update progress tracking
4. Log any issues or blockers

## Weekly Tasks
- Status report generation
- Resource allocation review
- KPI tracking update
- Client check-in scheduling

## Escalation Protocol
If issues arise:
1. Document the issue clearly
2. Notify project manager within 24 hours
3. Create action plan
4. Follow up within 48 hours
""",
            "content_type": ContentType.MARKDOWN.value,
            "relevant_stages": ["active", "queued", "in_queue"],
            "relevant_deal_types": ["project", "retainer"],
            "relevant_roles": ["coordinator", "specialist"],
            "checklist": [
                {"id": "act_1", "text": "Review pending deliverables", "required": True, "order": 1},
                {"id": "act_2", "text": "Check client communications", "required": True, "order": 2},
                {"id": "act_3", "text": "Update progress tracking", "required": True, "order": 3},
                {"id": "act_4", "text": "Log any issues or blockers", "required": False, "order": 4}
            ],
            "template_variables": [],
            "tags": ["active", "contract", "operations"],
            "status": SOPStatus.PUBLISHED.value,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "views": 34,
            "uses": 18,
            "order": 1
        },
        {
            "id": "sop_proposal_contract_001",
            "title": "Contract Proposal Guidelines",
            "description": "Standards for creating and submitting contract proposals",
            "category": SOPCategory.SALES.value,
            "content": """# Contract Proposal Guidelines

## Before You Start
- Verify client requirements are documented
- Confirm budget range and timeline
- Check resource availability

## Proposal Structure
1. Executive Summary
2. Scope of Work
3. Timeline & Milestones
4. Pricing & Terms
5. Team & Resources
6. Terms & Conditions

## Approval Workflow
1. Draft review by team lead
2. Financial review for pricing
3. Legal review for terms
4. Final approval from executive

## Submission Checklist
- [ ] All sections complete
- [ ] Pricing verified
- [ ] Legal terms approved
- [ ] Client details accurate
""",
            "content_type": ContentType.MARKDOWN.value,
            "relevant_stages": ["proposal", "bid_submitted"],
            "relevant_deal_types": ["new_business", "upsell"],
            "relevant_roles": ["executive", "coordinator"],
            "checklist": [
                {"id": "prop_1", "text": "Verify client requirements documented", "required": True, "order": 1},
                {"id": "prop_2", "text": "Confirm budget and timeline", "required": True, "order": 2},
                {"id": "prop_3", "text": "Check resource availability", "required": True, "order": 3},
                {"id": "prop_4", "text": "Complete all proposal sections", "required": True, "order": 4},
                {"id": "prop_5", "text": "Get financial review", "required": True, "order": 5},
                {"id": "prop_6", "text": "Obtain legal approval", "required": True, "order": 6}
            ],
            "template_variables": [
                {"name": "client.name", "label": "Client Name", "type": "text"},
                {"name": "project.scope", "label": "Project Scope", "type": "text"},
                {"name": "project.budget", "label": "Budget", "type": "number"}
            ],
            "tags": ["proposal", "contract", "sales"],
            "status": SOPStatus.PUBLISHED.value,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "views": 67,
            "uses": 32,
            "order": 2
        }
    ]
    
    demo_templates = [
        {
            "id": "tmpl_context_sheet",
            "title": "Context Recording Sheet",
            "description": "Template for recording deal context and opportunity details",
            "category": SOPCategory.SALES.value,
            "content": """# Context Recording Sheet

**Client:** {client.name}
**Date:** {current_date}
**Recorded by:** {user.name}

## Current Situation
- **Package Tier:** {client.package_tier}
- **Current Value:** ${client.current_value}
- **Contract End:** {client.contract_end}

## Opportunity Identified
**Type:** {opportunity.type}
**Trigger:** {opportunity.trigger}

## Client Signals
{opportunity.signals}

## Recommended Action
{opportunity.recommendation}

## Next Steps
1. {next_step_1}
2. {next_step_2}
3. {next_step_3}
""",
            "variables": [
                {"name": "client.name", "label": "Client Name", "type": "text"},
                {"name": "current_date", "label": "Date", "type": "date"},
                {"name": "user.name", "label": "Your Name", "type": "text"},
                {"name": "client.package_tier", "label": "Package Tier", "type": "select"},
                {"name": "client.current_value", "label": "Current Value", "type": "number"},
                {"name": "client.contract_end", "label": "Contract End Date", "type": "date"},
                {"name": "opportunity.type", "label": "Opportunity Type", "type": "select"},
                {"name": "opportunity.trigger", "label": "Trigger Event", "type": "text"},
                {"name": "opportunity.signals", "label": "Client Signals", "type": "text"},
                {"name": "opportunity.recommendation", "label": "Recommendation", "type": "text"},
                {"name": "next_step_1", "label": "Next Step 1", "type": "text"},
                {"name": "next_step_2", "label": "Next Step 2", "type": "text"},
                {"name": "next_step_3", "label": "Next Step 3", "type": "text"}
            ],
            "output_format": "markdown",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "uses": 28
        }
    ]
    
    if sop_collection is not None:
        await sop_collection.delete_many({})
        await template_collection.delete_many({})
        for sop in demo_sops:
            await sop_collection.insert_one(sop)
        for template in demo_templates:
            await template_collection.insert_one(template)
    else:
        sops_db.clear()
        templates_db.clear()
        for sop in demo_sops:
            sops_db[sop["id"]] = sop
        for template in demo_templates:
            templates_db[template["id"]] = template
    
    return {
        "message": "Demo data seeded",
        "sops": len(demo_sops),
        "templates": len(demo_templates)
    }
