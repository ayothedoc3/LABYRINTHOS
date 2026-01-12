"""
WebSocket Manager for Labyrinth OS
Handles real-time connections and broadcasts
"""
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List, Set, Optional, Any
from datetime import datetime, timezone
import json
import asyncio
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    """Manages WebSocket connections and broadcasts"""
    
    def __init__(self):
        # Active connections by user_id
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # Connections by room/channel (e.g., contract_123, chat_456)
        self.rooms: Dict[str, Set[str]] = {}
        # User metadata
        self.user_metadata: Dict[str, Dict] = {}
        
    async def connect(self, websocket: WebSocket, user_id: str, metadata: Optional[Dict] = None):
        """Accept a new WebSocket connection"""
        await websocket.accept()
        
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        
        if metadata:
            self.user_metadata[user_id] = metadata
            
        logger.info(f"[WS] User {user_id} connected. Total connections: {self.total_connections}")
        
        # Send connection confirmation
        await self.send_personal_message({
            "type": "connection",
            "status": "connected",
            "user_id": user_id,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }, user_id)
        
    def disconnect(self, websocket: WebSocket, user_id: str):
        """Remove a WebSocket connection"""
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                if user_id in self.user_metadata:
                    del self.user_metadata[user_id]
                    
        # Remove from all rooms
        for room_id, users in list(self.rooms.items()):
            if user_id in users:
                users.discard(user_id)
                if not users:
                    del self.rooms[room_id]
                    
        logger.info(f"[WS] User {user_id} disconnected. Total connections: {self.total_connections}")
        
    @property
    def total_connections(self) -> int:
        """Total number of active connections"""
        return sum(len(conns) for conns in self.active_connections.values())
    
    @property
    def connected_users(self) -> List[str]:
        """List of connected user IDs"""
        return list(self.active_connections.keys())
    
    async def join_room(self, user_id: str, room_id: str):
        """Add user to a room/channel"""
        if room_id not in self.rooms:
            self.rooms[room_id] = set()
        self.rooms[room_id].add(user_id)
        logger.info(f"[WS] User {user_id} joined room {room_id}")
        
    async def leave_room(self, user_id: str, room_id: str):
        """Remove user from a room/channel"""
        if room_id in self.rooms:
            self.rooms[room_id].discard(user_id)
            if not self.rooms[room_id]:
                del self.rooms[room_id]
        logger.info(f"[WS] User {user_id} left room {room_id}")
        
    async def send_personal_message(self, message: Dict[str, Any], user_id: str):
        """Send message to a specific user"""
        if user_id in self.active_connections:
            disconnected = []
            for websocket in self.active_connections[user_id]:
                try:
                    await websocket.send_json(message)
                except Exception as e:
                    logger.error(f"[WS] Error sending to {user_id}: {e}")
                    disconnected.append(websocket)
            
            # Clean up disconnected sockets
            for ws in disconnected:
                self.disconnect(ws, user_id)
                
    async def send_to_room(self, message: Dict[str, Any], room_id: str, exclude_user: Optional[str] = None):
        """Send message to all users in a room"""
        if room_id in self.rooms:
            for user_id in self.rooms[room_id]:
                if user_id != exclude_user:
                    await self.send_personal_message(message, user_id)
                    
    async def broadcast(self, message: Dict[str, Any], exclude_user: Optional[str] = None):
        """Broadcast message to all connected users"""
        for user_id in list(self.active_connections.keys()):
            if user_id != exclude_user:
                await self.send_personal_message(message, user_id)
                
    async def broadcast_to_role(self, message: Dict[str, Any], role: str):
        """Broadcast message to all users with a specific role"""
        for user_id, metadata in self.user_metadata.items():
            if metadata.get("role") == role:
                await self.send_personal_message(message, user_id)


# Global connection manager instance
manager = ConnectionManager()


# Event types for real-time updates
class EventType:
    # Data updates
    CONTRACT_CREATED = "contract.created"
    CONTRACT_UPDATED = "contract.updated"
    CONTRACT_STAGE_CHANGED = "contract.stage_changed"
    
    TASK_CREATED = "task.created"
    TASK_UPDATED = "task.updated"
    TASK_COMPLETED = "task.completed"
    
    LEAD_CREATED = "lead.created"
    LEAD_UPDATED = "lead.updated"
    LEAD_STAGE_CHANGED = "lead.stage_changed"
    
    MESSAGE_RECEIVED = "message.received"
    MESSAGE_READ = "message.read"
    
    # Notifications
    NOTIFICATION_NEW = "notification.new"
    ALERT_TRIGGERED = "alert.triggered"
    SLA_WARNING = "sla.warning"
    SLA_BREACH = "sla.breach"
    
    # System events
    USER_JOINED = "user.joined"
    USER_LEFT = "user.left"
    TYPING_START = "typing.start"
    TYPING_STOP = "typing.stop"
    
    # Collaboration
    CURSOR_MOVE = "cursor.move"
    PRESENCE_UPDATE = "presence.update"


async def emit_event(
    event_type: str,
    data: Dict[str, Any],
    user_id: Optional[str] = None,
    room_id: Optional[str] = None,
    broadcast: bool = False,
    role: Optional[str] = None
):
    """
    Emit a real-time event to connected clients
    
    Args:
        event_type: Type of event (from EventType)
        data: Event payload
        user_id: Send to specific user
        room_id: Send to all users in room
        broadcast: Send to all connected users
        role: Send to all users with specific role
    """
    message = {
        "type": event_type,
        "data": data,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    
    if user_id:
        await manager.send_personal_message(message, user_id)
    elif room_id:
        await manager.send_to_room(message, room_id)
    elif role:
        await manager.broadcast_to_role(message, role)
    elif broadcast:
        await manager.broadcast(message)
    else:
        logger.warning(f"[WS] Event {event_type} not sent - no target specified")
