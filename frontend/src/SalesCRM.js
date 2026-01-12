import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
} from './components/ui/card';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Input } from './components/ui/input';
import { Separator } from './components/ui/separator';
import { Progress } from './components/ui/progress';
import { ScrollArea } from './components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from './components/ui/dialog';
import { Label } from './components/ui/label';
import { Textarea } from './components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from './components/ui/select';
import {
  UserPlus, Phone, CheckCircle, FileText, MessageSquare, Trophy, XCircle, Heart,
  DollarSign, Building, Mail, Globe, Filter, Plus, RefreshCw, TrendingUp,
  ArrowRight, Clock, Tag, User, ChevronRight, BookOpen
} from 'lucide-react';
import SOPSidebar from './SOPSidebar';

const API = process.env.REACT_APP_BACKEND_URL || '';

// Stage configuration
const STAGE_CONFIG = {
  NEW: { label: 'New', color: '#64748B', icon: UserPlus },
  CONTACTED: { label: 'Contacted', color: '#3B82F6', icon: Phone },
  QUALIFIED: { label: 'Qualified', color: '#22C55E', icon: CheckCircle },
  PROPOSAL_SENT: { label: 'Proposal Sent', color: '#F59E0B', icon: FileText },
  NEGOTIATION: { label: 'Negotiation', color: '#8B5CF6', icon: MessageSquare },
  WON: { label: 'Won', color: '#10B981', icon: Trophy },
  LOST: { label: 'Lost', color: '#EF4444', icon: XCircle },
  NURTURING: { label: 'Nurturing', color: '#06B6D4', icon: Heart },
};

const STAGE_FLOW = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON'];

// ==================== LEAD CARD ====================

const LeadCard = ({ lead, onSelect }) => {
  const stageConfig = STAGE_CONFIG[lead.stage] || STAGE_CONFIG.NEW;
  const StageIcon = stageConfig.icon;
  
  return (
    <Card 
      className="labyrinth-card labyrinth-card--interactive cursor-pointer group"
      style={{ borderLeft: `4px solid ${stageConfig.color}` }}
      onClick={() => onSelect(lead)}
      data-testid={`lead-card-${lead.id}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-subheading flex items-center gap-2">
              {lead.name}
              {lead.priority === 'URGENT' && (
                <Badge className="status-badge--overdue text-xs">Urgent</Badge>
              )}
            </CardTitle>
            <CardDescription className="text-caption flex items-center gap-2">
              <Building className="w-3 h-3" />
              {lead.contact?.company || 'No company'}
            </CardDescription>
          </div>
          <Badge 
            className="status-badge"
            style={{ 
              backgroundColor: `${stageConfig.color}10`,
              color: stageConfig.color,
              border: `1px solid ${stageConfig.color}25`
            }}
          >
            <StageIcon className="w-3 h-3 mr-1" />
            {stageConfig.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4 text-caption">
          <span className="flex items-center gap-1">
            <Mail className="w-3 h-3" />
            {lead.contact?.email}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          {lead.estimated_value && (
            <span className="flex items-center gap-1 font-semibold" style={{ color: 'var(--function-finance)' }}>
              <DollarSign className="w-4 h-4" />
              ${lead.estimated_value.toLocaleString()}
            </span>
          )}
          <span className="text-micro flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {lead.conversion_probability}% probability
          </span>
        </div>

        {/* Tags */}
        {lead.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {lead.tags.slice(0, 3).map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {lead.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{lead.tags.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ==================== LEAD DETAIL ====================

const LeadDetail = ({ lead, onClose, onRefresh }) => {
  const [transitioning, setTransitioning] = useState(false);
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const [activityType, setActivityType] = useState('note');
  const [activityDescription, setActivityDescription] = useState('');
  
  if (!lead) return null;
  
  const stageConfig = STAGE_CONFIG[lead.stage] || STAGE_CONFIG.NEW;
  const StageIcon = stageConfig.icon;

  const validTransitions = {
    NEW: ['CONTACTED', 'LOST'],
    CONTACTED: ['QUALIFIED', 'NURTURING', 'LOST'],
    QUALIFIED: ['PROPOSAL_SENT', 'NURTURING', 'LOST'],
    PROPOSAL_SENT: ['NEGOTIATION', 'WON', 'LOST'],
    NEGOTIATION: ['WON', 'LOST', 'PROPOSAL_SENT'],
    WON: [],
    LOST: ['NURTURING'],
    NURTURING: ['CONTACTED', 'LOST']
  };

  const nextStages = validTransitions[lead.stage] || [];

  const handleTransition = async (newStage) => {
    setTransitioning(true);
    try {
      await axios.post(
        `${API}/api/sales/leads/${lead.id}/transition?new_stage=${newStage}&transitioned_by=current_user`
      );
      onRefresh();
    } catch (error) {
      console.error('Transition error:', error);
      alert(error.response?.data?.detail || 'Failed to transition lead');
    }
    setTransitioning(false);
  };

  const handleAddActivity = async () => {
    try {
      await axios.post(
        `${API}/api/sales/leads/${lead.id}/activity?activity_type=${activityType}&description=${encodeURIComponent(activityDescription)}&created_by=current_user`
      );
      setShowActivityDialog(false);
      setActivityDescription('');
      onRefresh();
    } catch (error) {
      console.error('Activity error:', error);
    }
  };

  return (
    <div className="space-y-6" data-testid="lead-detail">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-heading">{lead.name}</h2>
          <p className="text-caption mt-1">{lead.contact?.company}</p>
        </div>
        <Badge 
          className="status-badge px-3 py-1.5"
          style={{ 
            backgroundColor: `${stageConfig.color}10`,
            color: stageConfig.color,
            border: `1px solid ${stageConfig.color}25`
          }}
        >
          <StageIcon className="w-4 h-4 mr-1.5" />
          {stageConfig.label}
        </Badge>
      </div>

      {/* Stage Pipeline */}
      <Card className="labyrinth-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-body font-medium">Sales Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="stage-pipeline flex-wrap justify-center">
            {STAGE_FLOW.map((stage, index) => {
              const config = STAGE_CONFIG[stage];
              const Icon = config.icon;
              const isActive = stage === lead.stage;
              const isPast = STAGE_FLOW.indexOf(lead.stage) > index;
              
              return (
                <React.Fragment key={stage}>
                  <div className={`stage-node ${isPast ? 'stage-node--completed' : ''} ${isActive ? 'stage-node--active' : ''}`}>
                    <div 
                      className="stage-node__icon"
                      style={{ 
                        backgroundColor: isPast || isActive ? config.color : undefined,
                        color: isPast || isActive ? 'white' : undefined
                      }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="stage-node__label">{config.label}</span>
                  </div>
                  {index < STAGE_FLOW.length - 1 && (
                    <div className={`stage-connector ${isPast ? 'stage-connector--completed' : ''}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Contact & Details */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="labyrinth-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-body font-medium">Contact Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-body">{lead.contact?.email}</span>
            </div>
            {lead.contact?.phone && (
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-body">{lead.contact.phone}</span>
              </div>
            )}
            {lead.contact?.position && (
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-body">{lead.contact.position}</span>
              </div>
            )}
            {lead.contact?.website && (
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <span className="text-body">{lead.contact.website}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="labyrinth-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-body font-medium">Deal Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-caption">Estimated Value</span>
              <span className="font-semibold" style={{ color: 'var(--function-finance)' }}>
                ${lead.estimated_value?.toLocaleString() || '—'}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-caption">Probability</span>
              <span className="font-medium">{lead.conversion_probability}%</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-caption">Source</span>
              <Badge variant="outline">{lead.source?.replace('_', ' ')}</Badge>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-caption">Priority</span>
              <Badge 
                variant={lead.priority === 'URGENT' ? 'destructive' : lead.priority === 'HIGH' ? 'default' : 'secondary'}
              >
                {lead.priority}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {lead.notes && (
        <Card className="labyrinth-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-body font-medium">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-caption">{lead.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* SOP Guidance */}
      <Card className="labyrinth-card border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-body font-medium flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            Guidance & SOPs
          </CardTitle>
          <CardDescription className="text-caption">
            Relevant procedures for the {stageConfig.label} stage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SOPSidebar
            stage={lead.stage?.toLowerCase().replace('_', '')}
            dealType="new_business"
            entityType="deal"
            entityId={lead.id}
          />
        </CardContent>
      </Card>

      {/* Activity Log */}
      <Card className="labyrinth-card">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-body font-medium">Activity Log</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowActivityDialog(true)}>
              <Plus className="w-3 h-3 mr-1" />
              Add Activity
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-48">
            {lead.activities?.length > 0 ? (
              <div className="space-y-3">
                {lead.activities.slice().reverse().map((activity, i) => (
                  <div key={i} className="flex gap-3 pb-3 border-b last:border-0">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      {activity.type === 'call' && <Phone className="w-4 h-4" />}
                      {activity.type === 'email' && <Mail className="w-4 h-4" />}
                      {activity.type === 'meeting' && <MessageSquare className="w-4 h-4" />}
                      {activity.type === 'note' && <FileText className="w-4 h-4" />}
                      {activity.type === 'stage_change' && <ArrowRight className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-body">{activity.description}</p>
                      <p className="text-micro mt-1">
                        {new Date(activity.created_at).toLocaleString()} by {activity.created_by}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-caption text-center py-4">No activities yet</p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Actions */}
      {nextStages.length > 0 && (
        <Card className="labyrinth-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-body font-medium">Move to Next Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {nextStages.map((stage) => {
                const config = STAGE_CONFIG[stage];
                const Icon = config.icon;
                return (
                  <Button
                    key={stage}
                    variant="outline"
                    disabled={transitioning}
                    onClick={() => handleTransition(stage)}
                    className="gap-2 transition-all hover:scale-105"
                    style={{ 
                      borderColor: `${config.color}40`,
                      color: config.color
                    }}
                    data-testid={`transition-to-${stage}`}
                  >
                    <Icon className="w-4 h-4" />
                    {config.label}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Activity Dialog */}
      <Dialog open={showActivityDialog} onOpenChange={setShowActivityDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Activity</DialogTitle>
            <DialogDescription>Log an activity for this lead</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Activity Type</Label>
              <Select value={activityType} onValueChange={setActivityType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Phone Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="note">Note</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={activityDescription}
                onChange={(e) => setActivityDescription(e.target.value)}
                placeholder="Describe the activity..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActivityDialog(false)}>Cancel</Button>
            <Button onClick={handleAddActivity} disabled={!activityDescription}>Save Activity</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ==================== MAIN SALES CRM COMPONENT ====================

const SalesCRM = () => {
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [stageFilter, setStageFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  // Create lead form state
  const [newLead, setNewLead] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    position: '',
    source: 'OTHER',
    priority: 'MEDIUM',
    estimated_value: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [leadsRes, statsRes] = await Promise.all([
        axios.get(`${API}/api/sales/leads`),
        axios.get(`${API}/api/sales/stats`)
      ]);
      setLeads(leadsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error loading sales data:', error);
    }
    setLoading(false);
  };

  const handleCreateLead = async () => {
    try {
      await axios.post(`${API}/api/sales/leads`, {
        name: newLead.name,
        contact: {
          email: newLead.email,
          phone: newLead.phone || null,
          company: newLead.company || null,
          position: newLead.position || null
        },
        source: newLead.source,
        priority: newLead.priority,
        estimated_value: newLead.estimated_value ? parseFloat(newLead.estimated_value) : null,
        notes: newLead.notes || null,
        tags: []
      });
      setShowCreateDialog(false);
      setNewLead({
        name: '', email: '', phone: '', company: '', position: '',
        source: 'OTHER', priority: 'MEDIUM', estimated_value: '', notes: ''
      });
      loadData();
    } catch (error) {
      console.error('Error creating lead:', error);
      alert(error.response?.data?.detail || 'Failed to create lead');
    }
  };

  const filteredLeads = stageFilter === 'all' 
    ? leads 
    : leads.filter(l => l.stage === stageFilter);

  if (loading) {
    return (
      <div className="flex-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="sales-crm">
      {/* Stats Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {Object.entries(STAGE_CONFIG).map(([stage, config]) => {
          const Icon = config.icon;
          const count = stats?.leads_by_stage?.[stage] || 0;
          const isSelected = stageFilter === stage;
          return (
            <Card 
              key={stage}
              className={`labyrinth-card cursor-pointer transition-all ${
                isSelected ? 'ring-2 ring-offset-2' : 'hover:shadow-md'
              }`}
              style={{ 
                borderTop: `3px solid ${config.color}`,
                ringColor: config.color,
                background: isSelected ? `${config.color}08` : 'white'
              }}
              onClick={() => setStageFilter(stageFilter === stage ? 'all' : stage)}
              data-testid={`stage-filter-${stage}`}
            >
              <CardContent className="pt-4 pb-3 text-center metric-card">
                <div 
                  className="w-8 h-8 mx-auto mb-2 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${config.color}12` }}
                >
                  <Icon className="w-4 h-4" style={{ color: config.color }} />
                </div>
                <div className="metric-card__value">{count}</div>
                <div className="text-micro mt-1">{config.label}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="labyrinth-card">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-caption">Pipeline Value</p>
                <p className="text-heading mt-1" style={{ color: 'var(--function-finance)' }}>
                  ${stats?.total_pipeline_value?.toLocaleString() || 0}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="labyrinth-card">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-caption">Conversion Rate</p>
                <p className="text-heading mt-1">{stats?.conversion_rate || 0}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="labyrinth-card">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-caption">Avg Deal Size</p>
                <p className="text-heading mt-1">${stats?.avg_deal_size?.toLocaleString() || 0}</p>
              </div>
              <FileText className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="labyrinth-card">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-caption">Proposals Sent</p>
                <p className="text-heading mt-1">{stats?.proposals_sent || 0}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="flex gap-6">
        {/* Lead List */}
        <div className={`space-y-4 ${selectedLead ? 'w-1/3' : 'w-full'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-heading">
                {stageFilter === 'all' ? 'All Leads' : STAGE_CONFIG[stageFilter]?.label}
              </h2>
              <p className="text-caption mt-1">
                {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Button 
              onClick={() => setShowCreateDialog(true)} 
              className="gap-2"
              data-testid="new-lead-btn"
            >
              <Plus className="w-4 h-4" />
              New Lead
            </Button>
          </div>
          
          <ScrollArea className={selectedLead ? 'h-[60vh]' : 'h-auto'}>
            <div className={`grid gap-4 ${selectedLead ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
              {filteredLeads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onSelect={setSelectedLead}
                />
              ))}
              {filteredLeads.length === 0 && (
                <div className="col-span-full empty-state">
                  <UserPlus className="empty-state__icon" />
                  <div className="empty-state__title">No leads found</div>
                  <div className="empty-state__description">
                    {stageFilter !== 'all' 
                      ? `No leads in ${STAGE_CONFIG[stageFilter]?.label} stage`
                      : 'Create your first lead to get started'
                    }
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Detail Panel */}
        {selectedLead && (
          <div className="w-2/3 border-l pl-6 animate-slide-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-subheading">Lead Details</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedLead(null)}
                data-testid="close-detail-btn"
              >
                Close
              </Button>
            </div>
            <LeadDetail
              lead={selectedLead}
              onClose={() => setSelectedLead(null)}
              onRefresh={() => {
                loadData();
                axios.get(`${API}/api/sales/leads/${selectedLead.id}`)
                  .then(res => setSelectedLead(res.data))
                  .catch(() => setSelectedLead(null));
              }}
            />
          </div>
        )}
      </div>

      {/* Create Lead Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Lead</DialogTitle>
            <DialogDescription>Enter the lead's information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={newLead.name}
                  onChange={(e) => setNewLead({...newLead, name: e.target.value})}
                  placeholder="Contact name"
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={newLead.email}
                  onChange={(e) => setNewLead({...newLead, email: e.target.value})}
                  placeholder="email@company.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company</Label>
                <Input
                  value={newLead.company}
                  onChange={(e) => setNewLead({...newLead, company: e.target.value})}
                  placeholder="Company name"
                />
              </div>
              <div className="space-y-2">
                <Label>Position</Label>
                <Input
                  value={newLead.position}
                  onChange={(e) => setNewLead({...newLead, position: e.target.value})}
                  placeholder="Job title"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Source</Label>
                <Select value={newLead.source} onValueChange={(v) => setNewLead({...newLead, source: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WEBSITE">Website</SelectItem>
                    <SelectItem value="REFERRAL">Referral</SelectItem>
                    <SelectItem value="COLD_OUTREACH">Cold Outreach</SelectItem>
                    <SelectItem value="SOCIAL_MEDIA">Social Media</SelectItem>
                    <SelectItem value="EVENT">Event</SelectItem>
                    <SelectItem value="PARTNER">Partner</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={newLead.priority} onValueChange={(v) => setNewLead({...newLead, priority: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Estimated Value ($)</Label>
              <Input
                type="number"
                value={newLead.estimated_value}
                onChange={(e) => setNewLead({...newLead, estimated_value: e.target.value})}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={newLead.notes}
                onChange={(e) => setNewLead({...newLead, notes: e.target.value})}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleCreateLead} 
              disabled={!newLead.name || !newLead.email}
            >
              Create Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesCRM;
