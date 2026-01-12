import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Bot, MessageSquare, Bell, CheckCircle2, Clock, AlertTriangle,
  Send, RefreshCw, Calendar, FileText, Users, Target,
  TrendingUp, Inbox, CheckCheck, Circle, Tag
} from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Demo user for testing
const CURRENT_USER = { id: "user1", name: "Sarah Johnson" };

// Tag colors
const TAG_COLORS = {
  meeting: 'bg-blue-100 text-blue-700',
  data_request: 'bg-purple-100 text-purple-700',
  document_request: 'bg-indigo-100 text-indigo-700',
  timeline_update: 'bg-orange-100 text-orange-700',
  deliverable_revision: 'bg-yellow-100 text-yellow-700',
  sop_change: 'bg-green-100 text-green-700',
  meeting_change: 'bg-red-100 text-red-700',
  client_suggestion: 'bg-pink-100 text-pink-700',
  deadline: 'bg-red-100 text-red-700',
  follow_up: 'bg-cyan-100 text-cyan-700',
  urgent: 'bg-red-200 text-red-800',
  blocked: 'bg-gray-100 text-gray-700',
};

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-600',
  high: 'bg-orange-100 text-orange-600',
  urgent: 'bg-red-100 text-red-600',
};

const STATUS_CONFIG = {
  pending: { color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  in_progress: { color: 'bg-blue-100 text-blue-700', icon: Circle },
  awaiting_response: { color: 'bg-purple-100 text-purple-700', icon: Clock },
  completed: { color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  cancelled: { color: 'bg-gray-100 text-gray-700', icon: Circle },
};

// ==================== MESSAGE CARD ====================

const MessageCard = ({ message, onMarkRead }) => {
  const isUnread = !message.read;
  
  return (
    <Card className={`mb-3 ${isUnread ? 'border-l-4 border-l-violet-500 bg-violet-50/50' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-violet-100">
            <Bot className="w-5 h-5 text-violet-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-sm">AI Manager</span>
              <span className="text-xs text-muted-foreground">
                {new Date(message.created_at).toLocaleString()}
              </span>
            </div>
            <div className="text-sm whitespace-pre-wrap">{message.content}</div>
            {message.tags && message.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {message.tags.map((tag, idx) => (
                  <Badge key={idx} className={`text-xs ${TAG_COLORS[tag] || 'bg-gray-100'}`}>
                    {tag.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            )}
            {isUnread && (
              <Button 
                size="sm" 
                variant="ghost" 
                className="mt-2 text-xs"
                onClick={() => onMarkRead(message.id)}
              >
                <CheckCheck className="w-3 h-3 mr-1" /> Mark as read
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ==================== TASK CARD ====================

const TaskCard = ({ task, onStatusChange }) => {
  const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;
  
  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h4 className="font-semibold text-sm">{task.title}</h4>
            <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
          </div>
          <Badge className={PRIORITY_COLORS[task.priority]}>{task.priority}</Badge>
        </div>
        
        <div className="flex flex-wrap gap-1 my-2">
          {task.tags?.map((tag, idx) => (
            <Badge key={idx} variant="outline" className={`text-xs ${TAG_COLORS[tag] || ''}`}>
              <Tag className="w-3 h-3 mr-1" />{tag.replace('_', ' ')}
            </Badge>
          ))}
        </div>
        
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <Badge className={statusConfig.color}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {task.status.replace('_', ' ')}
            </Badge>
            {task.due_date && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {task.due_date}
              </span>
            )}
          </div>
          
          <Select value={task.status} onValueChange={(v) => onStatusChange(task.id, v)}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="awaiting_response">Awaiting</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};

// ==================== PERFORMANCE CARD ====================

const PerformanceCard = ({ feedback }) => {
  if (!feedback) return null;
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-600" />
          Performance Summary
        </CardTitle>
        <CardDescription>Week {feedback.period}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-center p-4 bg-gradient-to-r from-violet-100 to-purple-100 rounded-lg">
            <div className="text-4xl font-bold text-violet-600">{feedback.overall_score}</div>
            <div className="text-sm text-muted-foreground">Overall Score</div>
          </div>
          
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-green-50 rounded">
              <div className="text-lg font-bold text-green-600">{feedback.kpi_summary.tasks_completed}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div className="p-2 bg-yellow-50 rounded">
              <div className="text-lg font-bold text-yellow-600">{feedback.kpi_summary.tasks_pending}</div>
              <div className="text-xs text-muted-foreground">Pending</div>
            </div>
            <div className="p-2 bg-blue-50 rounded">
              <div className="text-lg font-bold text-blue-600">{feedback.kpi_summary.completion_rate}%</div>
              <div className="text-xs text-muted-foreground">Rate</div>
            </div>
          </div>
          
          {feedback.strengths.length > 0 && (
            <div>
              <h5 className="font-medium text-sm text-green-700 mb-1">Strengths</h5>
              <ul className="text-sm space-y-1">
                {feedback.strengths.map((s, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {feedback.recommendations.length > 0 && (
            <div>
              <h5 className="font-medium text-sm text-blue-700 mb-1">Recommendations</h5>
              <ul className="text-sm space-y-1">
                {feedback.recommendations.map((r, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Target className="w-3 h-3 text-blue-500" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// ==================== MAIN COMPONENT ====================

const AIManager = () => {
  const [messages, setMessages] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("inbox");
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '', description: '', priority: 'medium', due_date: '',
    assigned_to: CURRENT_USER.id, assigned_to_name: CURRENT_USER.name
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // Seed demo data first
      await axios.post(`${API}/ai-manager/seed-demo`).catch(() => {});
      
      const [messagesRes, tasksRes, dashboardRes, performanceRes] = await Promise.all([
        axios.get(`${API}/ai-manager/messages/${CURRENT_USER.id}`),
        axios.get(`${API}/ai-manager/tasks?user_id=${CURRENT_USER.id}`),
        axios.get(`${API}/ai-manager/dashboard/${CURRENT_USER.id}`),
        axios.get(`${API}/ai-manager/performance/${CURRENT_USER.id}`),
      ]);
      
      setMessages(messagesRes.data);
      setTasks(tasksRes.data);
      setDashboard(dashboardRes.data);
      setPerformance(performanceRes.data);
    } catch (err) {
      console.error('Failed to fetch AI Manager data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleMarkRead = async (messageId) => {
    try {
      await axios.patch(`${API}/ai-manager/messages/${messageId}/read`);
      setMessages(msgs => msgs.map(m => m.id === messageId ? {...m, read: true} : m));
    } catch (err) {
      console.error('Failed to mark message as read:', err);
    }
  };

  const handleStatusChange = async (taskId, status) => {
    try {
      await axios.patch(`${API}/ai-manager/tasks/${taskId}/status?status=${status}`);
      setTasks(tasks => tasks.map(t => t.id === taskId ? {...t, status} : t));
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  };

  const handleCreateTask = async () => {
    try {
      await axios.post(`${API}/ai-manager/tasks`, newTask);
      setShowNewTask(false);
      setNewTask({ title: '', description: '', priority: 'medium', due_date: '',
        assigned_to: CURRENT_USER.id, assigned_to_name: CURRENT_USER.name });
      fetchData();
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const generatePerformance = async () => {
    try {
      const res = await axios.post(
        `${API}/ai-manager/performance/generate/${CURRENT_USER.id}?user_name=${CURRENT_USER.name}`
      );
      setPerformance(res.data);
      fetchData();
    } catch (err) {
      console.error('Failed to generate performance:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const unreadCount = messages.filter(m => !m.read).length;
  const pendingTasks = tasks.filter(t => !['completed', 'cancelled'].includes(t.status));
  const urgentTasks = tasks.filter(t => t.priority === 'urgent' && t.status !== 'completed');

  return (
    <div className="space-y-6 p-6" data-testid="ai-manager">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Manager</h1>
            <p className="text-muted-foreground">Your intelligent assistant for tasks and reminders</p>
          </div>
        </div>
        <Button onClick={fetchData} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-violet-50 to-purple-50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-violet-100 rounded-lg">
              <Inbox className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{unreadCount}</p>
              <p className="text-xs text-muted-foreground">Unread Messages</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-50 to-cyan-50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingTasks.length}</p>
              <p className="text-xs text-muted-foreground">Pending Tasks</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-red-50 to-orange-50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{urgentTasks.length}</p>
              <p className="text-xs text-muted-foreground">Urgent Tasks</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Bell className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{dashboard?.upcoming_reminders || 0}</p>
              <p className="text-xs text-muted-foreground">Upcoming Reminders</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-0">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="flex items-center justify-between">
                  <TabsList>
                    <TabsTrigger value="inbox" className="gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Inbox
                      {unreadCount > 0 && (
                        <Badge className="ml-1 bg-violet-600">{unreadCount}</Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="tasks" className="gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      Tasks
                      {pendingTasks.length > 0 && (
                        <Badge className="ml-1" variant="secondary">{pendingTasks.length}</Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                  
                  {activeTab === 'tasks' && (
                    <Dialog open={showNewTask} onOpenChange={setShowNewTask}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Send className="w-4 h-4 mr-2" /> New Task
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create New Task</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Title</Label>
                            <Input 
                              value={newTask.title}
                              onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                              placeholder="Task title"
                            />
                          </div>
                          <div>
                            <Label>Description</Label>
                            <Textarea 
                              value={newTask.description}
                              onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                              placeholder="Task description"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Priority</Label>
                              <Select value={newTask.priority} onValueChange={(v) => setNewTask({...newTask, priority: v})}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="low">Low</SelectItem>
                                  <SelectItem value="medium">Medium</SelectItem>
                                  <SelectItem value="high">High</SelectItem>
                                  <SelectItem value="urgent">Urgent</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Due Date</Label>
                              <Input 
                                type="date"
                                value={newTask.due_date}
                                onChange={(e) => setNewTask({...newTask, due_date: e.target.value})}
                              />
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button onClick={handleCreateTask}>Create Task</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>

                <TabsContent value="inbox" className="mt-4">
                  <ScrollArea className="h-[500px]">
                    {messages.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No messages yet</p>
                      </div>
                    ) : (
                      messages.map(message => (
                        <MessageCard 
                          key={message.id} 
                          message={message} 
                          onMarkRead={handleMarkRead}
                        />
                      ))
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="tasks" className="mt-4">
                  <ScrollArea className="h-[500px]">
                    {tasks.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No tasks assigned</p>
                      </div>
                    ) : (
                      tasks.map(task => (
                        <TaskCard 
                          key={task.id} 
                          task={task} 
                          onStatusChange={handleStatusChange}
                        />
                      ))
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </CardHeader>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Performance */}
          {performance ? (
            <PerformanceCard feedback={performance} />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Generate your weekly performance summary
                </p>
                <Button onClick={generatePerformance} className="w-full">
                  <TrendingUp className="w-4 h-4 mr-2" /> Generate Report
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Urgent Tasks */}
          {urgentTasks.length > 0 && (
            <Card className="border-red-200 bg-red-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-red-700">
                  <AlertTriangle className="w-5 h-5" />
                  Urgent Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {urgentTasks.slice(0, 3).map(task => (
                    <div key={task.id} className="p-2 bg-white rounded border">
                      <p className="font-medium text-sm">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{task.due_date || 'No due date'}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Info Card */}
          <Card className="bg-gradient-to-br from-violet-50 to-purple-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Bot className="w-6 h-6 text-violet-600" />
                <span className="font-medium">AI Manager</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Your AI assistant tracks activities, sends reminders, and provides performance insights. 
                All communications here are between AI and personnel - team comms remain on Discord.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AIManager;
