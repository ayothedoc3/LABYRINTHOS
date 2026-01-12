"""
Team Trainings Routes
Handles role-based training modules and progress tracking
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import uuid
import os

router = APIRouter(prefix="/trainings", tags=["Team Trainings"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME', 'labyrinth_db')

if mongo_url:
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    trainings_collection = db["trainings"]
    training_progress_collection = db["training_progress"]
else:
    trainings_collection = None
    training_progress_collection = None

# In-memory fallback
trainings_db = {}
progress_db = {}

# ==================== MODELS ====================

class TrainingModule(BaseModel):
    id: str
    title: str
    description: str
    category: str  # onboarding, skills, compliance, tools
    duration_minutes: int
    role_required: Optional[str] = None  # executive, coordinator, specialist, all
    order: int
    content_type: str  # video, document, quiz, interactive
    status: str = "active"

class TrainingProgress(BaseModel):
    user_id: str
    module_id: str
    status: str  # not_started, in_progress, completed
    progress_percent: int
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    quiz_score: Optional[int] = None

class ProgressUpdate(BaseModel):
    status: Optional[str] = None
    progress_percent: Optional[int] = None
    quiz_score: Optional[int] = None

# ==================== HELPERS ====================

def training_to_dict(training: dict) -> dict:
    return {k: v for k, v in training.items() if k != "_id"}

def progress_to_dict(progress: dict) -> dict:
    return {k: v for k, v in progress.items() if k != "_id"}

# ==================== DEFAULT MODULES ====================

DEFAULT_MODULES = [
    {
        "id": "onboarding-101",
        "title": "Welcome to Labyrinth",
        "description": "Introduction to the platform, team structure, and your role",
        "category": "onboarding",
        "duration_minutes": 15,
        "role_required": "all",
        "order": 1,
        "content_type": "video",
        "status": "active"
    },
    {
        "id": "communication-basics",
        "title": "Communication Guidelines",
        "description": "Best practices for team communication and client interactions",
        "category": "onboarding",
        "duration_minutes": 20,
        "role_required": "all",
        "order": 2,
        "content_type": "document",
        "status": "active"
    },
    {
        "id": "tools-overview",
        "title": "Tools & Platforms",
        "description": "Overview of all tools and systems you'll use daily",
        "category": "tools",
        "duration_minutes": 30,
        "role_required": "all",
        "order": 3,
        "content_type": "interactive",
        "status": "active"
    },
    {
        "id": "executive-leadership",
        "title": "Executive Leadership",
        "description": "Strategic decision-making and oversight responsibilities",
        "category": "skills",
        "duration_minutes": 45,
        "role_required": "executive",
        "order": 4,
        "content_type": "video",
        "status": "active"
    },
    {
        "id": "coordinator-workflow",
        "title": "Coordinator Workflow Mastery",
        "description": "Task management, delegation, and progress tracking",
        "category": "skills",
        "duration_minutes": 40,
        "role_required": "coordinator",
        "order": 5,
        "content_type": "interactive",
        "status": "active"
    },
    {
        "id": "specialist-excellence",
        "title": "Specialist Excellence",
        "description": "Execution best practices and quality standards",
        "category": "skills",
        "duration_minutes": 35,
        "role_required": "specialist",
        "order": 6,
        "content_type": "video",
        "status": "active"
    },
    {
        "id": "compliance-101",
        "title": "Compliance & Security",
        "description": "Data protection, security protocols, and compliance requirements",
        "category": "compliance",
        "duration_minutes": 25,
        "role_required": "all",
        "order": 7,
        "content_type": "quiz",
        "status": "active"
    },
    {
        "id": "reporting-analytics",
        "title": "Understanding Reports & Analytics",
        "description": "How to read dashboards, interpret metrics, and make data-driven decisions",
        "category": "tools",
        "duration_minutes": 30,
        "role_required": "all",
        "order": 8,
        "content_type": "document",
        "status": "active"
    }
]

# ==================== TRAINING MODULES ====================

@router.get("/modules")
async def list_training_modules(
    role: Optional[str] = None,
    category: Optional[str] = None
):
    """List all training modules with optional filtering"""
    
    if trainings_collection is not None:
        query = {"status": "active"}
        if category:
            query["category"] = category
        cursor = trainings_collection.find(query).sort("order", 1)
        modules = await cursor.to_list(length=100)
        modules = [training_to_dict(m) for m in modules]
    else:
        modules = list(trainings_db.values()) if trainings_db else DEFAULT_MODULES
        if category:
            modules = [m for m in modules if m["category"] == category]
    
    # Filter by role
    if role:
        modules = [m for m in modules if m["role_required"] in ["all", role]]
    
    return {"modules": modules}

@router.get("/modules/{module_id}")
async def get_training_module(module_id: str):
    """Get a specific training module"""
    
    if trainings_collection is not None:
        module = await trainings_collection.find_one({"id": module_id})
    else:
        module = trainings_db.get(module_id) or next(
            (m for m in DEFAULT_MODULES if m["id"] == module_id), None
        )
    
    if not module:
        raise HTTPException(status_code=404, detail="Training module not found")
    
    return training_to_dict(module) if "_id" in module else module

# ==================== PROGRESS TRACKING ====================

@router.get("/progress/{user_id}")
async def get_user_progress(user_id: str, role: Optional[str] = None):
    """Get training progress for a user"""
    
    # Get all modules first
    if trainings_collection is not None:
        cursor = trainings_collection.find({"status": "active"}).sort("order", 1)
        modules = await cursor.to_list(length=100)
        modules = [training_to_dict(m) for m in modules]
        
        cursor = training_progress_collection.find({"user_id": user_id})
        progress_records = await cursor.to_list(length=100)
        progress_map = {p["module_id"]: progress_to_dict(p) for p in progress_records}
    else:
        modules = list(trainings_db.values()) if trainings_db else DEFAULT_MODULES
        progress_map = {p["module_id"]: p for p in progress_db.values() if p["user_id"] == user_id}
    
    # Filter by role
    if role:
        modules = [m for m in modules if m["role_required"] in ["all", role]]
    
    # Combine modules with progress
    result = []
    total_completed = 0
    total_modules = len(modules)
    total_time_spent = 0
    
    for module in modules:
        progress = progress_map.get(module["id"], {
            "status": "not_started",
            "progress_percent": 0,
            "started_at": None,
            "completed_at": None
        })
        
        if progress["status"] == "completed":
            total_completed += 1
            total_time_spent += module["duration_minutes"]
        elif progress["status"] == "in_progress":
            total_time_spent += int(module["duration_minutes"] * (progress.get("progress_percent", 0) / 100))
        
        result.append({
            **module,
            "progress": progress
        })
    
    return {
        "user_id": user_id,
        "modules": result,
        "summary": {
            "total_modules": total_modules,
            "completed": total_completed,
            "in_progress": len([m for m in result if m["progress"]["status"] == "in_progress"]),
            "not_started": len([m for m in result if m["progress"]["status"] == "not_started"]),
            "completion_percent": round((total_completed / total_modules) * 100) if total_modules > 0 else 0,
            "total_time_spent_minutes": total_time_spent
        }
    }

@router.post("/progress/{user_id}/{module_id}")
async def start_training(user_id: str, module_id: str):
    """Start a training module"""
    
    # Verify module exists
    if trainings_collection is not None:
        module = await trainings_collection.find_one({"id": module_id})
    else:
        module = trainings_db.get(module_id) or next(
            (m for m in DEFAULT_MODULES if m["id"] == module_id), None
        )
    
    if not module:
        raise HTTPException(status_code=404, detail="Training module not found")
    
    progress = {
        "user_id": user_id,
        "module_id": module_id,
        "status": "in_progress",
        "progress_percent": 0,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "completed_at": None,
        "quiz_score": None
    }
    
    if training_progress_collection is not None:
        await training_progress_collection.update_one(
            {"user_id": user_id, "module_id": module_id},
            {"$set": progress},
            upsert=True
        )
    else:
        progress_db[f"{user_id}_{module_id}"] = progress
    
    return {
        "message": "Training started",
        "progress": progress
    }

@router.patch("/progress/{user_id}/{module_id}")
async def update_progress(user_id: str, module_id: str, update: ProgressUpdate):
    """Update training progress"""
    
    if training_progress_collection is not None:
        existing = await training_progress_collection.find_one(
            {"user_id": user_id, "module_id": module_id}
        )
    else:
        existing = progress_db.get(f"{user_id}_{module_id}")
    
    if not existing:
        raise HTTPException(status_code=404, detail="Progress record not found. Start training first.")
    
    update_data = {}
    if update.status:
        update_data["status"] = update.status
        if update.status == "completed":
            update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
            update_data["progress_percent"] = 100
    if update.progress_percent is not None:
        update_data["progress_percent"] = update.progress_percent
    if update.quiz_score is not None:
        update_data["quiz_score"] = update.quiz_score
    
    if training_progress_collection is not None:
        await training_progress_collection.update_one(
            {"user_id": user_id, "module_id": module_id},
            {"$set": update_data}
        )
        result = await training_progress_collection.find_one(
            {"user_id": user_id, "module_id": module_id}
        )
        return progress_to_dict(result)
    else:
        existing.update(update_data)
        progress_db[f"{user_id}_{module_id}"] = existing
        return existing

# ==================== ANALYTICS ====================

@router.get("/analytics/team")
async def get_team_analytics():
    """Get team-wide training analytics"""
    
    if training_progress_collection is not None:
        pipeline = [
            {"$group": {
                "_id": "$status",
                "count": {"$sum": 1}
            }}
        ]
        status_counts = await training_progress_collection.aggregate(pipeline).to_list(length=10)
        
        # Get unique users
        users = await training_progress_collection.distinct("user_id")
        
        # Get completions by module
        completions = await training_progress_collection.aggregate([
            {"$match": {"status": "completed"}},
            {"$group": {"_id": "$module_id", "count": {"$sum": 1}}}
        ]).to_list(length=100)
    else:
        status_counts = []
        users = list(set(p["user_id"] for p in progress_db.values()))
        completions = []
    
    return {
        "total_users_training": len(users),
        "status_breakdown": {s["_id"]: s["count"] for s in status_counts},
        "completions_by_module": {c["_id"]: c["count"] for c in completions}
    }

# ==================== ADMIN ====================

@router.post("/seed-modules")
async def seed_training_modules():
    """Seed default training modules"""
    
    if trainings_collection is not None:
        for module in DEFAULT_MODULES:
            await trainings_collection.update_one(
                {"id": module["id"]},
                {"$set": module},
                upsert=True
            )
    else:
        for module in DEFAULT_MODULES:
            trainings_db[module["id"]] = module
    
    return {
        "message": "Training modules seeded",
        "count": len(DEFAULT_MODULES)
    }

@router.post("/modules")
async def create_training_module(module: TrainingModule):
    """Create a new training module"""
    
    module_data = module.dict()
    
    if trainings_collection is not None:
        existing = await trainings_collection.find_one({"id": module.id})
        if existing:
            raise HTTPException(status_code=400, detail="Module ID already exists")
        await trainings_collection.insert_one(module_data)
    else:
        if module.id in trainings_db:
            raise HTTPException(status_code=400, detail="Module ID already exists")
        trainings_db[module.id] = module_data
    
    return {"message": "Module created", "module": module_data}



# ==================== COMMENTS / Q&A ====================

class TrainingComment(BaseModel):
    id: str = ""
    module_id: str
    user_id: str
    user_name: str
    user_role: str
    content: str
    is_question: bool = False
    is_answer: bool = False
    parent_id: Optional[str] = None  # For replies
    is_moderator_answer: bool = False
    created_at: str = ""

# In-memory fallback for comments
comments_db = {}

@router.get("/comments/{module_id}")
async def get_module_comments(module_id: str):
    """Get all comments/Q&A for a training module"""
    
    if trainings_collection is not None:
        comments_collection = db["training_comments"]
        cursor = comments_collection.find({"module_id": module_id}).sort("created_at", -1)
        comments = await cursor.to_list(length=100)
        
        # Serialize
        for c in comments:
            if "_id" in c:
                del c["_id"]
        return comments
    else:
        return [c for c in comments_db.values() if c.get("module_id") == module_id]

@router.post("/comments")
async def create_comment(comment: TrainingComment):
    """Create a new comment or question"""
    
    comment_data = {
        "id": str(uuid.uuid4()),
        "module_id": comment.module_id,
        "user_id": comment.user_id,
        "user_name": comment.user_name,
        "user_role": comment.user_role,
        "content": comment.content,
        "is_question": comment.is_question,
        "is_answer": comment.is_answer,
        "parent_id": comment.parent_id,
        "is_moderator_answer": comment.is_moderator_answer,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    if trainings_collection is not None:
        comments_collection = db["training_comments"]
        await comments_collection.insert_one(comment_data)
        if "_id" in comment_data:
            del comment_data["_id"]
    else:
        comments_db[comment_data["id"]] = comment_data
    
    return {"message": "Comment created", "comment": comment_data}

@router.post("/comments/{comment_id}/reply")
async def reply_to_comment(comment_id: str, comment: TrainingComment):
    """Reply to a comment (for moderators answering questions)"""
    
    comment_data = {
        "id": str(uuid.uuid4()),
        "module_id": comment.module_id,
        "user_id": comment.user_id,
        "user_name": comment.user_name,
        "user_role": comment.user_role,
        "content": comment.content,
        "is_question": False,
        "is_answer": True,
        "parent_id": comment_id,
        "is_moderator_answer": comment.user_role in ["Administrator", "Manager", "Executive"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    if trainings_collection is not None:
        comments_collection = db["training_comments"]
        await comments_collection.insert_one(comment_data)
        del comment_data["_id"] if "_id" in comment_data else None
    else:
        comments_db[comment_data["id"]] = comment_data
    
    return {"message": "Reply created", "comment": comment_data}

@router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str):
    """Delete a comment (moderators only)"""
    
    if trainings_collection is not None:
        comments_collection = db["training_comments"]
        result = await comments_collection.delete_one({"id": comment_id})
        # Also delete replies
        await comments_collection.delete_many({"parent_id": comment_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Comment not found")
    else:
        if comment_id in comments_db:
            del comments_db[comment_id]
            # Delete replies
            for cid in list(comments_db.keys()):
                if comments_db[cid].get("parent_id") == comment_id:
                    del comments_db[cid]
        else:
            raise HTTPException(status_code=404, detail="Comment not found")
    
    return {"message": "Comment deleted"}
