import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent
} from './components/ui/card';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Input } from './components/ui/input';
import { Separator } from './components/ui/separator';
import { Progress } from './components/ui/progress';
import { ScrollArea } from './components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from './components/ui/dialog';
import { Label } from './components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from './components/ui/select';
import { Textarea } from './components/ui/textarea';
import {
  Tabs, TabsContent, TabsList, TabsTrigger
} from './components/ui/tabs';
import {
  Play, Pause, CheckCircle, Clock, Users, FileText, Target,
  Plus, RefreshCw, Calendar, DollarSign, ArrowRight, Zap,
  AlertTriangle, TrendingUp, Milestone, BarChart3, Download
} from 'lucide-react';
import GanttChart from './GanttChart';

const API = process.env.REACT_APP_BACKEND_URL || '';

// Status colors
const STATUS_CONFIG = {
  draft: { label: 'Draft', color: '#64748B', icon: FileText },
  active: { label: 'Active', color: '#22C55E', icon: Play },
  paused: { label: 'Paused', color: '#F59E0B', icon: Pause },
  completed: { label: 'Completed', color: '#3B82F6', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: '#EF4444', icon: AlertTriangle },
};

const PHASE_COLORS = {
  INITIATION: '#8B5CF6',
  PLANNING: '#3B82F6',
  EXECUTION: '#22C55E',
  MONITORING: '#F59E0B',
  CLOSURE: '#64748B',
};

// ==================== PLAN CARD ====================

const PlanCard = ({ plan, onSelect }) => {
  const statusConfig = STATUS_CONFIG[plan.status] || STATUS_CONFIG.draft;
  const StatusIcon = statusConfig.icon;
  
  return (
    <Card 
      className="labyrinth-card labyrinth-card--interactive cursor-pointer"
      style={{ borderLeft: `4px solid ${statusConfig.color}` }}
      onClick={() => onSelect(plan)}
      data-testid={`plan-card-${plan.id}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-subheading">{plan.name}</CardTitle>
            <CardDescription className="text-caption">
              {plan.client_name || plan.issue_category}
            </CardDescription>
          </div>
          <Badge 
            className="status-badge"
            style={{ 
              backgroundColor: `${statusConfig.color}10`,
              color: statusConfig.color,
              border: `1px solid ${statusConfig.color}25`
            }}
          >
            <StatusIcon className="w-3 h-3 mr-1" />
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex justify-between text-micro">
            <span>Progress</span>
            <span>{plan.progress_percent}%</span>
          </div>
          <Progress value={plan.progress_percent} className="h-2" />
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-heading text-sm">{plan.total_milestones}</div>
            <div className="text-micro">Milestones</div>
          </div>
          <div>
            <div className="text-heading text-sm">{plan.completed_milestones}</div>
            <div className="text-micro">Completed</div>
          </div>
          <div>
            <div className="text-heading text-sm">{plan.total_tasks}</div>
            <div className="text-micro">Tasks</div>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-caption">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(plan.start_date).toLocaleDateString()}
          </span>
          <ArrowRight className="w-3 h-3" />
          <span className="flex items-center gap-1">
            <Target className="w-3 h-3" />
            {plan.target_end_date ? new Date(plan.target_end_date).toLocaleDateString() : 'TBD'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

// ==================== PLAN DETAIL ====================

const PlanDetail = ({ planId, onClose, onRefresh }) => {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadPlan();
  }, [planId]);

  const loadPlan = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/playbook-engine/plans/${planId}`);
      setPlan(res.data);
    } catch (error) {
      console.error('Error loading plan:', error);
    }
    setLoading(false);
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await axios.patch(`${API}/api/playbook-engine/plans/${planId}/status?status=${newStatus}`);
      loadPlan();
      onRefresh();
    } catch (error) {
      console.error('Error updating status:', error);
      alert(error.response?.data?.detail || 'Failed to update status');
    }
  };

  const handleActivate = async () => {
    try {
      await axios.post(`${API}/api/playbook-engine/plans/${planId}/activate`);
      loadPlan();
      onRefresh();
    } catch (error) {
      console.error('Error activating plan:', error);
      alert(error.response?.data?.detail || 'Failed to activate plan');
    }
  };

  if (loading || !plan) {
    return (
      <div className="flex-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[plan.status] || STATUS_CONFIG.draft;

  return (
    <div className="space-y-6" data-testid="plan-detail">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-heading">{plan.name}</h2>
          <p className="text-caption mt-1">{plan.description}</p>
        </div>
        <div className="flex gap-2">
          {plan.status === 'draft' && (
            <Button onClick={handleActivate} className="gap-2">
              <Play className="w-4 h-4" />
              Activate Plan
            </Button>
          )}
          {plan.status === 'active' && (
            <Button variant="outline" onClick={() => handleStatusChange('paused')}>
              <Pause className="w-4 h-4 mr-1" />
              Pause
            </Button>
          )}
          {plan.status === 'paused' && (
            <Button onClick={() => handleStatusChange('active')}>
              <Play className="w-4 h-4 mr-1" />
              Resume
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExportPlan('json')}
            className="ml-2"
          >
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Progress & Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="labyrinth-card">
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold" style={{ color: statusConfig.color }}>
              {plan.progress_percent}%
            </div>
            <div className="text-caption mt-1">Overall Progress</div>
            <Progress value={plan.progress_percent} className="h-2 mt-2" />
          </CardContent>
        </Card>
        <Card className="labyrinth-card">
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold">{plan.milestones?.length || 0}</div>
            <div className="text-caption mt-1">Milestones</div>
            <div className="text-micro mt-1">
              {plan.milestones?.filter(m => m.status === 'COMPLETED').length || 0} completed
            </div>
          </CardContent>
        </Card>
        <Card className="labyrinth-card">
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold">{plan.tasks?.length || 0}</div>
            <div className="text-caption mt-1">Tasks</div>
            <div className="text-micro mt-1">
              {plan.tasks?.filter(t => t.status === 'completed').length || 0} completed
            </div>
          </CardContent>
        </Card>
        <Card className="labyrinth-card">
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold" style={{ color: 'var(--function-finance)' }}>
              ${plan.estimated_budget?.toLocaleString() || 0}
            </div>
            <div className="text-caption mt-1">Budget</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="gantt">
            <BarChart3 className="w-4 h-4 mr-1" />
            Gantt
          </TabsTrigger>
          <TabsTrigger value="milestones">Milestones ({plan.milestones?.length})</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({plan.tasks?.length})</TabsTrigger>
          <TabsTrigger value="roles">Team ({plan.roles?.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* Timeline */}
          <Card className="labyrinth-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-body font-medium">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-micro">Start Date</div>
                  <div className="text-body font-medium">
                    {new Date(plan.start_date).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex-1 mx-4">
                  <Progress 
                    value={plan.progress_percent} 
                    className="h-3"
                  />
                </div>
                <div className="text-right">
                  <div className="text-micro">Target End</div>
                  <div className="text-body font-medium">
                    {plan.target_end_date ? new Date(plan.target_end_date).toLocaleDateString() : 'TBD'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Phases */}
          <Card className="labyrinth-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-body font-medium">Execution Phases</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 flex-wrap">
                {plan.phases?.map((phase, i) => (
                  <Badge 
                    key={phase}
                    style={{ 
                      backgroundColor: `${PHASE_COLORS[phase]}15`,
                      color: PHASE_COLORS[phase],
                      border: `1px solid ${PHASE_COLORS[phase]}30`
                    }}
                  >
                    {i + 1}. {phase}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Contracts & Channels */}
          <div className="grid grid-cols-2 gap-4">
            {plan.contracts?.length > 0 && (
              <Card className="labyrinth-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-body font-medium">Contracts</CardTitle>
                </CardHeader>
                <CardContent>
                  {plan.contracts.map((contract) => (
                    <div key={contract.id} className="p-2 bg-muted/50 rounded-lg">
                      <div className="font-medium">{contract.name}</div>
                      <div className="text-caption">{contract.client_name}</div>
                      <div className="text-body mt-1" style={{ color: 'var(--function-finance)' }}>
                        ${contract.estimated_value?.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
            {plan.communication_channels?.length > 0 && (
              <Card className="labyrinth-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-body font-medium">Communication</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {plan.communication_channels.map((channel) => (
                    <div key={channel.id} className="p-2 bg-muted/50 rounded-lg">
                      <div className="font-medium">{channel.name}</div>
                      <div className="text-caption">{channel.purpose}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="gantt" className="mt-4">
          <GanttChart plan={plan} />
        </TabsContent>

        <TabsContent value="milestones" className="mt-4">
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {plan.milestones?.map((milestone, i) => (
                <Card key={milestone.id} className="labyrinth-card">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                          style={{ backgroundColor: PHASE_COLORS[milestone.phase] }}
                        >
                          {i + 1}
                        </div>
                        <div>
                          <div className="font-medium">{milestone.name}</div>
                          <div className="text-caption">{milestone.description}</div>
                          <div className="flex items-center gap-4 mt-2 text-micro">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Due: {new Date(milestone.due_date).toLocaleDateString()}
                            </span>
                            <Badge variant="outline">{milestone.phase}</Badge>
                          </div>
                        </div>
                      </div>
                      <Badge 
                        variant={milestone.status === 'COMPLETED' ? 'default' : 'outline'}
                      >
                        {milestone.status}
                      </Badge>
                    </div>
                    {milestone.deliverables?.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="text-micro mb-1">Deliverables:</div>
                        <div className="flex flex-wrap gap-1">
                          {milestone.deliverables.map((d, j) => (
                            <Badge key={j} variant="secondary" className="text-xs">
                              {d}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="tasks" className="mt-4">
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {plan.tasks?.map((task) => (
                <div 
                  key={task.id} 
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <input 
                      type="checkbox" 
                      checked={task.status === 'completed'}
                      className="w-4 h-4"
                      readOnly
                    />
                    <div>
                      <div className={`text-body ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                        {task.title}
                      </div>
                      <div className="text-micro">{task.estimated_hours}h estimated</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={task.priority === 'HIGH' || task.priority === 'URGENT' ? 'destructive' : 'outline'}
                      className="text-xs"
                    >
                      {task.priority}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {task.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="roles" className="mt-4">
          <div className="grid grid-cols-2 gap-4">
            {plan.roles?.map((role) => (
              <Card key={role.id} className="labyrinth-card">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-medium">{role.title}</div>
                      <Badge variant="outline" className="text-xs mt-1">
                        {role.role_type}
                      </Badge>
                      <div className="text-micro mt-1">{role.time_commitment}</div>
                      {role.responsibilities?.length > 0 && (
                        <div className="mt-2">
                          <div className="text-micro mb-1">Responsibilities:</div>
                          <ul className="text-caption list-disc list-inside">
                            {role.responsibilities.slice(0, 3).map((r, i) => (
                              <li key={i}>{r}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ==================== MAIN PLAYBOOK ENGINE COMPONENT ====================

const PlaybookEngine = () => {
  const [plans, setPlans] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [newStrategy, setNewStrategy] = useState({
    issue_category: 'CLIENT_SERVICES',
    issue_type_id: 'gold',
    issue_name: '',
    sprint_timeline: 'TWO_THREE_WEEKS',
    tier: 'TIER_2',
    client_name: '',
    description: '',
    priority: 'MEDIUM',
    budget: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [plansRes, analyticsRes] = await Promise.all([
        axios.get(`${API}/api/playbook-engine/plans`),
        axios.get(`${API}/api/playbook-engine/analytics/summary`)
      ]);
      setPlans(plansRes.data);
      setAnalytics(analyticsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  const handleGeneratePlan = async () => {
    try {
      const strategyData = {
        ...newStrategy,
        issue_name: newStrategy.issue_name || `${newStrategy.issue_type_id} - ${newStrategy.issue_category}`,
        budget: newStrategy.budget ? parseFloat(newStrategy.budget) : null
      };
      
      const res = await axios.post(`${API}/api/playbook-engine/generate`, strategyData);
      setShowCreateDialog(false);
      setNewStrategy({
        issue_category: 'CLIENT_SERVICES',
        issue_type_id: 'gold',
        issue_name: '',
        sprint_timeline: 'TWO_THREE_WEEKS',
        tier: 'TIER_2',
        client_name: '',
        description: '',
        priority: 'MEDIUM',
        budget: ''
      });
      loadData();
      setSelectedPlan(res.data.id);
    } catch (error) {
      console.error('Error generating plan:', error);
      alert(error.response?.data?.detail || 'Failed to generate plan');
    }
  };

  const filteredPlans = statusFilter === 'all'
    ? plans
    : plans.filter(p => p.status === statusFilter);

  if (loading) {
    return (
      <div className="flex-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="playbook-engine">
      {/* Analytics Header */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="labyrinth-card">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-caption">Total Plans</p>
                <p className="text-heading mt-1">{analytics?.total_plans || 0}</p>
              </div>
              <Zap className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="labyrinth-card">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-caption">Active</p>
                <p className="text-heading mt-1" style={{ color: '#22C55E' }}>
                  {analytics?.active_plans || 0}
                </p>
              </div>
              <Play className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="labyrinth-card">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-caption">Milestones</p>
                <p className="text-heading mt-1">{analytics?.total_milestones || 0}</p>
              </div>
              <Milestone className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="labyrinth-card">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-caption">Tasks</p>
                <p className="text-heading mt-1">{analytics?.total_tasks || 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="labyrinth-card">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-caption">Total Budget</p>
                <p className="text-heading mt-1" style={{ color: 'var(--function-finance)' }}>
                  ${analytics?.total_budget?.toLocaleString() || 0}
                </p>
              </div>
              <DollarSign className="w-8 h-8" style={{ color: 'var(--function-finance)' }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="flex gap-6">
        {/* Plans List */}
        <div className={`space-y-4 ${selectedPlan ? 'w-1/3' : 'w-full'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-heading">Execution Plans</h2>
              <p className="text-caption mt-1">{filteredPlans.length} plans</p>
            </div>
            <Button 
              onClick={() => setShowCreateDialog(true)} 
              className="gap-2"
              data-testid="new-plan-btn"
            >
              <Plus className="w-4 h-4" />
              New Plan
            </Button>
          </div>
          
          {/* Status Filter */}
          <div className="flex gap-2 flex-wrap">
            {['all', 'draft', 'active', 'paused', 'completed'].map((status) => (
              <Badge
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setStatusFilter(status)}
              >
                {status === 'all' ? 'All' : STATUS_CONFIG[status]?.label || status}
              </Badge>
            ))}
          </div>

          <ScrollArea className={selectedPlan ? 'h-[60vh]' : 'h-auto'}>
            <div className={`grid gap-4 ${selectedPlan ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
              {filteredPlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  onSelect={(p) => setSelectedPlan(p.id)}
                />
              ))}
              {filteredPlans.length === 0 && (
                <div className="col-span-full empty-state">
                  <Zap className="empty-state__icon" />
                  <div className="empty-state__title">No execution plans</div>
                  <div className="empty-state__description">
                    Generate your first execution plan from a strategy
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Detail Panel */}
        {selectedPlan && (
          <div className="w-2/3 border-l pl-6 animate-slide-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-subheading">Plan Details</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedPlan(null)}
                data-testid="close-detail-btn"
              >
                Close
              </Button>
            </div>
            <PlanDetail
              planId={selectedPlan}
              onClose={() => setSelectedPlan(null)}
              onRefresh={loadData}
            />
          </div>
        )}
      </div>

      {/* Create Plan Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate Execution Plan</DialogTitle>
            <DialogDescription>Enter strategy inputs to generate a complete execution plan</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select 
                  value={newStrategy.issue_category} 
                  onValueChange={(v) => setNewStrategy({...newStrategy, issue_category: v})}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLIENT_SERVICES">Client Services</SelectItem>
                    <SelectItem value="OPERATIONS">Operations</SelectItem>
                    <SelectItem value="CONSULTATION">Consultation</SelectItem>
                    <SelectItem value="CRISIS_MANAGEMENT">Crisis Management</SelectItem>
                    <SelectItem value="APP_DEVELOPMENT">App Development</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Issue Type</Label>
                <Select 
                  value={newStrategy.issue_type_id} 
                  onValueChange={(v) => setNewStrategy({...newStrategy, issue_type_id: v})}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bronze">Bronze Package</SelectItem>
                    <SelectItem value="silver">Silver Package</SelectItem>
                    <SelectItem value="gold">Gold Package</SelectItem>
                    <SelectItem value="platinum">Platinum Package</SelectItem>
                    <SelectItem value="default">Default</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Plan Name</Label>
              <Input
                value={newStrategy.issue_name}
                onChange={(e) => setNewStrategy({...newStrategy, issue_name: e.target.value})}
                placeholder="e.g., Gold Package - Enterprise Client"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Timeline</Label>
                <Select 
                  value={newStrategy.sprint_timeline} 
                  onValueChange={(v) => setNewStrategy({...newStrategy, sprint_timeline: v})}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YESTERDAY">Urgent (1 day)</SelectItem>
                    <SelectItem value="THREE_DAYS">3 Days</SelectItem>
                    <SelectItem value="ONE_WEEK">1 Week</SelectItem>
                    <SelectItem value="TWO_THREE_WEEKS">2-3 Weeks</SelectItem>
                    <SelectItem value="FOUR_SIX_WEEKS">4-6 Weeks</SelectItem>
                    <SelectItem value="SIX_PLUS_WEEKS">6+ Weeks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Resource Tier</Label>
                <Select 
                  value={newStrategy.tier} 
                  onValueChange={(v) => setNewStrategy({...newStrategy, tier: v})}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TIER_1">Tier 1 (Premium)</SelectItem>
                    <SelectItem value="TIER_2">Tier 2 (Standard)</SelectItem>
                    <SelectItem value="TIER_3">Tier 3 (Basic)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client Name</Label>
                <Input
                  value={newStrategy.client_name}
                  onChange={(e) => setNewStrategy({...newStrategy, client_name: e.target.value})}
                  placeholder="Client company name"
                />
              </div>
              <div className="space-y-2">
                <Label>Budget ($)</Label>
                <Input
                  type="number"
                  value={newStrategy.budget}
                  onChange={(e) => setNewStrategy({...newStrategy, budget: e.target.value})}
                  placeholder="Optional"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newStrategy.description}
                onChange={(e) => setNewStrategy({...newStrategy, description: e.target.value})}
                placeholder="Brief description of the engagement..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleGeneratePlan}>
              Generate Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlaybookEngine;
