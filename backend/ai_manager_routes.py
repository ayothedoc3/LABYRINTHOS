"""
AI Manager Routes - Intelligent task tracking, reminders, and performance analysis
Features:
- Task tracking with tagging system
- Automated reminders for meetings, deadlines, requests
- KPI/performance feedback
- Client report analysis
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from bson import ObjectId
from enum import Enum
import os
import motor.motor_asyncio
import re

router = APIRouter(prefix="/ai-manager", tags=["AI Manager"])

# MongoDB connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "labyrinth")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# ==================== ENUMS ====================

class TaskTag(str, Enum):
    MEETING = "meeting"
    DATA_REQUEST = "data_request"
    DOCUMENT_REQUEST = "document_request"
    TIMELINE_UPDATE = "timeline_update"
    DELIVERABLE_REVISION = "deliverable_revision"
    SOP_CHANGE = "sop_change"
    MEETING_CHANGE = "meeting_change"
    CLIENT_SUGGESTION = "client_suggestion"
    DEADLINE = "deadline"
    FOLLOW_UP = "follow_up"
    URGENT = "urgent"
    BLOCKED = "blocked"

class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    AWAITING_RESPONSE = "awaiting_response"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class ReminderType(str, Enum):
    TASK_DUE = "task_due"
    MEETING = "meeting"
    DEADLINE = "deadline"
    FOLLOW_UP = "follow_up"
    KPI_ALERT = "kpi_alert"

# ==================== MODELS ====================

class AITask(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()))
    title: str
    description: str
    tags: List[TaskTag] = []
    priority: TaskPriority = TaskPriority.MEDIUM
    status: TaskStatus = TaskStatus.PENDING
    assigned_to: str  # User ID
    assigned_to_name: str
    created_by: str = "AI Manager"
    related_contract_id: Optional[str] = None
    related_client_id: Optional[str] = None
    due_date: Optional[str] = None
    reminder_sent: bool = False
    notes: List[str] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class AIMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()))
    content: str
    from_ai: bool = True
    to_user_id: str
    to_user_name: str
    read: bool = False
    task_id: Optional[str] = None
    tags: List[TaskTag] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class Reminder(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()))
    type: ReminderType
    title: str
    description: str
    user_id: str
    user_name: str
    due_datetime: str
    sent: bool = False
    task_id: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class PerformanceFeedback(BaseModel):
    id: str = Field(default_factory=lambda: str(ObjectId()))
    user_id: str
    user_name: str
    period: str  # e.g., "2026-W02"
    kpi_summary: Dict[str, Any]
    strengths: List[str]
    areas_for_improvement: List[str]
    recommendations: List[str]
    overall_score: float
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

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

def auto_tag_content(content: str) -> List[TaskTag]:
    """Automatically detect tags from content text"""
    content_lower = content.lower()
    tags = []
    
    # Tag detection patterns
    patterns = {
        TaskTag.MEETING: r'\b(meeting|call|sync|standup|huddle|conference)\b',
        TaskTag.DATA_REQUEST: r'\b(data|report|analytics|metrics|numbers|stats)\b',
        TaskTag.DOCUMENT_REQUEST: r'\b(document|file|pdf|attachment|send|share)\b',
        TaskTag.TIMELINE_UPDATE: r'\b(timeline|schedule|deadline|due|eta|delivery)\b',
        TaskTag.DELIVERABLE_REVISION: r'\b(revision|update|change|modify|edit|feedback)\b',
        TaskTag.SOP_CHANGE: r'\b(sop|procedure|process|workflow|guideline)\b',
        TaskTag.MEETING_CHANGE: r'\b(reschedule|postpone|cancel|move meeting)\b',
        TaskTag.CLIENT_SUGGESTION: r'\b(client|customer|suggest|request|prefer)\b',
        TaskTag.DEADLINE: r'\b(deadline|urgent|asap|immediately|critical)\b',
        TaskTag.FOLLOW_UP: r'\b(follow up|check in|reminder|ping|nudge)\b',
    }
    
    for tag, pattern in patterns.items():
        if re.search(pattern, content_lower):
            tags.append(tag)
    
    # Add urgent tag for priority keywords
    if re.search(r'\b(urgent|asap|critical|emergency|immediately)\b', content_lower):
        tags.append(TaskTag.URGENT)
    
    return list(set(tags))

# ==================== TASK ENDPOINTS ====================

class TaskCreate(BaseModel):
    title: str
    description: str
    assigned_to: str
    assigned_to_name: str
    tags: Optional[List[str]] = None
    priority: Optional[str] = "medium"
    due_date: Optional[str] = None
    related_contract_id: Optional[str] = None
    related_client_id: Optional[str] = None

@router.post("/tasks")
async def create_task(task: TaskCreate):
    """Create a new AI-managed task with auto-tagging"""
    # Auto-detect tags from content
    detected_tags = auto_tag_content(f"{task.title} {task.description}")
    manual_tags = [TaskTag(t) for t in (task.tags or []) if t in [e.value for e in TaskTag]]
    all_tags = list(set(detected_tags + manual_tags))
    
    doc = {
        "title": task.title,
        "description": task.description,
        "tags": [t.value for t in all_tags],
        "priority": task.priority,
        "status": TaskStatus.PENDING.value,
        "assigned_to": task.assigned_to,
        "assigned_to_name": task.assigned_to_name,
        "created_by": "AI Manager",
        "related_contract_id": task.related_contract_id,
        "related_client_id": task.related_client_id,
        "due_date": task.due_date,
        "reminder_sent": False,
        "notes": [],
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
    }
    
    result = await db.ai_tasks.insert_one(doc)
    
    # Create AI message for the assigned user
    message_doc = {
        "content": f"🤖 New task assigned: {task.title}\n\n{task.description}\n\nPriority: {task.priority.upper()}\nDue: {task.due_date or 'Not specified'}",
        "from_ai": True,
        "to_user_id": task.assigned_to,
        "to_user_name": task.assigned_to_name,
        "read": False,
        "task_id": str(result.inserted_id),
        "tags": [t.value for t in all_tags],
        "created_at": datetime.now(timezone.utc)
    }
    await db.ai_messages.insert_one(message_doc)
    
    return {"id": str(result.inserted_id), "tags_detected": [t.value for t in all_tags]}

@router.get("/tasks")
async def get_tasks(
    user_id: Optional[str] = None,
    status: Optional[str] = None,
    tag: Optional[str] = None,
    priority: Optional[str] = None
):
    """Get tasks with optional filters"""
    query = {}
    if user_id:
        query["assigned_to"] = user_id
    if status:
        query["status"] = status
    if tag:
        query["tags"] = tag
    if priority:
        query["priority"] = priority
    
    cursor = db.ai_tasks.find(query).sort("created_at", -1)
    tasks = await cursor.to_list(length=100)
    return serialize_doc(tasks)

@router.patch("/tasks/{task_id}/status")
async def update_task_status(task_id: str, status: str, note: Optional[str] = None):
    """Update task status"""
    update = {
        "status": status,
        "updated_at": datetime.now(timezone.utc)
    }
    
    if note:
        await db.ai_tasks.update_one(
            {"_id": ObjectId(task_id)},
            {"$push": {"notes": f"[{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}] {note}"}}
        )
    
    result = await db.ai_tasks.update_one({"_id": ObjectId(task_id)}, {"$set": update})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task updated"}

# ==================== MESSAGE ENDPOINTS ====================

@router.get("/messages/{user_id}")
async def get_user_messages(user_id: str, unread_only: bool = False):
    """Get AI messages for a user"""
    query = {"to_user_id": user_id}
    if unread_only:
        query["read"] = False
    
    cursor = db.ai_messages.find(query).sort("created_at", -1)
    messages = await cursor.to_list(length=50)
    return serialize_doc(messages)

@router.patch("/messages/{message_id}/read")
async def mark_message_read(message_id: str):
    """Mark a message as read"""
    await db.ai_messages.update_one(
        {"_id": ObjectId(message_id)},
        {"$set": {"read": True}}
    )
    return {"message": "Marked as read"}

class SendAIMessage(BaseModel):
    content: str
    to_user_id: str
    to_user_name: str
    task_id: Optional[str] = None

@router.post("/messages/send")
async def send_ai_message(msg: SendAIMessage):
    """Send an AI message to a user"""
    tags = auto_tag_content(msg.content)
    
    doc = {
        "content": msg.content,
        "from_ai": True,
        "to_user_id": msg.to_user_id,
        "to_user_name": msg.to_user_name,
        "read": False,
        "task_id": msg.task_id,
        "tags": [t.value for t in tags],
        "created_at": datetime.now(timezone.utc)
    }
    
    result = await db.ai_messages.insert_one(doc)
    return {"id": str(result.inserted_id)}

# ==================== REMINDER ENDPOINTS ====================

@router.get("/reminders/{user_id}")
async def get_user_reminders(user_id: str, upcoming_only: bool = True):
    """Get reminders for a user"""
    query = {"user_id": user_id}
    if upcoming_only:
        query["sent"] = False
    
    cursor = db.ai_reminders.find(query).sort("due_datetime", 1)
    reminders = await cursor.to_list(length=50)
    return serialize_doc(reminders)

class CreateReminder(BaseModel):
    type: str
    title: str
    description: str
    user_id: str
    user_name: str
    due_datetime: str
    task_id: Optional[str] = None

@router.post("/reminders")
async def create_reminder(reminder: CreateReminder):
    """Create a new reminder"""
    doc = {
        "type": reminder.type,
        "title": reminder.title,
        "description": reminder.description,
        "user_id": reminder.user_id,
        "user_name": reminder.user_name,
        "due_datetime": reminder.due_datetime,
        "sent": False,
        "task_id": reminder.task_id,
        "created_at": datetime.now(timezone.utc)
    }
    
    result = await db.ai_reminders.insert_one(doc)
    return {"id": str(result.inserted_id)}

# ==================== PERFORMANCE FEEDBACK ====================

@router.get("/performance/{user_id}")
async def get_performance_feedback(user_id: str):
    """Get latest performance feedback for a user"""
    feedback = await db.ai_performance_feedback.find_one(
        {"user_id": user_id},
        sort=[("created_at", -1)]
    )
    return serialize_doc(feedback) if feedback else None

@router.post("/performance/generate/{user_id}")
async def generate_performance_feedback(user_id: str, user_name: str):
    """Generate AI performance feedback based on KPIs and task completion"""
    
    # Get completed tasks
    completed_tasks = await db.ai_tasks.count_documents({
        "assigned_to": user_id,
        "status": "completed"
    })
    
    pending_tasks = await db.ai_tasks.count_documents({
        "assigned_to": user_id,
        "status": {"$in": ["pending", "in_progress"]}
    })
    
    # Calculate basic metrics
    total_tasks = completed_tasks + pending_tasks
    completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
    
    # Generate feedback (in real implementation, this would use AI)
    strengths = []
    improvements = []
    recommendations = []
    
    if completion_rate >= 80:
        strengths.append("Excellent task completion rate")
        strengths.append("Consistent delivery on assignments")
    elif completion_rate >= 60:
        strengths.append("Good progress on assigned tasks")
        improvements.append("Focus on completing pending tasks before taking new ones")
    else:
        improvements.append("Task completion rate needs attention")
        recommendations.append("Consider breaking large tasks into smaller milestones")
    
    if completed_tasks >= 10:
        strengths.append("High volume task handler")
    
    recommendations.append("Review task priorities at the start of each day")
    recommendations.append("Use the tagging system to organize work effectively")
    
    overall_score = min(100, completion_rate + (completed_tasks * 2))
    
    feedback = {
        "user_id": user_id,
        "user_name": user_name,
        "period": datetime.now(timezone.utc).strftime("%Y-W%W"),
        "kpi_summary": {
            "tasks_completed": completed_tasks,
            "tasks_pending": pending_tasks,
            "completion_rate": round(completion_rate, 1)
        },
        "strengths": strengths,
        "areas_for_improvement": improvements,
        "recommendations": recommendations,
        "overall_score": round(overall_score, 1),
        "created_at": datetime.now(timezone.utc)
    }
    
    result = await db.ai_performance_feedback.insert_one(feedback)
    
    # Send feedback message
    message_content = f"""📊 **Weekly Performance Summary**

**Overall Score:** {overall_score:.0f}/100

**KPI Summary:**
- Tasks Completed: {completed_tasks}
- Tasks Pending: {pending_tasks}
- Completion Rate: {completion_rate:.1f}%

**Strengths:**
{chr(10).join(['• ' + s for s in strengths]) or '• Keep working on your tasks'}

**Areas for Improvement:**
{chr(10).join(['• ' + i for i in improvements]) or '• Maintain current performance'}

**Recommendations:**
{chr(10).join(['• ' + r for r in recommendations])}

Keep up the great work! 🎯"""
    
    await db.ai_messages.insert_one({
        "content": message_content,
        "from_ai": True,
        "to_user_id": user_id,
        "to_user_name": user_name,
        "read": False,
        "tags": ["performance_review"],
        "created_at": datetime.now(timezone.utc)
    })
    
    return serialize_doc(feedback)

# ==================== DASHBOARD SUMMARY ====================

@router.get("/dashboard/{user_id}")
async def get_ai_dashboard(user_id: str):
    """Get AI Manager dashboard summary for a user"""
    
    # Unread messages count
    unread_count = await db.ai_messages.count_documents({
        "to_user_id": user_id,
        "read": False
    })
    
    # Pending tasks
    pending_tasks = await db.ai_tasks.count_documents({
        "assigned_to": user_id,
        "status": {"$in": ["pending", "in_progress", "awaiting_response"]}
    })
    
    # Upcoming reminders (next 7 days)
    week_from_now = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    upcoming_reminders = await db.ai_reminders.count_documents({
        "user_id": user_id,
        "sent": False,
        "due_datetime": {"$lte": week_from_now}
    })
    
    # Recent messages
    messages_cursor = db.ai_messages.find({"to_user_id": user_id}).sort("created_at", -1).limit(5)
    recent_messages = await messages_cursor.to_list(length=5)
    
    # Urgent tasks
    urgent_cursor = db.ai_tasks.find({
        "assigned_to": user_id,
        "priority": {"$in": ["high", "urgent"]},
        "status": {"$nin": ["completed", "cancelled"]}
    }).sort("created_at", -1).limit(5)
    urgent_tasks = await urgent_cursor.to_list(length=5)
    
    return {
        "unread_messages": unread_count,
        "pending_tasks": pending_tasks,
        "upcoming_reminders": upcoming_reminders,
        "recent_messages": serialize_doc(recent_messages),
        "urgent_tasks": serialize_doc(urgent_tasks)
    }

# ==================== SEED DEMO DATA ====================

@router.post("/seed-demo")
async def seed_demo_data():
    """Seed demo AI Manager data"""
    
    demo_users = [
        {"id": "user1", "name": "Sarah Johnson"},
        {"id": "user2", "name": "Mike Chen"},
        {"id": "user3", "name": "Alex Kim"},
    ]
    
    demo_tasks = [
        {
            "title": "Review Frylow campaign metrics",
            "description": "Client requested updated metrics report for Q1 campaign performance. Please compile data from analytics dashboard and prepare summary.",
            "assigned_to": "user1",
            "assigned_to_name": "Sarah Johnson",
            "priority": "high",
            "due_date": (datetime.now(timezone.utc) + timedelta(days=2)).strftime("%Y-%m-%d"),
            "related_client_id": "frylow"
        },
        {
            "title": "Schedule TechStart kickoff meeting",
            "description": "New project starting next week. Coordinate with client and internal team for kickoff meeting. Send calendar invites.",
            "assigned_to": "user2",
            "assigned_to_name": "Mike Chen",
            "priority": "medium",
            "due_date": (datetime.now(timezone.utc) + timedelta(days=5)).strftime("%Y-%m-%d"),
        },
        {
            "title": "Update SOPs for deliverable approval process",
            "description": "Based on client feedback, we need to streamline the approval workflow. Review current SOP and propose changes.",
            "assigned_to": "user3",
            "assigned_to_name": "Alex Kim",
            "priority": "medium",
            "due_date": (datetime.now(timezone.utc) + timedelta(days=7)).strftime("%Y-%m-%d"),
        },
        {
            "title": "URGENT: Client document request",
            "description": "Acme Corp needs the signed contract copy ASAP for their records. Retrieve from archives and send securely.",
            "assigned_to": "user1",
            "assigned_to_name": "Sarah Johnson",
            "priority": "urgent",
            "due_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        },
    ]
    
    created_count = 0
    for task in demo_tasks:
        existing = await db.ai_tasks.find_one({"title": task["title"]})
        if not existing:
            task_create = TaskCreate(**task)
            await create_task(task_create)
            created_count += 1
    
    return {"message": f"Seeded {created_count} demo tasks"}
