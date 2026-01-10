"""
Communication Models
Pydantic models for per-contract communication threads
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
from enum import Enum
import uuid


class MessageType(str, Enum):
    """Types of messages in a thread"""
    TEXT = "TEXT"
    FILE = "FILE"
    NOTE = "NOTE"
    SYSTEM = "SYSTEM"
    UPDATE = "UPDATE"


class ThreadType(str, Enum):
    """Types of communication threads"""
    CONTRACT = "CONTRACT"
    LEAD = "LEAD"
    SUPPORT = "SUPPORT"
    INTERNAL = "INTERNAL"
    CLIENT = "CLIENT"


class ThreadStatus(str, Enum):
    """Thread status"""
    OPEN = "OPEN"
    PENDING = "PENDING"
    RESOLVED = "RESOLVED"
    ARCHIVED = "ARCHIVED"


class ParticipantRole(str, Enum):
    """Participant roles in a thread"""
    OWNER = "OWNER"
    MEMBER = "MEMBER"
    CLIENT = "CLIENT"
    OBSERVER = "OBSERVER"


class Attachment(BaseModel):
    """File attachment"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    url: str
    size: int = 0  # bytes
    mime_type: str = "application/octet-stream"
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    uploaded_by: str


class Participant(BaseModel):
    """Thread participant"""
    user_id: str
    name: str
    email: Optional[str] = None
    role: ParticipantRole = ParticipantRole.MEMBER
    joined_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_read_at: Optional[datetime] = None


class MessageBase(BaseModel):
    """Base message model"""
    content: str
    message_type: MessageType = MessageType.TEXT


class Message(MessageBase):
    """Full message model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    thread_id: str
    sender_id: str
    sender_name: str
    attachments: List[Attachment] = []
    mentions: List[str] = []  # User IDs mentioned
    is_edited: bool = False
    is_pinned: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    edited_at: Optional[datetime] = None


class ThreadBase(BaseModel):
    """Base thread model"""
    title: str
    thread_type: ThreadType = ThreadType.CONTRACT
    related_id: Optional[str] = None  # Contract ID, Lead ID, etc.
    description: Optional[str] = None


class ThreadCreate(ThreadBase):
    """Model for creating a thread"""
    initial_participants: List[str] = []  # User IDs


class Thread(ThreadBase):
    """Full thread model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: ThreadStatus = ThreadStatus.OPEN
    participants: List[Participant] = []
    message_count: int = 0
    last_message_at: Optional[datetime] = None
    last_message_preview: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_pinned: bool = False
    tags: List[str] = []


class CommunicationStats(BaseModel):
    """Communication statistics"""
    total_threads: int = 0
    open_threads: int = 0
    threads_by_type: dict = {}
    total_messages: int = 0
    messages_today: int = 0
    active_participants: int = 0
