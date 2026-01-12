import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileText, Play, Pause, CheckCircle, Clock, Archive, Send,
  Plus, ChevronRight, AlertTriangle, ArrowRight, RefreshCw,
  Users, DollarSign, Calendar, MessageSquare, BookOpen, Lock
} from 'lucide-react';
import SOPSidebar from './SOPSidebar';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Stage configuration - Full workflow: Strategy → SOW → Bids/Proposals → Contracts → Milestones → Execution
const STAGE_CONFIG = {
  STRATEGY: { color: '#8B5CF6', icon: FileText, label: 'Strategy' },
  SOW: { color: '#6366F1', icon: FileText, label: 'Scope of Work' },
  PROPOSAL: { color: '#64748B', icon: FileText, label: 'Proposal' },
  BID_SUBMITTED: { color: '#F59E0B', icon: Send, label: 'Bid Submitted' },
  BID_APPROVED: { color: '#10B981', icon: CheckCircle, label: 'Bid Approved' },
  CONTRACT: { color: '#0EA5E9', icon: FileCheck, label: 'Contract' },
  INACTIVE: { color: '#6B7280', icon: Pause, label: 'Inactive' },
  QUEUED: { color: '#3B82F6', icon: Clock, label: 'In Queue' },
  ACTIVE: { color: '#22C55E', icon: Play, label: 'Milestones' },
  EXECUTION: { color: '#14B8A6', icon: Play, label: 'Execution' },
  PAUSED: { color: '#EAB308', icon: Pause, label: 'Paused' },
  COMPLETED: { color: '#8B5CF6', icon: CheckCircle, label: 'Completed' },
  CLOSED: { color: '#1F2937', icon: Archive, label: 'Closed' },
};

// Stage flow for visual pipeline - Strategy → SOW → Bids/Proposals → Contracts → Milestones → Execution
const STAGE_FLOW = [
  'STRATEGY', 'SOW', 'PROPOSAL', 'BID_SUBMITTED', 'BID_APPROVED', 'CONTRACT', 'INACTIVE', 'QUEUED', 'ACTIVE', 'EXECUTION', 'COMPLETED'
];

// ==================== CONTRACT CARD ====================

const ContractCard = ({ contract, onSelect, onTransition }) => {
  const stageConfig = STAGE_CONFIG[contract.stage] || STAGE_CONFIG.PROPOSAL;
  const StageIcon = stageConfig.icon;
  
  return (
    <Card 
      className="labyrinth-card labyrinth-card--interactive cursor-pointer group"
      style={{ borderLeft: `4px solid ${stageConfig.color}` }}
      onClick={() => onSelect(contract)}
      data-testid={`contract-card-${contract.id}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-subheading">{contract.name}</CardTitle>
            <CardDescription className="text-caption">{contract.client_name}</CardDescription>
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
            <FileText className="w-3 h-3" />
            {contract.contract_type?.replace('_', ' ')}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {contract.function}
          </span>
          {contract.estimated_value && (
            <span className="flex items-center gap-1 font-medium" style={{ color: 'var(--function-finance)' }}>
              <DollarSign className="w-3 h-3" />
              ${contract.estimated_value.toLocaleString()}
            </span>
          )}
        </div>
        
        {/* Stage Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-micro">
            <span>Progress</span>
            <span>{STAGE_FLOW.indexOf(contract.stage) + 1} of {STAGE_FLOW.length}</span>
          </div>
          <Progress 
            value={((STAGE_FLOW.indexOf(contract.stage) + 1) / STAGE_FLOW.length) * 100}
            className="h-1.5"
            style={{ '--progress-color': stageConfig.color }}
          />
        </div>
      </CardContent>
    </Card>
  );
};

// ==================== CONTRACT DETAIL VIEW ====================

const ContractDetail = ({ contract, onClose, onTransition, onRefresh }) => {
  const [transitioning, setTransitioning] = useState(false);
  const [showTransitionDialog, setShowTransitionDialog] = useState(false);
  const [selectedNextStage, setSelectedNextStage] = useState(null);
  const [transitionReason, setTransitionReason] = useState('');
  const [stageGatePassed, setStageGatePassed] = useState(true);
  const [stageGateWarning, setStageGateWarning] = useState(null);
  
  if (!contract) return null;
  
  const stageConfig = STAGE_CONFIG[contract.stage] || STAGE_CONFIG.PROPOSAL;
  const StageIcon = stageConfig.icon;
  
  // Callback for SOPSidebar stage gate status
  const handleStageGateStatus = (passed, details) => {
    setStageGatePassed(passed);
    if (!passed && details) {
      const incompleteSOPs = Object.values(details).filter(s => !s.complete);
      if (incompleteSOPs.length > 0) {
        setStageGateWarning(`${incompleteSOPs.length} SOP checklist(s) incomplete`);
      }
    } else {
      setStageGateWarning(null);
    }
  };
  
  // Get valid next stages
  const validTransitions = {
    PROPOSAL: ['BID_SUBMITTED'],
    BID_SUBMITTED: ['BID_APPROVED', 'PROPOSAL'],
    BID_APPROVED: ['INACTIVE'],
    INACTIVE: ['QUEUED'],
    QUEUED: ['ACTIVE', 'INACTIVE'],
    ACTIVE: ['PAUSED', 'COMPLETED'],
    PAUSED: ['ACTIVE', 'CLOSED'],
    COMPLETED: ['CLOSED'],
    CLOSED: [],
  };
  
  const nextStages = validTransitions[contract.stage] || [];
  
  const handleTransition = async () => {
    if (!selectedNextStage) return;
    
    setTransitioning(true);
    try {
      await axios.post(
        `${API}/lifecycle/contracts/${contract.id}/transition?new_stage=${selectedNextStage}&transitioned_by=current_user&reason=${encodeURIComponent(transitionReason)}`
      );
      setShowTransitionDialog(false);
      setSelectedNextStage(null);
      setTransitionReason('');
      onRefresh();
    } catch (error) {
      console.error('Transition error:', error);
      alert(error.response?.data?.detail || 'Failed to transition contract');
    }
    setTransitioning(false);
  };

  return (
    <div className="space-y-6" data-testid="contract-detail">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-heading">{contract.name}</h2>
          <p className="text-caption mt-1">{contract.client_name}</p>
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

      {/* Stage Pipeline Visual */}
      <Card className="labyrinth-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-body font-medium">Contract Lifecycle</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="stage-pipeline flex-wrap justify-center">
            {STAGE_FLOW.map((stage, index) => {
              const config = STAGE_CONFIG[stage];
              const Icon = config.icon;
              const isActive = stage === contract.stage;
              const isPast = STAGE_FLOW.indexOf(contract.stage) > index;
              
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

      {/* Contract Details */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="labyrinth-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-body font-medium">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-caption">Type</span>
              <span className="text-body">{contract.contract_type?.replace('_', ' ')}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-caption">Function</span>
              <Badge variant="outline" className="function-badge">{contract.function}</Badge>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-caption">Package</span>
              <Badge variant="secondary">{contract.client_package}</Badge>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-caption">Value</span>
              <span className="font-semibold" style={{ color: 'var(--function-finance)' }}>
                ${contract.estimated_value?.toLocaleString() || '—'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="labyrinth-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-body font-medium">Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-caption">Created</span>
              <span className="text-body">{new Date(contract.created_at).toLocaleDateString()}</span>
            </div>
            {contract.activated_date && (
              <>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-caption">Activated</span>
                  <span className="text-body">{new Date(contract.activated_date).toLocaleDateString()}</span>
                </div>
              </>
            )}
            {contract.start_date && (
              <>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-caption">Start Date</span>
                  <span className="text-body">{new Date(contract.start_date).toLocaleDateString()}</span>
                </div>
              </>
            )}
            {contract.end_date && (
              <>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-caption">End Date</span>
                  <span className="text-body">{new Date(contract.end_date).toLocaleDateString()}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {contract.description && (
        <Card className="labyrinth-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-body font-medium">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-caption">{contract.description}</p>
          </CardContent>
        </Card>
      )}

      {/* SOP Guidance Sidebar */}
      <Card className="labyrinth-card border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-body font-medium flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            Guidance & SOPs
            {!stageGatePassed && (
              <Badge variant="destructive" className="text-xs">Incomplete</Badge>
            )}
          </CardTitle>
          <CardDescription className="text-caption">
            Relevant procedures for this stage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SOPSidebar
            stage={contract.stage?.toLowerCase()}
            dealType={contract.contract_type?.toLowerCase().replace('_based', '')}
            entityType="contract"
            entityId={contract.id}
            onStageGateCheck={handleStageGateStatus}
          />
        </CardContent>
      </Card>

      {/* Stage Gate Warning */}
      {stageGateWarning && (
        <Card className="labyrinth-card border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="p-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <div>
              <p className="text-sm font-medium">Stage Gate Warning</p>
              <p className="text-xs text-muted-foreground">{stageGateWarning}. Complete required checklist items before transitioning.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {nextStages.length > 0 && (
        <Card className="labyrinth-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-body font-medium">Actions</CardTitle>
            <CardDescription className="text-caption">Move contract to next stage</CardDescription>
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
                    onClick={() => {
                      setSelectedNextStage(stage);
                      setShowTransitionDialog(true);
                    }}
                    className="gap-2 transition-all hover:scale-105"
                    style={{ 
                      borderColor: `${config.color}40`,
                      color: config.color
                    }}
                    data-testid={`transition-to-${stage}`}
                  >
                    <Icon className="w-4 h-4" />
                    Move to {config.label}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transition Confirmation Dialog */}
      <AlertDialog open={showTransitionDialog} onOpenChange={setShowTransitionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Stage Transition</AlertDialogTitle>
            <AlertDialogDescription>
              Move &quot;{contract.name}&quot; from{' '}
              <Badge variant="outline" className="mx-1">{STAGE_CONFIG[contract.stage]?.label}</Badge>
              to{' '}
              <Badge variant="outline" className="mx-1">{STAGE_CONFIG[selectedNextStage]?.label}</Badge>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              placeholder="Enter reason for transition..."
              value={transitionReason}
              onChange={(e) => setTransitionReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleTransition} disabled={transitioning}>
              {transitioning ? 'Processing...' : 'Confirm Transition'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ==================== CREATE CONTRACT DIALOG ====================

const CreateContractDialog = ({ open, onOpenChange, onCreated }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    client_name: '',
    client_package: 'BRONZE',
    contract_type: 'PROJECT_BASED',
    function: 'OPERATIONS',
    estimated_value: '',
  });
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!formData.name || !formData.client_name) {
      alert('Please fill in required fields');
      return;
    }
    
    setCreating(true);
    try {
      await axios.post(`${API}/lifecycle/contracts`, {
        ...formData,
        estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null,
      });
      onCreated();
      onOpenChange(false);
      setFormData({
        name: '',
        description: '',
        client_name: '',
        client_package: 'BRONZE',
        contract_type: 'PROJECT_BASED',
        function: 'OPERATIONS',
        estimated_value: '',
      });
    } catch (error) {
      console.error('Create error:', error);
      alert('Failed to create contract');
    }
    setCreating(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Contract</DialogTitle>
          <DialogDescription>
            Start a new contract in the PROPOSAL stage.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Contract Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Acme Corp - Marketing Automation"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="client">Client Name *</Label>
            <Input
              id="client"
              value={formData.client_name}
              onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
              placeholder="e.g., Acme Corporation"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Package</Label>
              <Select
                value={formData.client_package}
                onValueChange={(v) => setFormData({ ...formData, client_package: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRONZE">Bronze</SelectItem>
                  <SelectItem value="SILVER">Silver</SelectItem>
                  <SelectItem value="GOLD">Gold</SelectItem>
                  <SelectItem value="BLACK">Black</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={formData.contract_type}
                onValueChange={(v) => setFormData({ ...formData, contract_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROJECT_BASED">Project Based</SelectItem>
                  <SelectItem value="RECURRING">Recurring</SelectItem>
                  <SelectItem value="RETAINER">Retainer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Function</Label>
              <Select
                value={formData.function}
                onValueChange={(v) => setFormData({ ...formData, function: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SALES">Sales</SelectItem>
                  <SelectItem value="MARKETING">Marketing</SelectItem>
                  <SelectItem value="DEVELOPMENT">Development</SelectItem>
                  <SelectItem value="FINANCE">Finance</SelectItem>
                  <SelectItem value="OPERATIONS">Operations</SelectItem>
                  <SelectItem value="POWERHOUSE">Powerhouse</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="value">Est. Value ($)</Label>
              <Input
                id="value"
                type="number"
                value={formData.estimated_value}
                onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Contract description..."
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={creating}>
            {creating ? 'Creating...' : 'Create Contract'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ==================== MAIN CONTRACT LIFECYCLE VIEW ====================

const ContractLifecycle = () => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState(null);
  const [stageFilter, setStageFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [stats, setStats] = useState(null);

  const loadContracts = async () => {
    setLoading(true);
    try {
      const [contractsRes, statsRes] = await Promise.all([
        axios.get(`${API}/lifecycle/contracts`),
        axios.get(`${API}/lifecycle/stats`),
      ]);
      setContracts(contractsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error loading contracts:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    // Load contracts on mount
    const initLoad = async () => {
      await loadContracts();
    };
    initLoad();
  }, []);

  // Seed demo data if no contracts
  useEffect(() => {
    if (!loading && contracts.length === 0) {
      axios.post(`${API}/lifecycle/seed-demo`).then(() => loadContracts());
    }
  }, [loading, contracts.length]);

  const filteredContracts = stageFilter === 'all' 
    ? contracts 
    : contracts.filter(c => c.stage === stageFilter);

  if (loading) {
    return (
      <div className="flex-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="contract-lifecycle">
      {/* Stats Header - Stage Pipeline */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {Object.entries(STAGE_CONFIG).slice(0, 7).map(([stage, config]) => {
          const Icon = config.icon;
          const count = stats?.stage_counts?.[stage] || 0;
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

      {/* Main Content */}
      <div className="flex gap-6">
        {/* Contract List */}
        <div className={`space-y-4 ${selectedContract ? 'w-1/3' : 'w-full'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-heading">
                {stageFilter === 'all' ? 'All Contracts' : STAGE_CONFIG[stageFilter]?.label}
              </h2>
              <p className="text-caption mt-1">
                {filteredContracts.length} contract{filteredContracts.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Button 
              onClick={() => setShowCreateDialog(true)} 
              className="gap-2"
              data-testid="new-contract-btn"
            >
              <Plus className="w-4 h-4" />
              New Contract
            </Button>
          </div>
          
          <ScrollArea className={selectedContract ? 'h-[60vh]' : 'h-auto'}>
            <div className={`grid gap-4 ${selectedContract ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
              {filteredContracts.map((contract) => (
                <ContractCard
                  key={contract.id}
                  contract={contract}
                  onSelect={setSelectedContract}
                />
              ))}
              {filteredContracts.length === 0 && (
                <div className="col-span-full empty-state">
                  <FileText className="empty-state__icon" />
                  <div className="empty-state__title">No contracts found</div>
                  <div className="empty-state__description">
                    {stageFilter !== 'all' 
                      ? `No contracts in ${STAGE_CONFIG[stageFilter]?.label} stage`
                      : 'Create your first contract to get started'
                    }
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Detail Panel */}
        {selectedContract && (
          <div className="w-2/3 border-l pl-6 animate-slide-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-subheading">Contract Details</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedContract(null)}
                data-testid="close-detail-btn"
              >
                Close
              </Button>
            </div>
            <ContractDetail
              contract={selectedContract}
              onClose={() => setSelectedContract(null)}
              onRefresh={() => {
                loadContracts();
                // Refresh selected contract
                axios.get(`${API}/lifecycle/contracts/${selectedContract.id}`)
                  .then(res => setSelectedContract(res.data))
                  .catch(() => setSelectedContract(null));
              }}
            />
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <CreateContractDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreated={loadContracts}
      />
    </div>
  );
};

export default ContractLifecycle;
