"""
WebSocket Routes for Labyrinth OS
Real-time communication endpoints
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Optional, Dict, Any
import json
import logging

from websocket_manager import manager, emit_event, EventType

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws", tags=["websocket"])


@router.websocket("/connect")
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str = Query(...),
    role: Optional[str] = Query(None),
    name: Optional[str] = Query(None)
):
    """
    Main WebSocket connection endpoint
    
    Query params:
        user_id: Unique identifier for the user
        role: User's role (executive, coordinator, specialist, affiliate)
        name: Display name for the user
    """
    metadata = {
        "role": role,
        "name": name,
        "connected_at": None  # Will be set by manager
    }
    
    await manager.connect(websocket, user_id, metadata)
    
    # Notify others that user joined
    await emit_event(
        EventType.USER_JOINED,
        {"user_id": user_id, "name": name, "role": role},
        broadcast=True
    )
    
    try:
        while True:
            # Receive messages from client
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                await handle_client_message(websocket, user_id, message)
            except json.JSONDecodeError:
                await manager.send_personal_message({
                    "type": "error",
                    "message": "Invalid JSON format"
                }, user_id)
                
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
        
        # Notify others that user left
        await emit_event(
            EventType.USER_LEFT,
            {"user_id": user_id, "name": name},
            broadcast=True
        )


async def handle_client_message(websocket: WebSocket, user_id: str, message: Dict[str, Any]):
    """Handle incoming messages from WebSocket clients"""
    
    msg_type = message.get("type", "")
    data = message.get("data", {})
    
    if msg_type == "ping":
        # Heartbeat response
        await manager.send_personal_message({"type": "pong"}, user_id)
        
    elif msg_type == "join_room":
        # Join a room/channel
        room_id = data.get("room_id")
        if room_id:
            await manager.join_room(user_id, room_id)
            await manager.send_personal_message({
                "type": "room_joined",
                "room_id": room_id
            }, user_id)
            
    elif msg_type == "leave_room":
        # Leave a room/channel
        room_id = data.get("room_id")
        if room_id:
            await manager.leave_room(user_id, room_id)
            await manager.send_personal_message({
                "type": "room_left",
                "room_id": room_id
            }, user_id)
            
    elif msg_type == "typing_start":
        # User started typing
        room_id = data.get("room_id")
        if room_id:
            await emit_event(
                EventType.TYPING_START,
                {"user_id": user_id},
                room_id=room_id
            )
            
    elif msg_type == "typing_stop":
        # User stopped typing
        room_id = data.get("room_id")
        if room_id:
            await emit_event(
                EventType.TYPING_STOP,
                {"user_id": user_id},
                room_id=room_id
            )
            
    elif msg_type == "cursor_move":
        # Cursor position update for collaboration
        room_id = data.get("room_id")
        position = data.get("position")
        if room_id and position:
            await emit_event(
                EventType.CURSOR_MOVE,
                {"user_id": user_id, "position": position},
                room_id=room_id
            )
            
    elif msg_type == "presence_update":
        # Update presence status
        status = data.get("status", "online")  # online, away, busy, offline
        await emit_event(
            EventType.PRESENCE_UPDATE,
            {"user_id": user_id, "status": status},
            broadcast=True
        )
        
    elif msg_type == "send_message":
        # Send a chat message (to be stored and broadcasted)
        room_id = data.get("room_id")
        content = data.get("content")
        if room_id and content:
            await emit_event(
                EventType.MESSAGE_RECEIVED,
                {
                    "user_id": user_id,
                    "content": content,
                    "room_id": room_id
                },
                room_id=room_id
            )
            
    else:
        logger.warning(f"[WS] Unknown message type: {msg_type} from {user_id}")


@router.get("/status")
async def websocket_status():
    """Get WebSocket server status"""
    return {
        "status": "online",
        "total_connections": manager.total_connections,
        "connected_users": len(manager.connected_users),
        "active_rooms": len(manager.rooms)
    }


@router.get("/users")
async def get_connected_users():
    """Get list of connected users"""
    users = []
    for user_id in manager.connected_users:
        metadata = manager.user_metadata.get(user_id, {})
        users.append({
            "user_id": user_id,
            "name": metadata.get("name"),
            "role": metadata.get("role")
        })
    return {"users": users, "count": len(users)}


@router.get("/rooms")
async def get_active_rooms():
    """Get list of active rooms"""
    rooms = []
    for room_id, users in manager.rooms.items():
        rooms.append({
            "room_id": room_id,
            "user_count": len(users),
            "users": list(users)
        })
    return {"rooms": rooms, "count": len(rooms)}
