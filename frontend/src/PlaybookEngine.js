import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from './components/ui/dropdown-menu';
import {
  Play, Pause, CheckCircle, Clock, Users, FileText, Target,
  Plus, RefreshCw, Calendar, DollarSign, ArrowRight, Zap,
  AlertTriangle, TrendingUp, Milestone, BarChart3, Download, ChevronDown,
  UserPlus, User
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
  const [users, setUsers] = useState([]);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [assigning, setAssigning] = useState(false);
  // Bulk operations state
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [showBulkAssignDialog, setShowBulkAssignDialog] = useState(false);
  const [bulkAssignee, setBulkAssignee] = useState('');
  const [bulkOperating, setBulkOperating] = useState(false);
  // Filter state
  const [statusFilter, setStatusFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');

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

  const loadUsers = async () => {
    try {
      const res = await axios.get(`${API}/api/roles/users`);
      setUsers(res.data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  useEffect(() => {
    loadPlan();
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]);

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

  const openAssignDialog = (task) => {
    setSelectedTask(task);
    setSelectedAssignee(task.assignee_id || '');
    setShowAssignDialog(true);
  };

  const handleAssignTask = async () => {
    if (!selectedTask || !selectedAssignee) return;
    
    setAssigning(true);
    try {
      const user = users.find(u => u.id === selectedAssignee);
      const assigneeName = user ? user.name : selectedAssignee;
      
      await axios.patch(
        `${API}/api/playbook-engine/plans/${planId}/tasks/${selectedTask.id}/assign?assignee_id=${selectedAssignee}&assignee_name=${encodeURIComponent(assigneeName)}`
      );
      
      setShowAssignDialog(false);
      setSelectedTask(null);
      setSelectedAssignee('');
      loadPlan();
    } catch (error) {
      console.error('Error assigning task:', error);
      alert(error.response?.data?.detail || 'Failed to assign task');
    }
    setAssigning(false);
  };

  const handleTaskStatusChange = async (taskId, newStatus) => {
    try {
      await axios.patch(
        `${API}/api/playbook-engine/plans/${planId}/tasks/${taskId}?status=${newStatus}`
      );
      loadPlan();
      onRefresh();
    } catch (error) {
      console.error('Error updating task status:', error);
      alert(error.response?.data?.detail || 'Failed to update task status');
    }
  };

  // Bulk operations handlers
  const toggleTaskSelection = (taskId) => {
    setSelectedTaskIds(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  // Filter tasks based on status and assignee
  const getFilteredTasks = () => {
    if (!plan?.tasks) return [];
    
    return plan.tasks.filter(task => {
      // Status filter
      if (statusFilter !== 'all' && task.status !== statusFilter) {
        return false;
      }
      // Assignee filter
      if (assigneeFilter === 'unassigned' && task.assignee_id) {
        return false;
      }
      if (assigneeFilter !== 'all' && assigneeFilter !== 'unassigned' && task.assignee_id !== assigneeFilter) {
        return false;
      }
      return true;
    });
  };

  const filteredTasks = getFilteredTasks();

  // Get unique assignees from tasks for the filter dropdown
  const getTaskAssignees = () => {
    if (!plan?.tasks) return [];
    const assignees = new Map();
    plan.tasks.forEach(task => {
      if (task.assignee_id && task.assignee_name) {
        assignees.set(task.assignee_id, task.assignee_name);
      }
    });
    return Array.from(assignees, ([id, name]) => ({ id, name }));
  };

  const selectAllTasks = () => {
    const filteredIds = filteredTasks.map(t => t.id);
    if (selectedTaskIds.length === filteredIds.length && filteredIds.every(id => selectedTaskIds.includes(id))) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(filteredIds);
    }
  };

  const handleBulkStatusChange = async (status) => {
    if (selectedTaskIds.length === 0) return;
    
    setBulkOperating(true);
    try {
      await axios.patch(
        `${API}/api/playbook-engine/plans/${planId}/tasks/bulk-status?task_ids=${selectedTaskIds.join(',')}&status=${status}`
      );
      setSelectedTaskIds([]);
      loadPlan();
      onRefresh();
    } catch (error) {
      console.error('Error bulk updating tasks:', error);
      alert(error.response?.data?.detail || 'Failed to update tasks');
    }
    setBulkOperating(false);
  };

  const handleBulkAssign = async () => {
    if (selectedTaskIds.length === 0 || !bulkAssignee) return;
    
    setBulkOperating(true);
    try {
      const user = users.find(u => u.id === bulkAssignee);
      const assigneeName = user ? user.name : bulkAssignee;
      
      await axios.patch(
        `${API}/api/playbook-engine/plans/${planId}/tasks/bulk-assign?task_ids=${selectedTaskIds.join(',')}&assignee_id=${bulkAssignee}&assignee_name=${encodeURIComponent(assigneeName)}`
      );
      setSelectedTaskIds([]);
      setShowBulkAssignDialog(false);
      setBulkAssignee('');
      loadPlan();
      onRefresh();
    } catch (error) {
      console.error('Error bulk assigning tasks:', error);
      alert(error.response?.data?.detail || 'Failed to assign tasks');
    }
    setBulkOperating(false);
  };

  const handleExportPlan = async (format = 'json') => {
    try {
      if (format === 'pdf') {
        // Generate PDF
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        
        // Title
        doc.setFontSize(20);
        doc.setTextColor(59, 130, 246);
        doc.text(plan.name, 14, 20);
        
        // Subtitle
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Status: ${plan.status?.toUpperCase()} | Budget: $${(plan.estimated_budget || 0).toLocaleString()}`, 14, 28);
        doc.text(`Timeline: ${new Date(plan.start_date).toLocaleDateString()} - ${new Date(plan.target_end_date).toLocaleDateString()}`, 14, 34);
        
        // Description
        if (plan.description) {
          doc.setFontSize(10);
          doc.setTextColor(60);
          const splitDesc = doc.splitTextToSize(plan.description, pageWidth - 28);
          doc.text(splitDesc, 14, 44);
        }
        
        // Milestones Table
        doc.setFontSize(14);
        doc.setTextColor(0);
        doc.text('Milestones', 14, 60);
        
        const milestoneData = plan.milestones?.map(m => [
          m.name,
          m.phase,
          m.status,
          new Date(m.due_date).toLocaleDateString()
        ]) || [];
        
        doc.autoTable({
          startY: 65,
          head: [['Milestone', 'Phase', 'Status', 'Due Date']],
          body: milestoneData,
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246] },
          margin: { left: 14 }
        });
        
        // Tasks Table
        const tasksStartY = doc.lastAutoTable.finalY + 15;
        doc.setFontSize(14);
        doc.text('Tasks', 14, tasksStartY);
        
        const taskData = plan.tasks?.map(t => [
          t.title,
          t.phase,
          t.priority,
          t.status,
          `${t.estimated_hours || 0}h`
        ]) || [];
        
        doc.autoTable({
          startY: tasksStartY + 5,
          head: [['Task', 'Phase', 'Priority', 'Status', 'Hours']],
          body: taskData,
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246] },
          margin: { left: 14 }
        });
        
        // Team Table
        const teamStartY = doc.lastAutoTable.finalY + 15;
        doc.setFontSize(14);
        doc.text('Team Roles', 14, teamStartY);
        
        const roleData = plan.roles?.map(r => [
          r.title,
          r.role_type,
          r.time_commitment || 'TBD'
        ]) || [];
        
        doc.autoTable({
          startY: teamStartY + 5,
          head: [['Role', 'Type', 'Commitment']],
          body: roleData,
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246] },
          margin: { left: 14 }
        });
        
        // Footer
        const footerY = doc.internal.pageSize.getHeight() - 10;
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Exported from Labyrinth OS on ${new Date().toLocaleString()}`, 14, footerY);
        
        // Save
        doc.save(`${plan.name.replace(/\s+/g, '_')}_plan.pdf`);
        return;
      }
      
      // Create export data for JSON/CSV
      const exportData = {
        plan: {
          id: plan.id,
          name: plan.name,
          description: plan.description,
          status: plan.status,
          progress_percent: plan.progress_percent,
          estimated_budget: plan.estimated_budget,
          start_date: plan.start_date,
          target_end_date: plan.target_end_date,
        },
        milestones: plan.milestones?.map(m => ({
          name: m.name,
          phase: m.phase,
          status: m.status,
          due_date: m.due_date,
          deliverables: m.deliverables
        })),
        tasks: plan.tasks?.map(t => ({
          title: t.title,
          phase: t.phase,
          status: t.status,
          priority: t.priority,
          estimated_hours: t.estimated_hours
        })),
        roles: plan.roles?.map(r => ({
          title: r.title,
          role_type: r.role_type,
          responsibilities: r.responsibilities
        })),
        exported_at: new Date().toISOString()
      };

      if (format === 'json') {
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${plan.name.replace(/\s+/g, '_')}_export.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (format === 'csv') {
        const csvHeaders = ['Task', 'Phase', 'Status', 'Priority', 'Hours'];
        const csvRows = plan.tasks?.map(t => 
          [t.title, t.phase, t.status, t.priority, t.estimated_hours].join(',')
        ) || [];
        const csvContent = [csvHeaders.join(','), ...csvRows].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${plan.name.replace(/\s+/g, '_')}_tasks.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting plan:', error);
      alert('Failed to export plan');
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="ml-2">
                <Download className="w-4 h-4 mr-1" />
                Export
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExportPlan('pdf')}>
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportPlan('json')}>
                Export as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportPlan('csv')}>
                Export Tasks as CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
          {/* Bulk Operations Toolbar */}
          {selectedTaskIds.length > 0 && (
            <div className="flex items-center gap-3 p-3 mb-3 bg-primary/10 border border-primary/20 rounded-lg" data-testid="bulk-toolbar">
              <span className="text-sm font-medium">
                {selectedTaskIds.length} task{selectedTaskIds.length > 1 ? 's' : ''} selected
              </span>
              <div className="flex-1" />
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkStatusChange('completed')}
                disabled={bulkOperating}
                data-testid="bulk-complete-btn"
              >
                <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                Mark Complete
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkStatusChange('in_progress')}
                disabled={bulkOperating}
                data-testid="bulk-progress-btn"
              >
                <Play className="w-3 h-3 mr-1 text-blue-500" />
                In Progress
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkAssignDialog(true)}
                disabled={bulkOperating}
                data-testid="bulk-assign-btn"
              >
                <UserPlus className="w-3 h-3 mr-1" />
                Assign All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTaskIds([])}
                data-testid="bulk-clear-btn"
              >
                Clear
              </Button>
            </div>
          )}

          <ScrollArea className="h-[350px]">
            {/* Select All Header */}
            <div className="flex items-center gap-3 p-2 mb-2 border-b">
              <input 
                type="checkbox" 
                checked={selectedTaskIds.length === plan?.tasks?.length && plan?.tasks?.length > 0}
                onChange={selectAllTasks}
                className="w-4 h-4 cursor-pointer"
                data-testid="select-all-tasks"
              />
              <span className="text-sm text-muted-foreground">
                {selectedTaskIds.length === plan?.tasks?.length && plan?.tasks?.length > 0 
                  ? 'Deselect All' 
                  : 'Select All'} ({plan?.tasks?.length || 0} tasks)
              </span>
            </div>

            <div className="space-y-2">
              {plan.tasks?.map((task) => (
                <div 
                  key={task.id} 
                  className={`flex items-center justify-between p-3 rounded-lg hover:bg-muted/70 transition-colors ${
                    selectedTaskIds.includes(task.id) ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50'
                  }`}
                  data-testid={`task-item-${task.id}`}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <input 
                      type="checkbox" 
                      checked={selectedTaskIds.includes(task.id)}
                      onChange={() => toggleTaskSelection(task.id)}
                      className="w-4 h-4 cursor-pointer"
                      data-testid={`task-select-${task.id}`}
                    />
                    <input 
                      type="checkbox" 
                      checked={task.status === 'completed'}
                      className="w-4 h-4 cursor-pointer accent-green-500"
                      onChange={(e) => handleTaskStatusChange(task.id, e.target.checked ? 'completed' : 'pending')}
                      data-testid={`task-checkbox-${task.id}`}
                    />
                    <div className="flex-1">
                      <div className={`text-body ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                        {task.title}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-micro">{task.estimated_hours}h estimated</span>
                        {task.assignee_name && (
                          <span className="text-micro flex items-center gap-1 text-primary">
                            <User className="w-3 h-3" />
                            {task.assignee_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => openAssignDialog(task)}
                      data-testid={`assign-task-${task.id}`}
                    >
                      <UserPlus className="w-3 h-3 mr-1" />
                      {task.assignee_id ? 'Reassign' : 'Assign'}
                    </Button>
                    <Badge 
                      variant={task.priority === 'HIGH' || task.priority === 'URGENT' ? 'destructive' : 'outline'}
                      className="text-xs"
                    >
                      {task.priority}
                    </Badge>
                    <Select 
                      value={task.status} 
                      onValueChange={(value) => handleTaskStatusChange(task.id, value)}
                    >
                      <SelectTrigger className="w-[120px] h-7 text-xs" data-testid={`task-status-${task.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            Pending
                          </span>
                        </SelectItem>
                        <SelectItem value="in_progress">
                          <span className="flex items-center gap-1">
                            <Play className="w-3 h-3 text-blue-500" />
                            In Progress
                          </span>
                        </SelectItem>
                        <SelectItem value="completed">
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-green-500" />
                            Completed
                          </span>
                        </SelectItem>
                        <SelectItem value="blocked">
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-red-500" />
                            Blocked
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Task Assignment Dialog */}
          <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Task</DialogTitle>
                <DialogDescription>
                  {selectedTask?.title}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Select Assignee</Label>
                  <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a team member..." />
                    </SelectTrigger>
                    <SelectContent>
                      {users.length > 0 ? (
                        users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              <span>{user.name}</span>
                              <Badge variant="outline" className="text-xs ml-2">
                                {user.role}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-users" disabled>
                          No users available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {users.length === 0 && (
                    <p className="text-micro text-muted-foreground">
                      No team members found. Seed demo users first via POST /api/roles/seed-demo-users
                    </p>
                  )}
                </div>
                {selectedTask?.assignee_name && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="text-micro text-muted-foreground">Currently assigned to:</div>
                    <div className="font-medium flex items-center gap-2 mt-1">
                      <User className="w-4 h-4" />
                      {selectedTask.assignee_name}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAssignTask} 
                  disabled={!selectedAssignee || assigning}
                >
                  {assigning ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-1" />
                      Assign Task
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Bulk Assign Dialog */}
          <Dialog open={showBulkAssignDialog} onOpenChange={setShowBulkAssignDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Assign Tasks</DialogTitle>
                <DialogDescription>
                  Assign {selectedTaskIds.length} selected task{selectedTaskIds.length > 1 ? 's' : ''} to a team member
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Select Assignee</Label>
                  <Select value={bulkAssignee} onValueChange={setBulkAssignee}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a team member..." />
                    </SelectTrigger>
                    <SelectContent>
                      {users.length > 0 ? (
                        users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              <span>{user.name}</span>
                              <Badge variant="outline" className="text-xs ml-2">
                                {user.role}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="no-users" disabled>
                          No users available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="text-micro text-muted-foreground mb-2">Tasks to be assigned:</div>
                  <div className="space-y-1 max-h-[150px] overflow-y-auto">
                    {plan?.tasks?.filter(t => selectedTaskIds.includes(t.id)).map(task => (
                      <div key={task.id} className="text-sm flex items-center gap-2">
                        <CheckCircle className="w-3 h-3 text-primary" />
                        {task.title}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowBulkAssignDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleBulkAssign} 
                  disabled={!bulkAssignee || bulkOperating}
                >
                  {bulkOperating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-1" />
                      Assign {selectedTaskIds.length} Tasks
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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

  useEffect(() => {
    const fetchData = async () => {
      await loadData();
    };
    fetchData();
  }, []);  

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
