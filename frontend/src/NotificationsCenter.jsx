import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './components/ui/card';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Switch } from './components/ui/switch';
import { ScrollArea } from './components/ui/scroll-area';
import { Separator } from './components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from './components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from './components/ui/select';
import {
  Bell, BellOff, CheckCircle, AlertTriangle, Info, X, Trash2,
  RefreshCw, Settings, Mail, MessageSquare, Clock, Zap, Plus
} from 'lucide-react';

const API = import.meta.env.VITE_BACKEND_URL || '';

const TYPE_CONFIG = {
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  success: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' },
  error: { icon: X, color: 'text-red-500', bg: 'bg-red-500/10' },
  reminder: { icon: Clock, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  task: { icon: Zap, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  system: { icon: Settings, color: 'text-gray-500', bg: 'bg-gray-500/10' }
};

const NotificationsCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [rules, setRules] = useState([]);
  const [preferences, setPreferences] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('notifications');
  const [showRuleDialog, setShowRuleDialog] = useState(false);

  const userId = 'user_exec1'; // Demo user

  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    trigger_type: 'time_based',
    target_roles: ['all'],
    notification_template: { title: '', message: '' },
    schedule: { frequency: 'daily', time: '09:00' }
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [notifsRes, rulesRes, prefsRes, analyticsRes] = await Promise.all([
        axios.get(`${API}/api/notifications/`, { params: { user_id: userId } }),
        axios.get(`${API}/api/notifications/rules`),
        axios.get(`${API}/api/notifications/preferences/${userId}`),
        axios.get(`${API}/api/notifications/analytics`)
      ]);
      setNotifications(notifsRes.data.notifications || []);
      setRules(rulesRes.data.rules || []);
      setPreferences(prefsRes.data);
      setAnalytics(analyticsRes.data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const markAsRead = async (notificationId) => {
    try {
      await axios.patch(`${API}/api/notifications/${notificationId}/read`);
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, read: true, read_at: new Date().toISOString() } : n
      ));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const markAllRead = async () => {
    try {
      await axios.patch(`${API}/api/notifications/read-all`, null, { params: { user_id: userId } });
      setNotifications(notifications.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await axios.delete(`${API}/api/notifications/${notificationId}`);
      setNotifications(notifications.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const updatePreferences = async (updates) => {
    const newPrefs = { ...preferences, ...updates };
    setPreferences(newPrefs);
    try {
      await axios.put(`${API}/api/notifications/preferences/${userId}`, newPrefs);
    } catch (err) {
      console.error('Error updating preferences:', err);
    }
  };

  const toggleRuleStatus = async (ruleId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      await axios.patch(`${API}/api/notifications/rules/${ruleId}/status`, null, {
        params: { status: newStatus }
      });
      setRules(rules.map(r => 
        r.id === ruleId ? { ...r, status: newStatus } : r
      ));
    } catch (err) {
      console.error('Error toggling rule status:', err);
    }
  };

  const createRule = async () => {
    try {
      await axios.post(`${API}/api/notifications/rules/`, newRule);
      setShowRuleDialog(false);
      setNewRule({
        name: '',
        description: '',
        trigger_type: 'time_based',
        target_roles: ['all'],
        notification_template: { title: '', message: '' },
        schedule: { frequency: 'daily', time: '09:00' }
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create rule');
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = (now - date) / 1000;
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="notifications-center">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Bell className="w-8 h-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{analytics?.total_notifications || 0}</div>
                <div className="text-xs text-muted-foreground">Total Notifications</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <BellOff className="w-8 h-8 text-amber-500" />
              <div>
                <div className="text-2xl font-bold">{analytics?.unread_notifications || 0}</div>
                <div className="text-xs text-muted-foreground">Unread</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{analytics?.read_rate || 0}%</div>
                <div className="text-xs text-muted-foreground">Read Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Zap className="w-8 h-8 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{analytics?.active_drip_rules || 0}</div>
                <div className="text-xs text-muted-foreground">Active Rules</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
            {unreadCount > 0 && (
              <Badge className="ml-2 bg-red-500 text-white">{unreadCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="rules">
            <Zap className="w-4 h-4 mr-2" />
            Drip Rules
          </TabsTrigger>
          <TabsTrigger value="preferences">
            <Settings className="w-4 h-4 mr-2" />
            Preferences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Your Notifications</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={markAllRead} disabled={unreadCount === 0}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark All Read
              </Button>
              <Button variant="outline" size="sm" onClick={fetchData}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {notifications.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="font-semibold mb-2">No Notifications</h3>
                    <p className="text-sm text-muted-foreground">You're all caught up!</p>
                  </CardContent>
                </Card>
              ) : (
                notifications.map(notification => {
                  const typeConfig = TYPE_CONFIG[notification.notification_type] || TYPE_CONFIG.info;
                  const Icon = typeConfig.icon;
                  
                  return (
                    <Card 
                      key={notification.id}
                      className={`transition-all ${!notification.read ? 'border-primary/50 bg-primary/5' : ''}`}
                      data-testid={`notification-${notification.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${typeConfig.bg}`}>
                            <Icon className={`w-4 h-4 ${typeConfig.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-semibold text-sm">{notification.title}</h4>
                                <p className="text-sm text-muted-foreground">{notification.message}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                {!notification.read && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => markAsRead(notification.id)}
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => deleteNotification(notification.id)}
                                >
                                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatTime(notification.created_at)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="rules" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Drip Notification Rules</h3>
            <Button onClick={() => setShowRuleDialog(true)} data-testid="create-rule-btn">
              <Plus className="w-4 h-4 mr-2" />
              New Rule
            </Button>
          </div>
          
          <div className="space-y-3">
            {rules.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Zap className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">No Drip Rules</h3>
                  <p className="text-sm text-muted-foreground">Create automated notification rules.</p>
                </CardContent>
              </Card>
            ) : (
              rules.map(rule => (
                <Card key={rule.id} data-testid={`rule-${rule.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{rule.name}</h4>
                          <Badge variant={rule.status === 'active' ? 'default' : 'secondary'}>
                            {rule.status}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {rule.trigger_type.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{rule.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Targets: {rule.target_roles?.join(', ')}</span>
                          <span>Triggered: {rule.trigger_count || 0} times</span>
                        </div>
                      </div>
                      <Switch 
                        checked={rule.status === 'active'}
                        onCheckedChange={() => toggleRuleStatus(rule.id, rule.status)}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="preferences" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notification Preferences</CardTitle>
              <CardDescription>Customize how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <Label>In-App Notifications</Label>
                      <p className="text-xs text-muted-foreground">Show notifications in the app</p>
                    </div>
                  </div>
                  <Switch 
                    checked={preferences?.in_app_enabled}
                    onCheckedChange={(v) => updatePreferences({ in_app_enabled: v })}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <Label>Email Notifications</Label>
                      <p className="text-xs text-muted-foreground">Receive notifications via email</p>
                    </div>
                  </div>
                  <Switch 
                    checked={preferences?.email_enabled}
                    onCheckedChange={(v) => updatePreferences({ email_enabled: v })}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <Label>SMS Notifications</Label>
                      <p className="text-xs text-muted-foreground">Receive notifications via SMS</p>
                    </div>
                  </div>
                  <Switch 
                    checked={preferences?.sms_enabled}
                    onCheckedChange={(v) => updatePreferences({ sms_enabled: v })}
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <Label>Digest Mode</Label>
                      <p className="text-xs text-muted-foreground">Batch notifications into daily digest</p>
                    </div>
                  </div>
                  <Switch 
                    checked={preferences?.digest_mode}
                    onCheckedChange={(v) => updatePreferences({ digest_mode: v })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Rule Dialog */}
      <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Drip Rule</DialogTitle>
            <DialogDescription>Set up an automated notification rule</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Rule Name</Label>
              <Input 
                value={newRule.name}
                onChange={(e) => setNewRule({...newRule, name: e.target.value})}
                placeholder="e.g., Daily Task Reminder"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input 
                value={newRule.description}
                onChange={(e) => setNewRule({...newRule, description: e.target.value})}
                placeholder="What does this rule do?"
              />
            </div>
            <div>
              <Label>Trigger Type</Label>
              <Select 
                value={newRule.trigger_type}
                onValueChange={(v) => setNewRule({...newRule, trigger_type: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="time_based">Time-based</SelectItem>
                  <SelectItem value="event_based">Event-based</SelectItem>
                  <SelectItem value="condition_based">Condition-based</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notification Title</Label>
              <Input 
                value={newRule.notification_template.title}
                onChange={(e) => setNewRule({
                  ...newRule, 
                  notification_template: {...newRule.notification_template, title: e.target.value}
                })}
                placeholder="Notification title"
              />
            </div>
            <div>
              <Label>Notification Message</Label>
              <Input 
                value={newRule.notification_template.message}
                onChange={(e) => setNewRule({
                  ...newRule, 
                  notification_template: {...newRule.notification_template, message: e.target.value}
                })}
                placeholder="Notification message"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRuleDialog(false)}>Cancel</Button>
            <Button onClick={createRule} data-testid="create-rule-submit">Create Rule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotificationsCenter;
