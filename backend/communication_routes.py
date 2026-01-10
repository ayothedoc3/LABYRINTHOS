"""
Communication Routes
API endpoints for per-contract communication threads
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import uuid

from communication_models import (
    Thread, ThreadCreate, ThreadType, ThreadStatus,
    Message, MessageBase, MessageType,
    Participant, ParticipantRole, Attachment,
    CommunicationStats
)

router = APIRouter(prefix="/api/communications", tags=["Communications"])

# In-memory storage (would be MongoDB in production)
threads_db: dict[str, Thread] = {}
messages_db: dict[str, List[Message]] = {}  # thread_id -> messages


def seed_demo_threads():
    """Seed demo communication threads"""
    demo_threads = [
        Thread(
            id="thread-1",
            title="Acme Corp - Project Kickoff Discussion",
            thread_type=ThreadType.CONTRACT,
            related_id="contract-acme-1",
            description="Main communication thread for Acme Corp marketing automation project",
            status=ThreadStatus.OPEN,
            participants=[
                Participant(user_id="coordinator-1", name="John Coordinator", role=ParticipantRole.OWNER),
                Participant(user_id="client-acme", name="Sarah Johnson (Acme)", email="sarah@acme.com", role=ParticipantRole.CLIENT),
                Participant(user_id="specialist-1", name="Mike Specialist", role=ParticipantRole.MEMBER)
            ],
            message_count=5,
            last_message_at=datetime.now(timezone.utc) - timedelta(hours=2),
            last_message_preview="Looking forward to the next milestone review...",
            created_by="coordinator-1",
            is_pinned=True,
            tags=["high-priority", "Q1"]
        ),
        Thread(
            id="thread-2",
            title="TechStart Sales Funnel - Requirements",
            thread_type=ThreadType.LEAD,
            related_id="lead-2",
            description="Discussion about TechStart requirements before proposal",
            status=ThreadStatus.OPEN,
            participants=[
                Participant(user_id="coordinator-1", name="John Coordinator", role=ParticipantRole.OWNER),
                Participant(user_id="lead-techstart", name="Michael Chen (TechStart)", role=ParticipantRole.CLIENT)
            ],
            message_count=3,
            last_message_at=datetime.now(timezone.utc) - timedelta(hours=8),
            last_message_preview="Can we schedule a call to discuss the technical requirements?",
            created_by="coordinator-1",
            tags=["negotiation"]
        ),
        Thread(
            id="thread-3",
            title="Internal: Marketing Strategy Q1",
            thread_type=ThreadType.INTERNAL,
            description="Internal discussion about Q1 marketing strategies",
            status=ThreadStatus.OPEN,
            participants=[
                Participant(user_id="executive-1", name="Jane Executive", role=ParticipantRole.OWNER),
                Participant(user_id="coordinator-1", name="John Coordinator", role=ParticipantRole.MEMBER),
                Participant(user_id="specialist-marketing", name="Lisa Marketing", role=ParticipantRole.MEMBER)
            ],
            message_count=12,
            last_message_at=datetime.now(timezone.utc) - timedelta(days=1),
            last_message_preview="Let's finalize the budget allocation for paid ads...",
            created_by="executive-1",
            is_pinned=True,
            tags=["strategy", "marketing"]
        ),
        Thread(
            id="thread-4",
            title="Support: Invoice Query - GlobalTrade",
            thread_type=ThreadType.SUPPORT,
            related_id="contract-globaltrade-1",
            description="Client query about invoice payment terms",
            status=ThreadStatus.PENDING,
            participants=[
                Participant(user_id="coordinator-1", name="John Coordinator", role=ParticipantRole.OWNER),
                Participant(user_id="client-globaltrade", name="Robert (GlobalTrade)", role=ParticipantRole.CLIENT),
                Participant(user_id="finance-1", name="Amy Finance", role=ParticipantRole.MEMBER)
            ],
            message_count=4,
            last_message_at=datetime.now(timezone.utc) - timedelta(hours=24),
            last_message_preview="Waiting for finance team to confirm payment schedule",
            created_by="client-globaltrade",
            tags=["finance", "urgent"]
        ),
        Thread(
            id="thread-5",
            title="Archived: InnovateCo Onboarding Complete",
            thread_type=ThreadType.CONTRACT,
            related_id="contract-innovate-1",
            description="Completed onboarding thread",
            status=ThreadStatus.ARCHIVED,
            participants=[
                Participant(user_id="coordinator-1", name="John Coordinator", role=ParticipantRole.OWNER),
                Participant(user_id="client-innovate", name="InnovateCo Team", role=ParticipantRole.CLIENT)
            ],
            message_count=28,
            last_message_at=datetime.now(timezone.utc) - timedelta(days=14),
            last_message_preview="Great working with you! Looking forward to the next phase.",
            created_by="coordinator-1",
            tags=["completed"]
        )
    ]
    
    for thread in demo_threads:
        threads_db[thread.id] = thread
    
    # Create demo messages for first thread
    demo_messages = [
        Message(
            id="msg-1",
            thread_id="thread-1",
            sender_id="coordinator-1",
            sender_name="John Coordinator",
            content="Welcome to the Acme Corp project thread! Let's use this space to coordinate all project communications.",
            message_type=MessageType.SYSTEM,
            created_at=datetime.now(timezone.utc) - timedelta(days=7)
        ),
        Message(
            id="msg-2",
            thread_id="thread-1",
            sender_id="client-acme",
            sender_name="Sarah Johnson (Acme)",
            content="Thank you John! We're excited to get started. Here are our initial requirements document.",
            message_type=MessageType.TEXT,
            attachments=[
                Attachment(
                    name="Acme_Requirements_v1.pdf",
                    url="/files/acme-requirements.pdf",
                    size=245000,
                    mime_type="application/pdf",
                    uploaded_by="client-acme"
                )
            ],
            created_at=datetime.now(timezone.utc) - timedelta(days=6)
        ),
        Message(
            id="msg-3",
            thread_id="thread-1",
            sender_id="coordinator-1",
            sender_name="John Coordinator",
            content="Thanks Sarah! I've reviewed the requirements. @specialist-1 can you take a look at the technical specs?",
            message_type=MessageType.TEXT,
            mentions=["specialist-1"],
            created_at=datetime.now(timezone.utc) - timedelta(days=5)
        ),
        Message(
            id="msg-4",
            thread_id="thread-1",
            sender_id="specialist-1",
            sender_name="Mike Specialist",
            content="Will do! I'll have a technical assessment ready by end of week.",
            message_type=MessageType.TEXT,
            created_at=datetime.now(timezone.utc) - timedelta(days=4)
        ),
        Message(
            id="msg-5",
            thread_id="thread-1",
            sender_id="client-acme",
            sender_name="Sarah Johnson (Acme)",
            content="Looking forward to the next milestone review. Our team is ready to provide feedback on the initial designs.",
            message_type=MessageType.TEXT,
            created_at=datetime.now(timezone.utc) - timedelta(hours=2)
        )
    ]
    
    messages_db["thread-1"] = demo_messages


# ==================== THREAD ENDPOINTS ====================

@router.get("/threads", response_model=List[Thread])
async def get_threads(
    thread_type: Optional[ThreadType] = None,
    status: Optional[ThreadStatus] = None,
    related_id: Optional[str] = None,
    participant_id: Optional[str] = None,
    pinned_only: bool = False
):
    """Get all threads with optional filtering"""
    if not threads_db:
        seed_demo_threads()
    
    threads = list(threads_db.values())
    
    if thread_type:
        threads = [t for t in threads if t.thread_type == thread_type]
    if status:
        threads = [t for t in threads if t.status == status]
    if related_id:
        threads = [t for t in threads if t.related_id == related_id]
    if participant_id:
        threads = [t for t in threads if any(p.user_id == participant_id for p in t.participants)]
    if pinned_only:
        threads = [t for t in threads if t.is_pinned]
    
    return sorted(threads, key=lambda x: (x.is_pinned, x.last_message_at or x.created_at), reverse=True)


@router.get("/threads/{thread_id}", response_model=Thread)
async def get_thread(thread_id: str):
    """Get a specific thread"""
    if thread_id not in threads_db:
        raise HTTPException(status_code=404, detail="Thread not found")
    return threads_db[thread_id]


@router.post("/threads", response_model=Thread)
async def create_thread(thread_data: ThreadCreate, created_by: str = "system"):
    """Create a new thread"""
    thread = Thread(
        **thread_data.model_dump(exclude={"initial_participants"}),
        id=str(uuid.uuid4()),
        created_by=created_by,
        participants=[
            Participant(user_id=created_by, name=created_by, role=ParticipantRole.OWNER)
        ]
    )
    
    # Add initial participants
    for user_id in thread_data.initial_participants:
        if user_id != created_by:
            thread.participants.append(
                Participant(user_id=user_id, name=user_id, role=ParticipantRole.MEMBER)
            )
    
    threads_db[thread.id] = thread
    messages_db[thread.id] = []
    
    # Add system message
    system_msg = Message(
        thread_id=thread.id,
        sender_id="system",
        sender_name="System",
        content=f"Thread created: {thread.title}",
        message_type=MessageType.SYSTEM
    )
    messages_db[thread.id].append(system_msg)
    
    return thread


@router.put("/threads/{thread_id}/status")
async def update_thread_status(thread_id: str, status: ThreadStatus):
    """Update thread status"""
    if thread_id not in threads_db:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    thread = threads_db[thread_id]
    thread.status = status
    thread.updated_at = datetime.now(timezone.utc)
    threads_db[thread_id] = thread
    return thread


@router.put("/threads/{thread_id}/pin")
async def toggle_thread_pin(thread_id: str):
    """Toggle thread pin status"""
    if thread_id not in threads_db:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    thread = threads_db[thread_id]
    thread.is_pinned = not thread.is_pinned
    thread.updated_at = datetime.now(timezone.utc)
    threads_db[thread_id] = thread
    return thread


@router.post("/threads/{thread_id}/participants")
async def add_participant(
    thread_id: str,
    user_id: str,
    user_name: str,
    role: ParticipantRole = ParticipantRole.MEMBER
):
    """Add a participant to a thread"""
    if thread_id not in threads_db:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    thread = threads_db[thread_id]
    
    # Check if already a participant
    if any(p.user_id == user_id for p in thread.participants):
        raise HTTPException(status_code=400, detail="User is already a participant")
    
    thread.participants.append(
        Participant(user_id=user_id, name=user_name, role=role)
    )
    thread.updated_at = datetime.now(timezone.utc)
    threads_db[thread_id] = thread
    
    # Add system message
    if thread_id in messages_db:
        system_msg = Message(
            thread_id=thread_id,
            sender_id="system",
            sender_name="System",
            content=f"{user_name} joined the thread",
            message_type=MessageType.SYSTEM
        )
        messages_db[thread_id].append(system_msg)
    
    return thread


@router.delete("/threads/{thread_id}/participants/{user_id}")
async def remove_participant(thread_id: str, user_id: str):
    """Remove a participant from a thread"""
    if thread_id not in threads_db:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    thread = threads_db[thread_id]
    thread.participants = [p for p in thread.participants if p.user_id != user_id]
    thread.updated_at = datetime.now(timezone.utc)
    threads_db[thread_id] = thread
    return thread


# ==================== MESSAGE ENDPOINTS ====================

@router.get("/threads/{thread_id}/messages", response_model=List[Message])
async def get_messages(
    thread_id: str,
    limit: int = Query(50, le=100),
    before: Optional[str] = None
):
    """Get messages from a thread"""
    if thread_id not in threads_db:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    if thread_id not in messages_db:
        return []
    
    messages = messages_db[thread_id]
    
    if before:
        # Find index of the 'before' message and return messages before it
        idx = next((i for i, m in enumerate(messages) if m.id == before), len(messages))
        messages = messages[:idx]
    
    return messages[-limit:]  # Return last N messages


@router.post("/threads/{thread_id}/messages", response_model=Message)
async def send_message(
    thread_id: str,
    content: str,
    sender_id: str,
    sender_name: str,
    message_type: MessageType = MessageType.TEXT
):
    """Send a message to a thread"""
    if thread_id not in threads_db:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    thread = threads_db[thread_id]
    
    # Check if sender is a participant
    if not any(p.user_id == sender_id for p in thread.participants):
        raise HTTPException(status_code=403, detail="User is not a participant in this thread")
    
    message = Message(
        thread_id=thread_id,
        sender_id=sender_id,
        sender_name=sender_name,
        content=content,
        message_type=message_type
    )
    
    if thread_id not in messages_db:
        messages_db[thread_id] = []
    messages_db[thread_id].append(message)
    
    # Update thread
    thread.message_count += 1
    thread.last_message_at = message.created_at
    thread.last_message_preview = content[:100] + "..." if len(content) > 100 else content
    thread.updated_at = datetime.now(timezone.utc)
    threads_db[thread_id] = thread
    
    return message


@router.put("/messages/{message_id}")
async def edit_message(message_id: str, new_content: str):
    """Edit a message"""
    for thread_id, messages in messages_db.items():
        for msg in messages:
            if msg.id == message_id:
                msg.content = new_content
                msg.is_edited = True
                msg.edited_at = datetime.now(timezone.utc)
                return msg
    
    raise HTTPException(status_code=404, detail="Message not found")


@router.post("/messages/{message_id}/pin")
async def toggle_message_pin(message_id: str):
    """Toggle message pin status"""
    for thread_id, messages in messages_db.items():
        for msg in messages:
            if msg.id == message_id:
                msg.is_pinned = not msg.is_pinned
                return msg
    
    raise HTTPException(status_code=404, detail="Message not found")


# ==================== STATS ENDPOINTS ====================

@router.get("/stats", response_model=CommunicationStats)
async def get_communication_stats():
    """Get communication statistics"""
    if not threads_db:
        seed_demo_threads()
    
    threads = list(threads_db.values())
    
    # Threads by type
    type_counts = {}
    for thread_type in ThreadType:
        type_counts[thread_type.value] = len([t for t in threads if t.thread_type == thread_type])
    
    # Open threads
    open_count = len([t for t in threads if t.status == ThreadStatus.OPEN])
    
    # Total messages
    total_messages = sum(len(msgs) for msgs in messages_db.values())
    
    # Messages today
    today = datetime.now(timezone.utc).date()
    messages_today = sum(
        len([m for m in msgs if m.created_at.date() == today])
        for msgs in messages_db.values()
    )
    
    # Active participants
    all_participants = set()
    for thread in threads:
        for p in thread.participants:
            all_participants.add(p.user_id)
    
    return CommunicationStats(
        total_threads=len(threads),
        open_threads=open_count,
        threads_by_type=type_counts,
        total_messages=total_messages,
        messages_today=messages_today,
        active_participants=len(all_participants)
    )


@router.post("/seed-demo")
async def seed_demo_data():
    """Seed demo communication data"""
    threads_db.clear()
    messages_db.clear()
    seed_demo_threads()
    return {
        "message": f"Seeded {len(threads_db)} threads with messages"
    }
