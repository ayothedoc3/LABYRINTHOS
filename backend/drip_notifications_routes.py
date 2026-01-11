"""
Drip Notifications Routes
Automated role-based notification system
"""
from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from enum import Enum
import uuid
import os

router = APIRouter(prefix="/notifications", tags=["Drip Notifications"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME', 'labyrinth_db')

if mongo_url:
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    notifications_collection = db["notifications"]
    drip_rules_collection = db["drip_rules"]
    notification_prefs_collection = db["notification_preferences"]
else:
    notifications_collection = None
    drip_rules_collection = None
    notification_prefs_collection = None

# In-memory fallback
notifications_db = {}
drip_rules_db = {}
notification_prefs_db = {}

# ==================== ENUMS ====================

class NotificationType(str, Enum):
    INFO = "info"
    WARNING = "warning"
    SUCCESS = "success"
    ERROR = "error"
    REMINDER = "reminder"
    TASK = "task"
    SYSTEM = "system"

class NotificationChannel(str, Enum):
    IN_APP = "in_app"
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"

class TriggerType(str, Enum):
    TIME_BASED = "time_based"  # Run at specific times
    EVENT_BASED = "event_based"  # Triggered by events
    CONDITION_BASED = "condition_based"  # Based on conditions

class RuleStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    ARCHIVED = "archived"

# ==================== MODELS ====================

class NotificationCreate(BaseModel):
    user_id: str
    title: str
    message: str
    notification_type: NotificationType = NotificationType.INFO
    channel: NotificationChannel = NotificationChannel.IN_APP
    link: Optional[str] = None
    metadata: Optional[dict] = None

class DripRuleCreate(BaseModel):
    name: str
    description: str
    trigger_type: TriggerType
    target_roles: List[str]  # ["executive", "coordinator", "specialist", "all"]
    notification_template: dict  # title, message templates
    schedule: Optional[dict] = None  # For time-based: {"frequency": "daily", "time": "09:00"}
    conditions: Optional[dict] = None  # For condition-based rules
    event_trigger: Optional[str] = None  # For event-based: "task_overdue", "contract_signed"

class NotificationPreferences(BaseModel):
    user_id: str
    email_enabled: bool = True
    sms_enabled: bool = False
    push_enabled: bool = True
    in_app_enabled: bool = True
    quiet_hours: Optional[dict] = None  # {"start": "22:00", "end": "08:00"}
    digest_mode: bool = False  # Batch notifications

# ==================== HELPERS ====================

def notification_to_dict(notification: dict) -> dict:
    return {k: v for k, v in notification.items() if k != "_id"}

def rule_to_dict(rule: dict) -> dict:
    return {k: v for k, v in rule.items() if k != "_id"}

# ==================== NOTIFICATION ENDPOINTS ====================

@router.get("/")
async def list_notifications(
    user_id: Optional[str] = None,
    unread_only: bool = False,
    notification_type: Optional[NotificationType] = None,
    limit: int = 50
):
    """List notifications with optional filtering"""
    
    if notifications_collection is not None:
        query = {}
        if user_id:
            query["user_id"] = user_id
        if unread_only:
            query["read"] = False
        if notification_type:
            query["notification_type"] = notification_type.value
        cursor = notifications_collection.find(query, {"_id": 0}).sort("created_at", -1).limit(limit)
        notifications = await cursor.to_list(length=limit)
    else:
        notifications = list(notifications_db.values())
        if user_id:
            notifications = [n for n in notifications if n["user_id"] == user_id]
        if unread_only:
            notifications = [n for n in notifications if not n["read"]]
        if notification_type:
            notifications = [n for n in notifications if n["notification_type"] == notification_type.value]
        notifications = sorted(notifications, key=lambda x: x["created_at"], reverse=True)[:limit]
    
    unread_count = len([n for n in notifications if not n.get("read", False)])
    
    return {
        "notifications": notifications,
        "total": len(notifications),
        "unread_count": unread_count
    }

@router.post("/")
async def create_notification(notification: NotificationCreate):
    """Create a new notification"""
    
    notification_id = f"notif_{uuid.uuid4().hex[:8]}"
    
    notification_data = {
        "id": notification_id,
        **notification.dict(),
        "notification_type": notification.notification_type.value,
        "channel": notification.channel.value,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "read_at": None
    }
    
    if notifications_collection is not None:
        await notifications_collection.insert_one(notification_data)
    else:
        notifications_db[notification_id] = notification_data
    
    return {"message": "Notification created", "notification": notification_to_dict(notification_data)}

@router.patch("/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    """Mark a notification as read"""
    
    update_data = {
        "read": True,
        "read_at": datetime.now(timezone.utc).isoformat()
    }
    
    if notifications_collection is not None:
        result = await notifications_collection.update_one(
            {"id": notification_id},
            {"$set": update_data}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Notification not found")
    else:
        if notification_id not in notifications_db:
            raise HTTPException(status_code=404, detail="Notification not found")
        notifications_db[notification_id].update(update_data)
    
    return {"message": "Notification marked as read"}

@router.patch("/read-all")
async def mark_all_read(user_id: str):
    """Mark all notifications as read for a user"""
    
    update_data = {
        "read": True,
        "read_at": datetime.now(timezone.utc).isoformat()
    }
    
    if notifications_collection is not None:
        result = await notifications_collection.update_many(
            {"user_id": user_id, "read": False},
            {"$set": update_data}
        )
        count = result.modified_count
    else:
        count = 0
        for n in notifications_db.values():
            if n["user_id"] == user_id and not n["read"]:
                n.update(update_data)
                count += 1
    
    return {"message": f"Marked {count} notifications as read"}

@router.delete("/{notification_id}")
async def delete_notification(notification_id: str):
    """Delete a notification"""
    
    if notifications_collection is not None:
        result = await notifications_collection.delete_one({"id": notification_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Notification not found")
    else:
        if notification_id not in notifications_db:
            raise HTTPException(status_code=404, detail="Notification not found")
        del notifications_db[notification_id]
    
    return {"message": "Notification deleted"}

# ==================== DRIP RULES ENDPOINTS ====================

@router.get("/rules")
async def list_drip_rules(status: Optional[RuleStatus] = None):
    """List all drip notification rules"""
    
    if drip_rules_collection is not None:
        query = {}
        if status:
            query["status"] = status.value
        cursor = drip_rules_collection.find(query, {"_id": 0})
        rules = await cursor.to_list(length=100)
    else:
        rules = list(drip_rules_db.values())
        if status:
            rules = [r for r in rules if r["status"] == status.value]
    
    return {"rules": rules, "total": len(rules)}

@router.post("/rules")
async def create_drip_rule(rule: DripRuleCreate):
    """Create a new drip notification rule"""
    
    rule_id = f"rule_{uuid.uuid4().hex[:8]}"
    
    rule_data = {
        "id": rule_id,
        **rule.dict(),
        "trigger_type": rule.trigger_type.value,
        "status": RuleStatus.ACTIVE.value,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_triggered": None,
        "trigger_count": 0
    }
    
    if drip_rules_collection is not None:
        await drip_rules_collection.insert_one(rule_data)
    else:
        drip_rules_db[rule_id] = rule_data
    
    return {"message": "Drip rule created", "rule": rule_to_dict(rule_data)}

@router.get("/rules/{rule_id}")
async def get_drip_rule(rule_id: str):
    """Get drip rule details"""
    
    if drip_rules_collection is not None:
        rule = await drip_rules_collection.find_one({"id": rule_id}, {"_id": 0})
    else:
        rule = drip_rules_db.get(rule_id)
    
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    return rule

@router.patch("/rules/{rule_id}/status")
async def update_rule_status(rule_id: str, status: RuleStatus):
    """Update drip rule status (activate/pause/archive)"""
    
    if drip_rules_collection is not None:
        result = await drip_rules_collection.update_one(
            {"id": rule_id},
            {"$set": {"status": status.value}}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Rule not found")
    else:
        if rule_id not in drip_rules_db:
            raise HTTPException(status_code=404, detail="Rule not found")
        drip_rules_db[rule_id]["status"] = status.value
    
    return {"message": f"Rule status updated to {status.value}"}

@router.delete("/rules/{rule_id}")
async def delete_drip_rule(rule_id: str):
    """Delete a drip rule"""
    
    if drip_rules_collection is not None:
        result = await drip_rules_collection.delete_one({"id": rule_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Rule not found")
    else:
        if rule_id not in drip_rules_db:
            raise HTTPException(status_code=404, detail="Rule not found")
        del drip_rules_db[rule_id]
    
    return {"message": "Rule deleted"}

@router.post("/rules/{rule_id}/trigger")
async def trigger_rule_manually(rule_id: str, target_user_ids: List[str]):
    """Manually trigger a drip rule for specific users"""
    
    if drip_rules_collection is not None:
        rule = await drip_rules_collection.find_one({"id": rule_id}, {"_id": 0})
    else:
        rule = drip_rules_db.get(rule_id)
    
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    if rule["status"] != RuleStatus.ACTIVE.value:
        raise HTTPException(status_code=400, detail="Rule is not active")
    
    template = rule.get("notification_template", {})
    notifications_created = []
    
    for user_id in target_user_ids:
        notification_id = f"notif_{uuid.uuid4().hex[:8]}"
        notification_data = {
            "id": notification_id,
            "user_id": user_id,
            "title": template.get("title", "Notification"),
            "message": template.get("message", ""),
            "notification_type": NotificationType.REMINDER.value,
            "channel": NotificationChannel.IN_APP.value,
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "read_at": None,
            "rule_id": rule_id,
            "metadata": {"triggered_by": "manual"}
        }
        
        if notifications_collection is not None:
            await notifications_collection.insert_one(notification_data)
        else:
            notifications_db[notification_id] = notification_data
        
        notifications_created.append(notification_id)
    
    # Update rule trigger count
    if drip_rules_collection is not None:
        await drip_rules_collection.update_one(
            {"id": rule_id},
            {"$set": {"last_triggered": datetime.now(timezone.utc).isoformat()},
             "$inc": {"trigger_count": len(target_user_ids)}}
        )
    else:
        drip_rules_db[rule_id]["last_triggered"] = datetime.now(timezone.utc).isoformat()
        drip_rules_db[rule_id]["trigger_count"] += len(target_user_ids)
    
    return {
        "message": f"Rule triggered for {len(target_user_ids)} users",
        "notifications_created": notifications_created
    }

# ==================== PREFERENCES ENDPOINTS ====================

@router.get("/preferences/{user_id}")
async def get_notification_preferences(user_id: str):
    """Get notification preferences for a user"""
    
    if notification_prefs_collection is not None:
        prefs = await notification_prefs_collection.find_one({"user_id": user_id}, {"_id": 0})
    else:
        prefs = notification_prefs_db.get(user_id)
    
    if not prefs:
        # Return defaults
        prefs = {
            "user_id": user_id,
            "email_enabled": True,
            "sms_enabled": False,
            "push_enabled": True,
            "in_app_enabled": True,
            "quiet_hours": None,
            "digest_mode": False
        }
    
    return prefs

@router.put("/preferences/{user_id}")
async def update_notification_preferences(user_id: str, preferences: NotificationPreferences):
    """Update notification preferences for a user"""
    
    prefs_data = preferences.dict()
    
    if notification_prefs_collection is not None:
        await notification_prefs_collection.update_one(
            {"user_id": user_id},
            {"$set": prefs_data},
            upsert=True
        )
    else:
        notification_prefs_db[user_id] = prefs_data
    
    return {"message": "Preferences updated", "preferences": prefs_data}

# ==================== ANALYTICS ====================

@router.get("/analytics")
async def get_notification_analytics():
    """Get notification system analytics"""
    
    if notifications_collection is not None:
        total = await notifications_collection.count_documents({})
        unread = await notifications_collection.count_documents({"read": False})
        
        # By type
        pipeline = [{"$group": {"_id": "$notification_type", "count": {"$sum": 1}}}]
        by_type = await notifications_collection.aggregate(pipeline).to_list(10)
        
        # Active rules
        active_rules = await drip_rules_collection.count_documents({"status": RuleStatus.ACTIVE.value})
    else:
        total = len(notifications_db)
        unread = len([n for n in notifications_db.values() if not n["read"]])
        by_type = {}
        for n in notifications_db.values():
            t = n["notification_type"]
            by_type[t] = by_type.get(t, 0) + 1
        by_type = [{"_id": k, "count": v} for k, v in by_type.items()]
        active_rules = len([r for r in drip_rules_db.values() if r["status"] == RuleStatus.ACTIVE.value])
    
    return {
        "total_notifications": total,
        "unread_notifications": unread,
        "read_rate": round((total - unread) / total * 100, 1) if total > 0 else 0,
        "by_type": {item["_id"]: item["count"] for item in by_type},
        "active_drip_rules": active_rules
    }

# ==================== SEED DATA ====================

@router.post("/seed-demo")
async def seed_demo_data():
    """Seed demo notification data"""
    
    demo_notifications = [
        {
            "id": "notif_demo1",
            "user_id": "user_exec1",
            "title": "Contract Awarded",
            "message": "TechStart Inc contract has been awarded to Alpha Solutions team.",
            "notification_type": NotificationType.SUCCESS.value,
            "channel": NotificationChannel.IN_APP.value,
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "read_at": None
        },
        {
            "id": "notif_demo2",
            "user_id": "user_coord1",
            "title": "Task Overdue",
            "message": "Financial report task is 2 days overdue. Please follow up.",
            "notification_type": NotificationType.WARNING.value,
            "channel": NotificationChannel.IN_APP.value,
            "read": False,
            "created_at": (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat(),
            "read_at": None
        },
        {
            "id": "notif_demo3",
            "user_id": "user_spec1",
            "title": "New Training Available",
            "message": "A new compliance training module has been added. Complete by end of month.",
            "notification_type": NotificationType.INFO.value,
            "channel": NotificationChannel.IN_APP.value,
            "read": True,
            "created_at": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
            "read_at": (datetime.now(timezone.utc) - timedelta(hours=12)).isoformat()
        },
        {
            "id": "notif_demo4",
            "user_id": "user_exec1",
            "title": "Weekly Summary",
            "message": "Your team completed 15 tasks this week. 3 contracts in progress.",
            "notification_type": NotificationType.REMINDER.value,
            "channel": NotificationChannel.IN_APP.value,
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "read_at": None
        }
    ]
    
    demo_rules = [
        {
            "id": "rule_demo1",
            "name": "Daily Task Reminder",
            "description": "Send daily reminders for pending tasks",
            "trigger_type": TriggerType.TIME_BASED.value,
            "target_roles": ["coordinator", "specialist"],
            "notification_template": {
                "title": "Daily Task Reminder",
                "message": "You have pending tasks that need attention today."
            },
            "schedule": {"frequency": "daily", "time": "09:00"},
            "conditions": None,
            "event_trigger": None,
            "status": RuleStatus.ACTIVE.value,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_triggered": None,
            "trigger_count": 0
        },
        {
            "id": "rule_demo2",
            "name": "Contract Milestone Alert",
            "description": "Notify executives when contract milestones are reached",
            "trigger_type": TriggerType.EVENT_BASED.value,
            "target_roles": ["executive"],
            "notification_template": {
                "title": "Milestone Reached",
                "message": "A contract milestone has been completed."
            },
            "schedule": None,
            "conditions": None,
            "event_trigger": "milestone_completed",
            "status": RuleStatus.ACTIVE.value,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_triggered": None,
            "trigger_count": 0
        },
        {
            "id": "rule_demo3",
            "name": "Overdue Task Escalation",
            "description": "Escalate overdue tasks to coordinators",
            "trigger_type": TriggerType.CONDITION_BASED.value,
            "target_roles": ["coordinator"],
            "notification_template": {
                "title": "Overdue Task Alert",
                "message": "A task has been overdue for more than 48 hours."
            },
            "schedule": None,
            "conditions": {"task_overdue_hours": 48},
            "event_trigger": None,
            "status": RuleStatus.ACTIVE.value,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_triggered": None,
            "trigger_count": 0
        }
    ]
    
    if notifications_collection is not None:
        await notifications_collection.delete_many({})
        await drip_rules_collection.delete_many({})
        for notif in demo_notifications:
            await notifications_collection.insert_one(notif)
        for rule in demo_rules:
            await drip_rules_collection.insert_one(rule)
    else:
        notifications_db.clear()
        drip_rules_db.clear()
        for notif in demo_notifications:
            notifications_db[notif["id"]] = notif
        for rule in demo_rules:
            drip_rules_db[rule["id"]] = rule
    
    return {
        "message": "Demo data seeded",
        "notifications": len(demo_notifications),
        "rules": len(demo_rules)
    }
