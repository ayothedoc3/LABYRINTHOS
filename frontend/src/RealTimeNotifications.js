import React, { useState, useEffect, useCallback } from 'react';
import { useWebSocket, useWebSocketEvent, EventType } from './WebSocketContext';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { Card, CardContent } from './components/ui/card';
import { ScrollArea } from './components/ui/scroll-area';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger
} from './components/ui/sheet';
import {
  Wifi, WifiOff, Users, Bell, MessageSquare, FileText, 
  AlertTriangle, CheckCircle, Clock, X, Zap
} from 'lucide-react';

// Real-time status indicator
export const ConnectionStatus = () => {
  const { isConnected, connectionState, connectedUsers } = useWebSocket();

  // Show simplified status
  const getStatusDisplay = () => {
    if (isConnected) {
      return { icon: Wifi, text: 'Live', className: 'bg-green-500/10 text-green-500' };
    }
    if (connectionState === 'RECONNECTING' || connectionState === 'CONNECTING') {
      return { icon: Wifi, text: 'Connecting...', className: 'bg-yellow-500/10 text-yellow-500' };
    }
    // When disconnected, we fallback to polling mode
    return { icon: Wifi, text: 'Polling', className: 'bg-blue-500/10 text-blue-500' };
  };

  const status = getStatusDisplay();
  const StatusIcon = status.icon;

  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${status.className}`}>
        <StatusIcon className="w-3 h-3" />
        <span>{status.text}</span>
      </div>
      {isConnected && connectedUsers.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="w-3 h-3" />
          <span>{connectedUsers.length} online</span>
        </div>
      )}
    </div>
  );
};

// Live notification toast
const NotificationToast = ({ notification, onDismiss }) => {
  const icons = {
    [EventType.CONTRACT_CREATED]: FileText,
    [EventType.CONTRACT_UPDATED]: FileText,
    [EventType.CONTRACT_STAGE_CHANGED]: Zap,
    [EventType.TASK_COMPLETED]: CheckCircle,
    [EventType.MESSAGE_RECEIVED]: MessageSquare,
    [EventType.ALERT_TRIGGERED]: AlertTriangle,
    [EventType.SLA_WARNING]: Clock,
    [EventType.SLA_BREACH]: AlertTriangle,
    [EventType.USER_JOINED]: Users,
    [EventType.USER_LEFT]: Users
  };

  const Icon = icons[notification.type] || Bell;

  const getTitle = () => {
    switch (notification.type) {
      case EventType.CONTRACT_CREATED:
        return 'New Contract Created';
      case EventType.CONTRACT_UPDATED:
        return 'Contract Updated';
      case EventType.CONTRACT_STAGE_CHANGED:
        return 'Contract Stage Changed';
      case EventType.TASK_COMPLETED:
        return 'Task Completed';
      case EventType.MESSAGE_RECEIVED:
        return 'New Message';
      case EventType.ALERT_TRIGGERED:
        return 'Alert';
      case EventType.SLA_WARNING:
        return 'SLA Warning';
      case EventType.SLA_BREACH:
        return 'SLA Breach';
      case EventType.USER_JOINED:
        return 'User Joined';
      case EventType.USER_LEFT:
        return 'User Left';
      default:
        return 'Notification';
    }
  };

  return (
    <div className="animate-in slide-in-from-right-5 bg-card border rounded-lg shadow-lg p-4 max-w-sm">
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-full ${
          notification.type.includes('breach') || notification.type.includes('alert')
            ? 'bg-red-500/10 text-red-500'
            : notification.type.includes('warning')
            ? 'bg-yellow-500/10 text-yellow-500'
            : 'bg-primary/10 text-primary'
        }`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{getTitle()}</p>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {notification.data?.message || notification.data?.title || JSON.stringify(notification.data).slice(0, 50)}
          </p>
        </div>
        <button 
          onClick={onDismiss}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// Real-time notifications panel
export const RealTimeNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const { isConnected, subscribe } = useWebSocket();

  // Subscribe to all relevant events
  useEffect(() => {
    const eventTypes = [
      EventType.CONTRACT_CREATED,
      EventType.CONTRACT_UPDATED,
      EventType.CONTRACT_STAGE_CHANGED,
      EventType.TASK_COMPLETED,
      EventType.MESSAGE_RECEIVED,
      EventType.ALERT_TRIGGERED,
      EventType.SLA_WARNING,
      EventType.SLA_BREACH,
      EventType.NOTIFICATION_NEW
    ];

    const unsubscribers = eventTypes.map(eventType => 
      subscribe(eventType, (data) => {
        const notification = {
          id: Date.now(),
          type: eventType,
          data,
          timestamp: new Date(),
          read: false
        };
        
        setNotifications(prev => [notification, ...prev].slice(0, 50)); // Keep last 50
        setUnreadCount(prev => prev + 1);
      })
    );

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [subscribe]);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="relative" data-testid="realtime-notifications-btn">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px]">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Live Notifications
            </span>
            <ConnectionStatus />
          </SheetTitle>
        </SheetHeader>
        
        <div className="mt-4 space-y-4">
          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={markAllRead} disabled={unreadCount === 0}>
              Mark all read
            </Button>
            <Button variant="outline" size="sm" onClick={clearAll} disabled={notifications.length === 0}>
              Clear all
            </Button>
          </div>
          
          {/* Notifications list */}
          <ScrollArea className="h-[calc(100vh-200px)]">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No notifications yet</p>
                <p className="text-xs mt-1">
                  {isConnected ? 'Waiting for updates...' : 'Connect to receive updates'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map(notification => (
                  <NotificationToast
                    key={notification.id}
                    notification={notification}
                    onDismiss={() => {
                      setNotifications(prev => prev.filter(n => n.id !== notification.id));
                      if (!notification.read) {
                        setUnreadCount(prev => Math.max(0, prev - 1));
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};

// Floating toast notifications
export const ToastNotifications = () => {
  const [toasts, setToasts] = useState([]);
  const { subscribe } = useWebSocket();

  useEffect(() => {
    // Subscribe to important real-time events
    const unsubscribe = subscribe('*', (message) => {
      // Filter for important notifications
      const importantTypes = [
        EventType.CONTRACT_STAGE_CHANGED,
        EventType.TASK_COMPLETED,
        EventType.MESSAGE_RECEIVED,
        EventType.ALERT_TRIGGERED,
        EventType.SLA_BREACH
      ];
      
      if (importantTypes.includes(message.type)) {
        const toast = {
          id: Date.now(),
          ...message
        };
        
        setToasts(prev => [...prev, toast]);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== toast.id));
        }, 5000);
      }
    });

    return unsubscribe;
  }, [subscribe]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <NotificationToast
          key={toast.id}
          notification={toast}
          onDismiss={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
        />
      ))}
    </div>
  );
};

// Online users indicator
export const OnlineUsers = () => {
  const { connectedUsers, isConnected } = useWebSocket();

  if (!isConnected || connectedUsers.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {connectedUsers.slice(0, 5).map((user, idx) => (
          <div
            key={user.user_id}
            className="w-8 h-8 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center text-xs font-medium"
            title={user.name || user.user_id}
          >
            {(user.name || user.user_id).charAt(0).toUpperCase()}
          </div>
        ))}
        {connectedUsers.length > 5 && (
          <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
            +{connectedUsers.length - 5}
          </div>
        )}
      </div>
      <span className="text-xs text-muted-foreground">
        {connectedUsers.length} online
      </span>
    </div>
  );
};

export default RealTimeNotifications;
