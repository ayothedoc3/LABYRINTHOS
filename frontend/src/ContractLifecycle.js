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
  Users, DollarSign, Calendar, MessageSquare
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Stage configuration
const STAGE_CONFIG = {
  PROPOSAL: { color: '#64748B', icon: FileText, label: 'Proposal' },
  BID_SUBMITTED: { color: '#F59E0B', icon: Send, label: 'Bid Submitted' },
  BID_APPROVED: { color: '#10B981', icon: CheckCircle, label: 'Bid Approved' },
  INACTIVE: { color: '#6B7280', icon: Pause, label: 'Inactive' },
  QUEUED: { color: '#3B82F6', icon: Clock, label: 'In Queue' },
  ACTIVE: { color: '#22C55E', icon: Play, label: 'Active' },
  PAUSED: { color: '#EAB308', icon: Pause, label: 'Paused' },
  COMPLETED: { color: '#8B5CF6', icon: CheckCircle, label: 'Completed' },
  CLOSED: { color: '#1F2937', icon: Archive, label: 'Closed' },
};

// Stage flow for visual pipeline
const STAGE_FLOW = [
  'PROPOSAL', 'BID_SUBMITTED', 'BID_APPROVED', 'INACTIVE', 'QUEUED', 'ACTIVE', 'COMPLETED'
];

// ==================== CONTRACT CARD ====================

const ContractCard = ({ contract, onSelect, onTransition }) => {
  const stageConfig = STAGE_CONFIG[contract.stage] || STAGE_CONFIG.PROPOSAL;
  const StageIcon = stageConfig.icon;
  
  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-all duration-200 hover:border-primary/50"
      onClick={() => onSelect(contract)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">{contract.name}</CardTitle>
            <CardDescription className="text-xs">{contract.client_name}</CardDescription>
          </div>
          <Badge 
            className="text-xs font-medium"
            style={{ 
              backgroundColor: `${stageConfig.color}15`,
              color: stageConfig.color,
              border: `1px solid ${stageConfig.color}30`
            }}
          >
            <StageIcon className="w-3 h-3 mr-1" />
            {stageConfig.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            {contract.contract_type?.replace('_', ' ')}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {contract.function}
          </span>
          {contract.estimated_value && (
            <span className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              ${contract.estimated_value.toLocaleString()}
            </span>
          )}
        </div>
        
        {/* Stage Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{STAGE_FLOW.indexOf(contract.stage) + 1} of {STAGE_FLOW.length}</span>
          </div>
          <Progress 
            value={((STAGE_FLOW.indexOf(contract.stage) + 1) / STAGE_FLOW.length) * 100}
            className="h-1"
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
  
  if (!contract) return null;
  
  const stageConfig = STAGE_CONFIG[contract.stage] || STAGE_CONFIG.PROPOSAL;
  const StageIcon = stageConfig.icon;
  
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">{contract.name}</h2>
          <p className="text-muted-foreground">{contract.client_name}</p>
        </div>
        <Badge 
          className="text-sm px-3 py-1"
          style={{ 
            backgroundColor: `${stageConfig.color}15`,
            color: stageConfig.color,
            border: `1px solid ${stageConfig.color}30`
          }}
        >
          <StageIcon className="w-4 h-4 mr-1" />
          {stageConfig.label}
        </Badge>
      </div>

      {/* Stage Pipeline Visual */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Contract Lifecycle</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            {STAGE_FLOW.map((stage, index) => {
              const config = STAGE_CONFIG[stage];
              const Icon = config.icon;
              const isActive = stage === contract.stage;
              const isPast = STAGE_FLOW.indexOf(contract.stage) > index;
              
              return (
                <React.Fragment key={stage}>
                  <div className="flex flex-col items-center gap-1">
                    <div 
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        isActive ? 'ring-2 ring-offset-2' : ''
                      }`}
                      style={{ 
                        backgroundColor: isPast || isActive ? config.color : '#E5E7EB',
                        ringColor: isActive ? config.color : 'transparent'
                      }}
                    >
                      <Icon className={`w-4 h-4 ${isPast || isActive ? 'text-white' : 'text-gray-400'}`} />
                    </div>
                    <span className={`text-xs ${isActive ? 'font-medium' : 'text-muted-foreground'}`}>
                      {config.label}
                    </span>
                  </div>
                  {index < STAGE_FLOW.length - 1 && (
                    <ArrowRight className={`w-4 h-4 ${isPast ? 'text-green-500' : 'text-gray-300'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Contract Details */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <span>{contract.contract_type?.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Function</span>
              <Badge variant="outline">{contract.function}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Package</span>
              <Badge variant="secondary">{contract.client_package}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Value</span>
              <span className="font-medium">
                ${contract.estimated_value?.toLocaleString() || '—'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{new Date(contract.created_at).toLocaleDateString()}</span>
            </div>
            {contract.activated_date && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Activated</span>
                <span>{new Date(contract.activated_date).toLocaleDateString()}</span>
              </div>
            )}
            {contract.start_date && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Start Date</span>
                <span>{new Date(contract.start_date).toLocaleDateString()}</span>
              </div>
            )}
            {contract.end_date && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">End Date</span>
                <span>{new Date(contract.end_date).toLocaleDateString()}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {contract.description && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{contract.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {nextStages.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Actions</CardTitle>
            <CardDescription>Move contract to next stage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
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
                    className="gap-2"
                    style={{ 
                      borderColor: `${config.color}50`,
                      color: config.color
                    }}
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
    loadContracts();
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
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {Object.entries(STAGE_CONFIG).slice(0, 7).map(([stage, config]) => {
          const Icon = config.icon;
          const count = stats?.stage_counts?.[stage] || 0;
          return (
            <Card 
              key={stage}
              className={`cursor-pointer transition-all hover:shadow-md ${
                stageFilter === stage ? 'ring-2' : ''
              }`}
              style={{ 
                borderTop: `3px solid ${config.color}`,
                ringColor: config.color
              }}
              onClick={() => setStageFilter(stageFilter === stage ? 'all' : stage)}
            >
              <CardContent className="pt-4 pb-3 text-center">
                <Icon className="w-5 h-5 mx-auto mb-1" style={{ color: config.color }} />
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-xs text-muted-foreground">{config.label}</div>
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
              <h2 className="text-lg font-semibold">
                {stageFilter === 'all' ? 'All Contracts' : STAGE_CONFIG[stageFilter]?.label}
              </h2>
              <p className="text-sm text-muted-foreground">
                {filteredContracts.length} contract{filteredContracts.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
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
            </div>
          </ScrollArea>
        </div>

        {/* Detail Panel */}
        {selectedContract && (
          <div className="w-2/3 border-l pl-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium">Contract Details</h3>
              <Button variant="ghost" size="sm" onClick={() => setSelectedContract(null)}>
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
