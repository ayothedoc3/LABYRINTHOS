import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent
} from './components/ui/card';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Input } from './components/ui/input';
import { Separator } from './components/ui/separator';
import { ScrollArea } from './components/ui/scroll-area';
import { Avatar, AvatarFallback } from './components/ui/avatar';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from './components/ui/dialog';
import { Label } from './components/ui/label';
import { Textarea } from './components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from './components/ui/select';
import {
  MessageSquare, FileText, Users, Pin, Send, Plus, RefreshCw,
  Archive, Clock, CheckCircle, AlertCircle, Paperclip, Hash
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL || '';

// Thread type configuration
const THREAD_TYPE_CONFIG = {
  CONTRACT: { label: 'Contract', color: '#8B5CF6', icon: FileText },
  LEAD: { label: 'Lead', color: '#F59E0B', icon: Users },
  SUPPORT: { label: 'Support', color: '#EF4444', icon: AlertCircle },
  INTERNAL: { label: 'Internal', color: '#3B82F6', icon: Hash },
  CLIENT: { label: 'Client', color: '#22C55E', icon: MessageSquare }
};

const STATUS_CONFIG = {
  OPEN: { label: 'Open', color: '#22C55E' },
  PENDING: { label: 'Pending', color: '#F59E0B' },
  RESOLVED: { label: 'Resolved', color: '#3B82F6' },
  ARCHIVED: { label: 'Archived', color: '#64748B' }
};

// ==================== THREAD LIST ITEM ====================

const ThreadListItem = ({ thread, isSelected, onSelect }) => {
  const typeConfig = THREAD_TYPE_CONFIG[thread.thread_type] || THREAD_TYPE_CONFIG.CONTRACT;
  const TypeIcon = typeConfig.icon;
  const statusConfig = STATUS_CONFIG[thread.status] || STATUS_CONFIG.OPEN;
  
  return (
    <div 
      className={`p-3 rounded-lg cursor-pointer transition-all hover:bg-muted/50 ${
        isSelected ? 'bg-muted border-l-4' : ''
      }`}
      style={{ borderLeftColor: isSelected ? typeConfig.color : 'transparent' }}
      onClick={() => onSelect(thread)}
      data-testid={`thread-item-${thread.id}`}
    >
      <div className="flex items-start gap-3">
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${typeConfig.color}12` }}
        >
          <TypeIcon className="w-4 h-4" style={{ color: typeConfig.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {thread.is_pinned && <Pin className="w-3 h-3 text-muted-foreground" />}
            <span className="font-medium text-sm truncate">{thread.title}</span>
          </div>
          <p className="text-caption truncate mt-0.5">{thread.last_message_preview || 'No messages yet'}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge 
              variant="outline" 
              className="text-xs h-5"
              style={{ borderColor: `${statusConfig.color}40`, color: statusConfig.color }}
            >
              {statusConfig.label}
            </Badge>
            <span className="text-micro flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {thread.message_count}
            </span>
            {thread.last_message_at && (
              <span className="text-micro">
                {new Date(thread.last_message_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== MESSAGE BUBBLE ====================

const MessageBubble = ({ message, isOwn }) => {
  const isSystem = message.message_type === 'SYSTEM';
  
  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <span className="text-micro bg-muted px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }
  
  return (
    <div className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarFallback className="text-xs">
          {message.sender_name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
        </AvatarFallback>
      </Avatar>
      <div className={`max-w-[70%] ${isOwn ? 'text-right' : ''}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-micro font-medium">{message.sender_name}</span>
          <span className="text-micro text-muted-foreground">
            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {message.is_edited && <span className="text-micro text-muted-foreground">(edited)</span>}
        </div>
        <div 
          className={`rounded-lg px-3 py-2 ${
            isOwn 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
        {message.attachments?.length > 0 && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {message.attachments.map((att, i) => (
              <Badge key={i} variant="outline" className="text-xs gap-1">
                <Paperclip className="w-3 h-3" />
                {att.name}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== THREAD DETAIL ====================

const ThreadDetail = ({ thread, onClose, onRefresh }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  
  const typeConfig = THREAD_TYPE_CONFIG[thread?.thread_type] || THREAD_TYPE_CONFIG.CONTRACT;
  const TypeIcon = typeConfig.icon;

  useEffect(() => {
    if (thread) {
      loadMessages();
    }
  }, [thread]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/communications/threads/${thread.id}/messages`);
      setMessages(res.data);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
    setLoading(false);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    setSending(true);
    try {
      await axios.post(
        `${API}/api/communications/threads/${thread.id}/messages?content=${encodeURIComponent(newMessage)}&sender_id=current_user&sender_name=You`
      );
      setNewMessage('');
      loadMessages();
      onRefresh();
    } catch (error) {
      console.error('Error sending message:', error);
      alert(error.response?.data?.detail || 'Failed to send message');
    }
    setSending(false);
  };

  const handleTogglePin = async () => {
    try {
      await axios.put(`${API}/api/communications/threads/${thread.id}/pin`);
      onRefresh();
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  if (!thread) return null;

  return (
    <div className="flex flex-col h-full" data-testid="thread-detail">
      {/* Header */}
      <div className="flex items-start justify-between pb-4 border-b">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${typeConfig.color}12` }}
          >
            <TypeIcon className="w-5 h-5" style={{ color: typeConfig.color }} />
          </div>
          <div>
            <h2 className="text-subheading flex items-center gap-2">
              {thread.is_pinned && <Pin className="w-4 h-4" />}
              {thread.title}
            </h2>
            <p className="text-caption">{thread.participants?.length || 0} participants</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleTogglePin}>
            <Pin className={`w-4 h-4 ${thread.is_pinned ? 'fill-current' : ''}`} />
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* Participants */}
      <div className="py-3 border-b">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-micro">Participants:</span>
          {thread.participants?.map((p, i) => (
            <Badge key={i} variant="outline" className="text-xs">
              {p.name}
              {p.role === 'OWNER' && <span className="ml-1 text-muted-foreground">(owner)</span>}
            </Badge>
          ))}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 py-4">
        {loading ? (
          <div className="flex-center h-32">
            <RefreshCw className="w-5 h-5 animate-spin" />
          </div>
        ) : messages.length > 0 ? (
          <div className="space-y-4 pr-4">
            {messages.map((msg) => (
              <MessageBubble 
                key={msg.id} 
                message={msg}
                isOwn={msg.sender_id === 'current_user'}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="flex-center h-32 text-muted-foreground">
            No messages yet. Start the conversation!
          </div>
        )}
      </ScrollArea>

      {/* Message Input */}
      <div className="pt-4 border-t">
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            disabled={sending}
          />
          <Button onClick={handleSendMessage} disabled={!newMessage.trim() || sending}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// ==================== MAIN COMMUNICATIONS COMPONENT ====================

const Communications = () => {
  const [threads, setThreads] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedThread, setSelectedThread] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  const [newThread, setNewThread] = useState({
    title: '',
    thread_type: 'CONTRACT',
    description: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [threadsRes, statsRes] = await Promise.all([
        axios.get(`${API}/api/communications/threads`),
        axios.get(`${API}/api/communications/stats`)
      ]);
      setThreads(threadsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error loading communication data:', error);
    }
    setLoading(false);
  };

  const handleCreateThread = async () => {
    try {
      const res = await axios.post(
        `${API}/api/communications/threads?created_by=current_user`,
        newThread
      );
      setShowCreateDialog(false);
      setNewThread({ title: '', thread_type: 'CONTRACT', description: '' });
      loadData();
      setSelectedThread(res.data);
    } catch (error) {
      console.error('Error creating thread:', error);
    }
  };

  const filteredThreads = threads.filter(t => {
    if (typeFilter !== 'all' && t.thread_type !== typeFilter) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="communications">
      {/* Stats Header */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(THREAD_TYPE_CONFIG).map(([type, config]) => {
          const Icon = config.icon;
          const count = stats?.threads_by_type?.[type] || 0;
          const isSelected = typeFilter === type;
          return (
            <Card 
              key={type}
              className={`labyrinth-card cursor-pointer transition-all ${
                isSelected ? 'ring-2 ring-offset-2' : 'hover:shadow-md'
              }`}
              style={{ 
                borderTop: `3px solid ${config.color}`,
                ringColor: config.color,
                background: isSelected ? `${config.color}08` : 'white'
              }}
              onClick={() => setTypeFilter(typeFilter === type ? 'all' : type)}
              data-testid={`type-filter-${type}`}
            >
              <CardContent className="pt-4 pb-3 text-center">
                <Icon className="w-6 h-6 mx-auto mb-2" style={{ color: config.color }} />
                <div className="metric-card__value">{count}</div>
                <div className="text-micro mt-1">{config.label}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="labyrinth-card">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-caption">Total Threads</p>
                <p className="text-heading mt-1">{stats?.total_threads || 0}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="labyrinth-card">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-caption">Open Threads</p>
                <p className="text-heading mt-1">{stats?.open_threads || 0}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="labyrinth-card">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-caption">Total Messages</p>
                <p className="text-heading mt-1">{stats?.total_messages || 0}</p>
              </div>
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="labyrinth-card">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-caption">Participants</p>
                <p className="text-heading mt-1">{stats?.active_participants || 0}</p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="flex gap-6 h-[60vh]">
        {/* Thread List */}
        <div className="w-1/3 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-heading">Threads</h2>
              <p className="text-caption mt-1">{filteredThreads.length} conversations</p>
            </div>
            <Button 
              onClick={() => setShowCreateDialog(true)} 
              size="sm"
              className="gap-1"
              data-testid="new-thread-btn"
            >
              <Plus className="w-4 h-4" />
              New
            </Button>
          </div>
          
          {/* Status Filter */}
          <div className="flex gap-2 mb-4">
            {Object.entries(STATUS_CONFIG).map(([status, config]) => (
              <Badge
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
              >
                {config.label}
              </Badge>
            ))}
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-2 pr-4">
              {filteredThreads.map((thread) => (
                <ThreadListItem
                  key={thread.id}
                  thread={thread}
                  isSelected={selectedThread?.id === thread.id}
                  onSelect={setSelectedThread}
                />
              ))}
              {filteredThreads.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No threads found
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Thread Detail */}
        <div className="w-2/3 border-l pl-6">
          {selectedThread ? (
            <ThreadDetail
              thread={selectedThread}
              onClose={() => setSelectedThread(null)}
              onRefresh={() => {
                loadData();
                axios.get(`${API}/api/communications/threads/${selectedThread.id}`)
                  .then(res => setSelectedThread(res.data))
                  .catch(() => setSelectedThread(null));
              }}
            />
          ) : (
            <div className="flex-center h-full text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a thread to view messages</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Thread Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start New Thread</DialogTitle>
            <DialogDescription>Create a new communication thread</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={newThread.title}
                onChange={(e) => setNewThread({...newThread, title: e.target.value})}
                placeholder="Thread title"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select 
                value={newThread.thread_type} 
                onValueChange={(v) => setNewThread({...newThread, thread_type: v})}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(THREAD_TYPE_CONFIG).map(([type, config]) => (
                    <SelectItem key={type} value={type}>
                      <span className="flex items-center gap-2">
                        <config.icon className="w-4 h-4" style={{ color: config.color }} />
                        {config.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newThread.description}
                onChange={(e) => setNewThread({...newThread, description: e.target.value})}
                placeholder="Brief description..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleCreateThread} 
              disabled={!newThread.title}
            >
              Create Thread
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Communications;
