import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';

// WebSocket connection states
const WS_STATE = {
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  DISCONNECTED: 'DISCONNECTED',
  RECONNECTING: 'RECONNECTING'
};

// Event types (mirrors backend EventType)
export const EventType = {
  // Data updates
  CONTRACT_CREATED: 'contract.created',
  CONTRACT_UPDATED: 'contract.updated',
  CONTRACT_STAGE_CHANGED: 'contract.stage_changed',
  
  TASK_CREATED: 'task.created',
  TASK_UPDATED: 'task.updated',
  TASK_COMPLETED: 'task.completed',
  
  LEAD_CREATED: 'lead.created',
  LEAD_UPDATED: 'lead.updated',
  LEAD_STAGE_CHANGED: 'lead.stage_changed',
  
  MESSAGE_RECEIVED: 'message.received',
  MESSAGE_READ: 'message.read',
  
  // Notifications
  NOTIFICATION_NEW: 'notification.new',
  ALERT_TRIGGERED: 'alert.triggered',
  SLA_WARNING: 'sla.warning',
  SLA_BREACH: 'sla.breach',
  
  // System events
  USER_JOINED: 'user.joined',
  USER_LEFT: 'user.left',
  TYPING_START: 'typing.start',
  TYPING_STOP: 'typing.stop',
  
  // Collaboration
  CURSOR_MOVE: 'cursor.move',
  PRESENCE_UPDATE: 'presence.update'
};

// Create context
const WebSocketContext = createContext(null);

// Get WebSocket URL from environment
const getWebSocketUrl = () => {
  const backendUrl = process.env.REACT_APP_BACKEND_URL || '';
  // Convert HTTP(S) to WS(S)
  const wsUrl = backendUrl.replace(/^http/, 'ws');
  return `${wsUrl}/ws/connect`;
};

// Fallback polling interval (when WebSocket is unavailable)
const POLL_INTERVAL = 10000; // 10 seconds

export const WebSocketProvider = ({ children, userId, role, name }) => {
  const [connectionState, setConnectionState] = useState(WS_STATE.DISCONNECTED);
  const [lastMessage, setLastMessage] = useState(null);
  const [connectedUsers, setConnectedUsers] = useState([]);
  
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const eventListeners = useRef(new Map());
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000;

  // Subscribe to specific event types
  const subscribe = useCallback((eventType, callback) => {
    if (!eventListeners.current.has(eventType)) {
      eventListeners.current.set(eventType, new Set());
    }
    eventListeners.current.get(eventType).add(callback);
    
    // Return unsubscribe function
    return () => {
      const listeners = eventListeners.current.get(eventType);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }, []);

  // Emit event to listeners
  const emitToListeners = useCallback((eventType, data) => {
    const listeners = eventListeners.current.get(eventType);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('[WS] Error in event listener:', error);
        }
      });
    }
  }, []);

  // Send message through WebSocket
  const sendMessage = useCallback((type, data = {}) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, data }));
    } else {
      console.warn('[WS] Cannot send message - not connected');
    }
  }, []);

  // Join a room/channel
  const joinRoom = useCallback((roomId) => {
    sendMessage('join_room', { room_id: roomId });
  }, [sendMessage]);

  // Leave a room/channel
  const leaveRoom = useCallback((roomId) => {
    sendMessage('leave_room', { room_id: roomId });
  }, [sendMessage]);

  // Send typing indicator
  const sendTypingStart = useCallback((roomId) => {
    sendMessage('typing_start', { room_id: roomId });
  }, [sendMessage]);

  const sendTypingStop = useCallback((roomId) => {
    sendMessage('typing_stop', { room_id: roomId });
  }, [sendMessage]);

  // Update presence status
  const updatePresence = useCallback((status) => {
    sendMessage('presence_update', { status });
  }, [sendMessage]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!userId) {
      console.warn('[WS] Cannot connect without userId');
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[WS] Already connected');
      return;
    }

    setConnectionState(WS_STATE.CONNECTING);

    const wsUrl = new URL(getWebSocketUrl());
    wsUrl.searchParams.set('user_id', userId);
    if (role) wsUrl.searchParams.set('role', role);
    if (name) wsUrl.searchParams.set('name', name);

    console.log('[WS] Connecting to:', wsUrl.toString());

    const ws = new WebSocket(wsUrl.toString());

    ws.onopen = () => {
      console.log('[WS] Connected');
      setConnectionState(WS_STATE.CONNECTED);
      reconnectAttempts.current = 0;
      
      // Start heartbeat
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000); // Ping every 30 seconds

      ws.pingInterval = pingInterval;
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        setLastMessage(message);
        
        // Handle specific message types
        if (message.type === 'pong') {
          // Heartbeat response, ignore
          return;
        }
        
        if (message.type === EventType.USER_JOINED) {
          setConnectedUsers(prev => {
            const exists = prev.some(u => u.user_id === message.data.user_id);
            if (!exists) {
              return [...prev, message.data];
            }
            return prev;
          });
        }
        
        if (message.type === EventType.USER_LEFT) {
          setConnectedUsers(prev => 
            prev.filter(u => u.user_id !== message.data.user_id)
          );
        }
        
        // Emit to listeners
        emitToListeners(message.type, message.data);
        
        // Also emit to 'all' listeners
        emitToListeners('*', message);
        
      } catch (error) {
        console.error('[WS] Error parsing message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[WS] Error:', error);
    };

    ws.onclose = (event) => {
      console.log('[WS] Disconnected:', event.code, event.reason);
      setConnectionState(WS_STATE.DISCONNECTED);
      
      // Clear ping interval
      if (ws.pingInterval) {
        clearInterval(ws.pingInterval);
      }
      
      // Attempt to reconnect
      if (reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current++;
        setConnectionState(WS_STATE.RECONNECTING);
        console.log(`[WS] Reconnecting in ${reconnectDelay}ms (attempt ${reconnectAttempts.current})`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, reconnectDelay);
      }
    };

    wsRef.current = ws;
  }, [userId, role, name, emitToListeners]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      if (wsRef.current.pingInterval) {
        clearInterval(wsRef.current.pingInterval);
      }
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setConnectionState(WS_STATE.DISCONNECTED);
  }, []);

  // Connect when userId changes
  useEffect(() => {
    if (userId) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [userId, connect, disconnect]);

  // Context value
  const contextValue = {
    connectionState,
    isConnected: connectionState === WS_STATE.CONNECTED,
    lastMessage,
    connectedUsers,
    subscribe,
    sendMessage,
    joinRoom,
    leaveRoom,
    sendTypingStart,
    sendTypingStop,
    updatePresence,
    connect,
    disconnect
  };

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Custom hook to use WebSocket context
export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

// Custom hook for subscribing to specific events
export const useWebSocketEvent = (eventType, callback) => {
  const { subscribe } = useWebSocket();
  
  useEffect(() => {
    const unsubscribe = subscribe(eventType, callback);
    return unsubscribe;
  }, [eventType, callback, subscribe]);
};

export default WebSocketContext;
