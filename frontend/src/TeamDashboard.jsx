import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DollarSign, TrendingUp, Target, Users, Calendar, Package, 
  FileText, Clock, AlertCircle, Award, Trophy, Briefcase,
  BarChart3, PieChart, Activity, Zap, Plus, RefreshCw,
  ChevronRight, Star, CheckCircle2, Timer, Rocket
} from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// ==================== PROGRESS BAR COMPONENT ====================

const RevenueProgressBar = ({ current, goal, label = "$100M Goal" }) => {
  const percentage = Math.min(100, (current / goal) * 100);
  const formattedCurrent = (current / 1000000).toFixed(2);
  const formattedGoal = (goal / 1000000).toFixed(0);
  
  return (
    <Card className="bg-gradient-to-r from-violet-600 to-purple-700 text-white border-0">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-xl">
              <Target className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{label}</h2>
              <p className="text-white/80">Elev8 Revenue Progress</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">${formattedCurrent}M</div>
            <div className="text-white/80">of ${formattedGoal}M</div>
          </div>
        </div>
        <div className="relative">
          <div className="h-6 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-2"
              style={{ width: `${percentage}%` }}
            >
              {percentage > 10 && (
                <span className="text-xs font-bold text-white">{percentage.toFixed(1)}%</span>
              )}
            </div>
          </div>
          <div className="flex justify-between mt-2 text-xs text-white/70">
            <span>$0</span>
            <span>$25M</span>
            <span>$50M</span>
            <span>$75M</span>
            <span>$100M</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ==================== CAMPAIGN CARD ====================

const CampaignCard = ({ campaign }) => (
  <div className="p-4 border rounded-lg bg-card hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-2">
      <div>
        <h4 className="font-semibold text-sm">{campaign.name}</h4>
        <p className="text-xs text-muted-foreground">{campaign.client_name}</p>
      </div>
      <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
        {campaign.status}
      </Badge>
    </div>
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Progress</span>
        <span className="font-medium">{campaign.progress_percent}%</span>
      </div>
      <Progress value={campaign.progress_percent} className="h-2" />
      <div className="flex items-center justify-between text-xs mt-2">
        <Badge variant="outline" className="text-xs">{campaign.current_package}</Badge>
        <ChevronRight className="w-3 h-3 text-muted-foreground" />
        <Badge className="text-xs bg-green-600">{campaign.goal_package}</Badge>
      </div>
    </div>
  </div>
);

// ==================== SCALED CAMPAIGN CARD ====================

const ScaledCampaignCard = ({ campaign }) => {
  const formatCurrency = (num) => {
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(0)}K`;
    return `$${num}`;
  };
  
  return (
    <div className="p-4 border rounded-lg bg-card">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-semibold text-sm">{campaign.name}</h4>
          <p className="text-xs text-muted-foreground">{campaign.client_name}</p>
        </div>
        <TrendingUp className="w-5 h-5 text-green-500" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-green-600">{formatCurrency(campaign.scaled_revenue)}</span>
          <span className="text-sm text-muted-foreground">/ {formatCurrency(campaign.revenue_goal)}</span>
        </div>
        <Progress value={campaign.progress_percent} className="h-2" />
      </div>
    </div>
  );
};

// ==================== RECENT SALE ROW ====================

const RecentSaleRow = ({ sale }) => (
  <div className="flex items-center justify-between py-3 border-b last:border-0">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
        <DollarSign className="w-5 h-5 text-green-600" />
      </div>
      <div>
        <p className="font-medium text-sm">{sale.client_name}</p>
        <p className="text-xs text-muted-foreground">{sale.salesperson} • {sale.package}</p>
      </div>
    </div>
    <div className="text-right">
      <p className="font-bold text-green-600">${sale.amount.toLocaleString()}</p>
      <p className="text-xs text-muted-foreground">{sale.date}</p>
    </div>
  </div>
);

// ==================== EVENT CARD ====================

const EventCard = ({ event }) => {
  const typeColors = {
    meeting: 'bg-blue-100 text-blue-700',
    milestone: 'bg-purple-100 text-purple-700',
    deadline: 'bg-red-100 text-red-700',
    training: 'bg-green-100 text-green-700',
    event: 'bg-orange-100 text-orange-700'
  };
  
  return (
    <div className="flex items-start gap-3 p-3 border rounded-lg">
      <div className={`p-2 rounded-lg ${typeColors[event.type] || 'bg-gray-100'}`}>
        <Calendar className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{event.title}</p>
        <p className="text-xs text-muted-foreground">{event.date}</p>
      </div>
      <Badge variant="outline" className="text-xs capitalize">{event.type}</Badge>
    </div>
  );
};

// ==================== RESOURCE REQUEST CARD ====================

const ResourceRequestCard = ({ resource }) => {
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700'
  };
  
  const typeIcons = {
    software: Package,
    personnel: Users,
    training: Briefcase
  };
  
  const Icon = typeIcons[resource.type] || Package;
  
  return (
    <div className="flex items-start gap-3 p-3 border rounded-lg">
      <div className="p-2 rounded-lg bg-muted">
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{resource.title}</p>
        <p className="text-xs text-muted-foreground">{resource.requested_by}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <Badge className={`text-xs ${statusColors[resource.status]}`}>{resource.status}</Badge>
        <Badge variant="outline" className="text-xs">{resource.priority}</Badge>
      </div>
    </div>
  );
};

// ==================== PROJECT BUDGET BAR ====================

const ProjectBudgetBar = ({ project }) => {
  const usedPercent = (project.budget_used / project.budget_total) * 100;
  
  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className="font-semibold text-sm">{project.name}</h4>
          <p className="text-xs text-muted-foreground">Due: {project.completion_date}</p>
        </div>
        <Badge variant={project.completion_percent > 70 ? 'default' : 'secondary'}>
          {project.completion_percent}% Complete
        </Badge>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Budget Used</span>
          <span>${project.budget_used.toLocaleString()} / ${project.budget_total.toLocaleString()}</span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full ${usedPercent > 80 ? 'bg-red-500' : usedPercent > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
            style={{ width: `${usedPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-green-600">Remaining: ${project.budget_remaining.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

// ==================== AD BUDGET BAR ====================

const AdBudgetBar = ({ ad }) => {
  const usedPercent = (ad.budget_used / ad.budget_total) * 100;
  
  return (
    <div className="flex items-center gap-4 py-2">
      <div className="w-32 truncate">
        <p className="font-medium text-sm truncate">{ad.campaign_name}</p>
        <p className="text-xs text-muted-foreground">{ad.platform}</p>
      </div>
      <div className="flex-1">
        <div className="h-4 bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full ${usedPercent > 80 ? 'bg-red-500' : 'bg-blue-500'}`}
            style={{ width: `${usedPercent}%` }}
          />
        </div>
      </div>
      <div className="w-24 text-right">
        <p className="text-xs font-medium">${ad.budget_remaining.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">remaining</p>
      </div>
    </div>
  );
};

// ==================== MILESTONE CARD ====================

const MilestoneCard = ({ milestone }) => {
  const urgencyColor = milestone.days_remaining <= 3 ? 'text-red-600' : 
                       milestone.days_remaining <= 7 ? 'text-yellow-600' : 'text-green-600';
  
  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg">
      <div className={`p-2 rounded-lg ${milestone.days_remaining <= 3 ? 'bg-red-100' : 'bg-blue-100'}`}>
        <Timer className={`w-4 h-4 ${milestone.days_remaining <= 3 ? 'text-red-600' : 'text-blue-600'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{milestone.title}</p>
        <p className="text-xs text-muted-foreground">{milestone.project_name}</p>
      </div>
      <div className="text-right">
        <p className={`font-bold text-sm ${urgencyColor}`}>{milestone.days_remaining} days</p>
        <p className="text-xs text-muted-foreground">{milestone.due_date}</p>
      </div>
    </div>
  );
};

// ==================== PERFORMER CARD ====================

const PerformerCard = ({ performer, rank }) => (
  <div className="flex items-center gap-3 p-3 border rounded-lg">
    <div className="relative">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold">
        {performer.name.charAt(0)}
      </div>
      {rank <= 3 && (
        <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
          ${rank === 1 ? 'bg-yellow-400 text-yellow-900' : rank === 2 ? 'bg-gray-300 text-gray-700' : 'bg-orange-400 text-orange-900'}`}>
          {rank}
        </div>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-medium text-sm truncate">{performer.name}</p>
      <p className="text-xs text-muted-foreground">{performer.role}</p>
    </div>
    <div className="text-right">
      <div className="flex items-center gap-1">
        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
        <span className="font-bold text-sm">{performer.kpi_score}</span>
      </div>
      <p className="text-xs text-muted-foreground">{performer.tasks_completed} tasks</p>
    </div>
  </div>
);

// ==================== PROJECT CARD ====================

const UpcomingProjectCard = ({ project }) => {
  const priorityColors = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-green-100 text-green-700'
  };
  
  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg">
      <div className="p-2 rounded-lg bg-blue-100">
        <Rocket className="w-4 h-4 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{project.name}</p>
        <p className="text-xs text-muted-foreground">{project.client_name} • {project.start_date}</p>
      </div>
      <Badge className={`text-xs ${priorityColors[project.priority]}`}>{project.priority}</Badge>
    </div>
  );
};

// ==================== MAIN DASHBOARD COMPONENT ====================

const TeamDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showResourceDialog, setShowResourceDialog] = useState(false);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [newResource, setNewResource] = useState({ type: 'software', title: '', requested_by: '', priority: 'medium' });
  const [newEvent, setNewEvent] = useState({ title: '', date: '', type: 'meeting', description: '' });

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/team-dashboard/overview`);
      setData(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // Seed demo data on first load
    axios.post(`${API}/team-dashboard/seed-demo`).catch(() => {});
  }, []);

  const handleCreateResource = async () => {
    try {
      await axios.post(`${API}/team-dashboard/resource-requests`, newResource);
      setShowResourceDialog(false);
      setNewResource({ type: 'software', title: '', requested_by: '', priority: 'medium' });
      fetchDashboardData();
    } catch (err) {
      console.error('Failed to create resource request:', err);
    }
  };

  const handleCreateEvent = async () => {
    try {
      await axios.post(`${API}/team-dashboard/events`, newEvent);
      setShowEventDialog(false);
      setNewEvent({ title: '', date: '', type: 'meeting', description: '' });
      fetchDashboardData();
    } catch (err) {
      console.error('Failed to create event:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <p className="text-lg font-medium">{error || 'Failed to load dashboard'}</p>
        <Button onClick={fetchDashboardData} className="mt-4">
          <RefreshCw className="w-4 h-4 mr-2" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" data-testid="team-dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Elev8 Team Dashboard</h1>
          <p className="text-muted-foreground">Real-time overview of company performance</p>
        </div>
        <Button onClick={fetchDashboardData} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* $100M Revenue Progress */}
      <RevenueProgressBar 
        current={data.current_revenue} 
        goal={data.revenue_goal}
      />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        
        {/* Top 5 Campaigns */}
        <Card className="lg:col-span-2 xl:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-violet-600" />
              Top 5 Campaigns
            </CardTitle>
            <CardDescription>Campaign progress to goal package</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[320px]">
              <div className="space-y-3">
                {data.top_campaigns.map((campaign) => (
                  <CampaignCard key={campaign.id} campaign={campaign} />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Scaled Revenue */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Scaled Campaigns
            </CardTitle>
            <CardDescription>Top 3 scaled revenue performers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.scaled_campaigns.map((campaign) => (
                <ScaledCampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Recent Sales
            </CardTitle>
            <CardDescription>Last 10 closed deals</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              {data.recent_sales.map((sale) => (
                <RecentSaleRow key={sale.id} sale={sale} />
              ))}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Contracts Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Contracts This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">{data.contracts_summary.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{data.contracts_summary.available}</p>
                <p className="text-xs text-muted-foreground">Available</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{data.contracts_summary.closed}</p>
                <p className="text-xs text-muted-foreground">Closed</p>
              </div>
            </div>
            <div className="mt-4 p-4 bg-muted rounded-lg text-center">
              <p className="text-3xl font-bold">{data.contracts_summary.total}</p>
              <p className="text-sm text-muted-foreground">Total Contracts</p>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-orange-600" />
                Upcoming Events
              </CardTitle>
              <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Plus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Event</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Title</Label>
                      <Input 
                        value={newEvent.title} 
                        onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Date</Label>
                      <Input 
                        type="date"
                        value={newEvent.date} 
                        onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Type</Label>
                      <Select value={newEvent.type} onValueChange={(v) => setNewEvent({...newEvent, type: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="meeting">Meeting</SelectItem>
                          <SelectItem value="milestone">Milestone</SelectItem>
                          <SelectItem value="deadline">Deadline</SelectItem>
                          <SelectItem value="training">Training</SelectItem>
                          <SelectItem value="event">Event</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea 
                        value={newEvent.description} 
                        onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateEvent}>Create Event</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <CardDescription>Next 4 weeks</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[240px]">
              <div className="space-y-2">
                {data.upcoming_events.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Resource Requests */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-600" />
                Resource Requests
              </CardTitle>
              <Dialog open={showResourceDialog} onOpenChange={setShowResourceDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Plus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Request Resource</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Type</Label>
                      <Select value={newResource.type} onValueChange={(v) => setNewResource({...newResource, type: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="software">Software</SelectItem>
                          <SelectItem value="personnel">Personnel</SelectItem>
                          <SelectItem value="training">Training</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Title</Label>
                      <Input 
                        value={newResource.title} 
                        onChange={(e) => setNewResource({...newResource, title: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Requested By</Label>
                      <Input 
                        value={newResource.requested_by} 
                        onChange={(e) => setNewResource({...newResource, requested_by: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label>Priority</Label>
                      <Select value={newResource.priority} onValueChange={(v) => setNewResource({...newResource, priority: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateResource}>Submit Request</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[240px]">
              <div className="space-y-2">
                {data.resource_requests.map((resource) => (
                  <ResourceRequestCard key={resource.id} resource={resource} />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Project Budgets */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Project Budgets
            </CardTitle>
            <CardDescription>Budget usage vs completion</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.project_budgets.map((project) => (
                <ProjectBudgetBar key={project.id} project={project} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Campaign Ad Budgets */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChart className="w-5 h-5 text-indigo-600" />
              Campaign Ad Budgets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {data.campaign_ad_budgets.map((ad) => (
                <AdBudgetBar key={ad.id} ad={ad} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Milestones */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-red-600" />
              Upcoming Milestones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              <div className="space-y-2">
                {data.upcoming_milestones.map((milestone) => (
                  <MilestoneCard key={milestone.id} milestone={milestone} />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Top Individual Performers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-600" />
              Top Individual Performers
            </CardTitle>
            <CardDescription>KPIs & Scorecard</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              <div className="space-y-2">
                {data.top_individual_performers.map((performer, idx) => (
                  <PerformerCard key={performer.id} performer={performer} rank={idx + 1} />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Top Team Performers */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-600" />
              Top Team Performers
            </CardTitle>
            <CardDescription>KPIs, Scorecard & Deliverables</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.top_team_performers.map((performer, idx) => (
                <PerformerCard key={performer.id} performer={performer} rank={idx + 1} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top 5 Upcoming Projects */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Rocket className="w-5 h-5 text-cyan-600" />
              Top 5 Upcoming Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              <div className="space-y-2">
                {data.upcoming_projects.map((project) => (
                  <UpcomingProjectCard key={project.id} project={project} />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TeamDashboard;
