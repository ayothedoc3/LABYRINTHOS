import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LayoutDashboard, Key, MessageSquare, Calendar, DollarSign,
  TrendingUp, Package, FileText, Send, RefreshCw, CheckCircle,
  Clock, AlertCircle, Eye, EyeOff, Copy, Plus, ExternalLink,
  ChevronRight, Star, Target, PieChart, Mail, User, Shield
} from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Demo client for testing
const CURRENT_CLIENT = { id: "client_demo", name: "Frylow Inc" };

// ==================== ONBOARDING STEP COMPONENT ====================
const OnboardingStep = ({ step, isActive, isCompleted, onComplete }) => (
  <div className={`p-4 rounded-lg border-2 transition-all ${
    isActive ? 'border-primary bg-primary/5' : 
    isCompleted ? 'border-green-500 bg-green-50' : 'border-muted'
  }`}>
    <div className="flex items-start gap-3">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
        isCompleted ? 'bg-green-500 text-white' : 
        isActive ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
      }`}>
        {isCompleted ? <CheckCircle className="w-5 h-5" /> : step.step.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1">
        <h4 className="font-semibold">{step.title}</h4>
        <p className="text-sm text-muted-foreground">{step.description}</p>
        {isActive && (
          <div className="mt-4 space-y-3">
            <p className="text-sm">{step.content}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{step.duration_minutes} min</span>
              <Button size="sm" onClick={() => onComplete(step.step)}>
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);

// ==================== ONBOARDING WIZARD ====================
const OnboardingWizard = ({ clientId, onComplete }) => {
  const [steps, setSteps] = useState([]);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [stepsRes, progressRes] = await Promise.all([
          axios.get(`${API}/client-journey/onboarding/steps`),
          axios.get(`${API}/client-journey/onboarding/${clientId}`)
        ]);
        setSteps(stepsRes.data);
        setProgress(progressRes.data);
      } catch (err) {
        console.error('Failed to fetch onboarding data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [clientId]);

  const handleCompleteStep = async (stepName) => {
    try {
      const res = await axios.post(`${API}/client-journey/onboarding/${clientId}/complete-step?step=${stepName}`);
      setProgress(prev => ({
        ...prev,
        completed_steps: [...(prev.completed_steps || []), stepName],
        current_step: res.data.next_step
      }));
      
      if (res.data.next_step === 'complete') {
        onComplete?.();
      }
    } catch (err) {
      console.error('Failed to complete step:', err);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <RefreshCw className="w-8 h-8 animate-spin text-primary" />
    </div>;
  }

  const completedCount = progress?.completed_steps?.length || 0;
  const progressPercent = (completedCount / steps.length) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="w-6 h-6 text-yellow-500" />
          Welcome to Elev8!
        </CardTitle>
        <CardDescription>Complete these steps to get started</CardDescription>
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-2">
            <span>Progress</span>
            <span>{completedCount} of {steps.length} steps</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {steps.map((step, idx) => (
            <OnboardingStep
              key={step.step}
              step={step}
              isActive={progress?.current_step === step.step}
              isCompleted={progress?.completed_steps?.includes(step.step)}
              onComplete={handleCompleteStep}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// ==================== PASSWORD BOARD ====================
const PasswordBoard = ({ clientId }) => {
  const [passwords, setPasswords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPassword, setShowPassword] = useState({});
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newEntry, setNewEntry] = useState({
    resource_name: '', category: 'other', url: '', username: '', password: '', notes: ''
  });

  const categoryIcons = {
    finance: DollarSign,
    marketing: TrendingUp,
    analytics: PieChart,
    communication: MessageSquare,
    project: FileText,
    other: Key
  };

  const fetchPasswords = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/client-journey/passwords/${clientId}`);
      setPasswords(res.data);
    } catch (err) {
      console.error('Failed to fetch passwords:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPasswords();
  }, [clientId]);

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
  };

  const handleAddPassword = async () => {
    try {
      await axios.post(`${API}/client-journey/passwords`, {
        ...newEntry,
        client_id: clientId,
        updated_by: CURRENT_CLIENT.name
      });
      setShowAddDialog(false);
      setNewEntry({ resource_name: '', category: 'other', url: '', username: '', password: '', notes: '' });
      fetchPasswords();
    } catch (err) {
      console.error('Failed to add password:', err);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <RefreshCw className="w-8 h-8 animate-spin text-primary" />
    </div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Password Board
            </CardTitle>
            <CardDescription>Access credentials for your resources</CardDescription>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Entry</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Password Entry</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Resource Name</Label>
                  <Input value={newEntry.resource_name} onChange={(e) => setNewEntry({...newEntry, resource_name: e.target.value})} />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={newEntry.category} onValueChange={(v) => setNewEntry({...newEntry, category: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="analytics">Analytics</SelectItem>
                      <SelectItem value="communication">Communication</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>URL</Label>
                  <Input value={newEntry.url} onChange={(e) => setNewEntry({...newEntry, url: e.target.value})} />
                </div>
                <div>
                  <Label>Username</Label>
                  <Input value={newEntry.username} onChange={(e) => setNewEntry({...newEntry, username: e.target.value})} />
                </div>
                <div>
                  <Label>Password</Label>
                  <Input type="password" value={newEntry.password} onChange={(e) => setNewEntry({...newEntry, password: e.target.value})} />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea value={newEntry.notes} onChange={(e) => setNewEntry({...newEntry, notes: e.target.value})} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleAddPassword}>Add Entry</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {passwords.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No password entries yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {passwords.map((pwd) => {
              const Icon = categoryIcons[pwd.category] || Key;
              const isVisible = showPassword[pwd.id];
              
              return (
                <div key={pwd.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{pwd.resource_name}</h4>
                        {pwd.url && (
                          <a href={pwd.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Username:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono">{pwd.username}</span>
                            <Button variant="ghost" size="sm" onClick={() => handleCopy(pwd.username)}>
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Password:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono">{isVisible ? pwd.password : pwd.password_masked}</span>
                            <Button variant="ghost" size="sm" onClick={() => setShowPassword({...showPassword, [pwd.id]: !isVisible})}>
                              {isVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleCopy(pwd.password)}>
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      {pwd.notes && <p className="text-xs text-muted-foreground mt-2">{pwd.notes}</p>}
                      <p className="text-xs text-muted-foreground mt-1">Updated: {new Date(pwd.last_updated).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ==================== CLIENT MESSAGES ====================
const ClientMessages = ({ clientId, clientName }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [newMessage, setNewMessage] = useState({ subject: '', content: '', priority: 'normal' });

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/client-journey/messages/${clientId}`);
      setMessages(res.data);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [clientId]);

  const handleSendMessage = async () => {
    try {
      await axios.post(`${API}/client-journey/messages`, {
        client_id: clientId,
        client_name: clientName,
        from_client: true,
        to_user_id: "director",
        to_user_name: "Project Director",
        subject: newMessage.subject,
        content: newMessage.content,
        priority: newMessage.priority
      });
      setShowCompose(false);
      setNewMessage({ subject: '', content: '', priority: 'normal' });
      fetchMessages();
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleMarkRead = async (messageId) => {
    try {
      await axios.patch(`${API}/client-journey/messages/${messageId}/read`);
      setMessages(msgs => msgs.map(m => m.id === messageId ? {...m, read: true} : m));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <RefreshCw className="w-8 h-8 animate-spin text-primary" />
    </div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Messages
            </CardTitle>
            <CardDescription>Communication with your Elev8 team</CardDescription>
          </div>
          <Dialog open={showCompose} onOpenChange={setShowCompose}>
            <DialogTrigger asChild>
              <Button size="sm"><Send className="w-4 h-4 mr-1" /> New Message</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Message</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>To</Label>
                  <Input value="Project Director / Executive" disabled />
                </div>
                <div>
                  <Label>Subject</Label>
                  <Input value={newMessage.subject} onChange={(e) => setNewMessage({...newMessage, subject: e.target.value})} />
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={newMessage.priority} onValueChange={(v) => setNewMessage({...newMessage, priority: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Message</Label>
                  <Textarea value={newMessage.content} onChange={(e) => setNewMessage({...newMessage, content: e.target.value})} rows={5} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleSendMessage}>Send Message</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No messages yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map(msg => (
                <div 
                  key={msg.id} 
                  className={`p-4 rounded-lg border ${!msg.read && !msg.from_client ? 'bg-blue-50 border-blue-200' : ''}`}
                  onClick={() => !msg.read && handleMarkRead(msg.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      msg.from_client ? 'bg-primary text-white' : 'bg-violet-500 text-white'
                    }`}>
                      {msg.from_client ? <User className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">
                          {msg.from_client ? 'You' : msg.to_user_name || 'Elev8 Team'}
                        </span>
                        {msg.priority === 'high' && <Badge className="bg-orange-100 text-orange-700">High</Badge>}
                        {msg.priority === 'urgent' && <Badge className="bg-red-100 text-red-700">Urgent</Badge>}
                        {!msg.read && !msg.from_client && <Badge className="bg-blue-500">New</Badge>}
                      </div>
                      <h4 className="font-medium text-sm">{msg.subject}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{msg.content}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(msg.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

// ==================== MAIN CLIENT PORTAL COMPONENT ====================
const ClientPortalDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      // Seed demo data
      await axios.post(`${API}/client-journey/seed-demo/${CURRENT_CLIENT.id}?client_name=${CURRENT_CLIENT.name}`).catch(() => {});
      
      const [dashRes, onboardingRes] = await Promise.all([
        axios.get(`${API}/client-journey/dashboard/${CURRENT_CLIENT.id}`),
        axios.get(`${API}/client-journey/onboarding/${CURRENT_CLIENT.id}`)
      ]);
      
      setDashboard(dashRes.data);
      setOnboardingComplete(onboardingRes.data?.current_step === 'complete' || onboardingRes.data?.completed_at);
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show onboarding if not complete
  if (!onboardingComplete) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <OnboardingWizard 
          clientId={CURRENT_CLIENT.id} 
          onComplete={() => setOnboardingComplete(true)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" data-testid="client-portal">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {CURRENT_CLIENT.name}!</h1>
          <p className="text-muted-foreground">Your Elev8 Client Portal</p>
        </div>
        <Button onClick={fetchDashboard} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="dashboard" className="gap-2">
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="passwords" className="gap-2">
            <Key className="w-4 h-4" /> Passwords
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-2">
            <MessageSquare className="w-4 h-4" /> Messages
            {dashboard?.unread_messages > 0 && (
              <Badge className="ml-1 bg-blue-500">{dashboard.unread_messages}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="w-4 h-4" /> Documents
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {dashboard && (
            <>
              {/* Revenue Progress */}
              <Card className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-0">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold opacity-90">Revenue Progress</h2>
                      <p className="text-3xl font-bold">${dashboard.total_revenue.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="opacity-80">Goal</p>
                      <p className="text-xl font-bold">${dashboard.revenue_goal.toLocaleString()}</p>
                    </div>
                  </div>
                  <Progress value={dashboard.revenue_progress} className="h-3 bg-white/30" />
                  <p className="text-sm mt-2 opacity-80">{dashboard.revenue_progress.toFixed(1)}% of goal</p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Service Package */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-primary" />
                      Service Package
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 mb-4">
                      <Badge className="text-lg px-4 py-2 bg-primary">{dashboard.current_package}</Badge>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      <Badge variant="outline" className="text-lg px-4 py-2">{dashboard.goal_package}</Badge>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Included Features:</p>
                      {dashboard.package_features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          {feature}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Upcoming Payments */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-green-600" />
                      Upcoming Payments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dashboard.upcoming_payments.map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <p className="font-medium text-sm">{payment.service}</p>
                            <p className="text-xs text-muted-foreground">Due: {payment.due_date}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">${payment.amount.toLocaleString()}</p>
                            <Badge variant="outline" className="text-xs">{payment.status}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Sales */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {dashboard.recent_sales.map((sale) => (
                          <div key={sale.id} className="flex items-center justify-between py-2 border-b last:border-0">
                            <div>
                              <p className="text-sm font-medium">{sale.description}</p>
                              <p className="text-xs text-muted-foreground">{sale.date}</p>
                            </div>
                            <Badge className="bg-green-100 text-green-700">${sale.amount.toLocaleString()}</Badge>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                {/* Upcoming Events */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-orange-600" />
                      Upcoming Events
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dashboard.upcoming_events.map((event) => (
                        <div key={event.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                          <div className="p-2 rounded-lg bg-orange-100">
                            <Calendar className="w-4 h-4 text-orange-600" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{event.title}</p>
                            <p className="text-xs text-muted-foreground">{event.date}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Ad Budgets */}
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-purple-600" />
                      Campaign Ad Budgets
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {dashboard.ad_budgets.map((ad) => (
                        <div key={ad.id} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-medium text-sm">{ad.campaign}</p>
                              <p className="text-xs text-muted-foreground">{ad.platform}</p>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span>Budget Used</span>
                              <span>${ad.budget_used.toLocaleString()} / ${ad.budget_total.toLocaleString()}</span>
                            </div>
                            <Progress value={(ad.budget_used / ad.budget_total) * 100} className="h-2" />
                            <p className="text-xs text-green-600">Remaining: ${ad.budget_remaining.toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Passwords Tab */}
        <TabsContent value="passwords">
          <PasswordBoard clientId={CURRENT_CLIENT.id} />
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages">
          <ClientMessages clientId={CURRENT_CLIENT.id} clientName={CURRENT_CLIENT.name} />
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Documents & Reports
              </CardTitle>
              <CardDescription>Access your contracts, reports, and important documents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-4 border rounded-lg flex items-center justify-between hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-blue-500" />
                    <div>
                      <p className="font-medium">Service Agreement</p>
                      <p className="text-sm text-muted-foreground">Signed Jan 2026</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">View</Button>
                </div>
                <div className="p-4 border rounded-lg flex items-center justify-between hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-green-500" />
                    <div>
                      <p className="font-medium">Q4 2025 Performance Report</p>
                      <p className="text-sm text-muted-foreground">Generated Dec 2025</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">View</Button>
                </div>
                <div className="p-4 border rounded-lg flex items-center justify-between hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-purple-500" />
                    <div>
                      <p className="font-medium">Q1 2026 Campaign Strategy</p>
                      <p className="text-sm text-muted-foreground">Updated Jan 2026</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">View</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ClientPortalDashboard;
