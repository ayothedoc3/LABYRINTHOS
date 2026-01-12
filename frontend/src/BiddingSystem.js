import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './components/ui/card';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Textarea } from './components/ui/textarea';
import { Progress } from './components/ui/progress';
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
  Gavel, DollarSign, Clock, Users, FileText, CheckCircle, XCircle,
  Plus, RefreshCw, TrendingUp, Calendar, Award, AlertTriangle, Building2
} from 'lucide-react';

const API = import.meta.env.VITE_BACKEND_URL || '';

const STATUS_CONFIG = {
  open: { label: 'Open', color: 'bg-green-500/20 text-green-500', icon: Clock },
  under_review: { label: 'Under Review', color: 'bg-amber-500/20 text-amber-500', icon: AlertTriangle },
  awarded: { label: 'Awarded', color: 'bg-blue-500/20 text-blue-500', icon: Award },
  closed: { label: 'Closed', color: 'bg-gray-500/20 text-gray-500', icon: XCircle }
};

const BID_STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-amber-500/20 text-amber-500' },
  accepted: { label: 'Accepted', color: 'bg-green-500/20 text-green-500' },
  rejected: { label: 'Rejected', color: 'bg-red-500/20 text-red-500' },
  withdrawn: { label: 'Withdrawn', color: 'bg-gray-500/20 text-gray-500' }
};

const BiddingSystem = () => {
  const [contracts, setContracts] = useState([]);
  const [bids, setBids] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedContract, setSelectedContract] = useState(null);
  const [showBidDialog, setShowBidDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('contracts');
  const [filter, setFilter] = useState('all');

  const [newBid, setNewBid] = useState({
    team_id: 'team_alpha',
    team_name: 'Alpha Solutions',
    proposed_value: '',
    timeline_days: '',
    proposal: '',
    strengths: ''
  });

  const [newContract, setNewContract] = useState({
    title: '',
    description: '',
    client_name: '',
    estimated_value: '',
    deadline: '',
    requirements: '',
    category: 'financial'
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [contractsRes, bidsRes, analyticsRes] = await Promise.all([
        axios.get(`${API}/api/bidding/contracts`),
        axios.get(`${API}/api/bidding/bids`),
        axios.get(`${API}/api/bidding/analytics`)
      ]);
      setContracts(contractsRes.data.contracts || []);
      setBids(bidsRes.data.bids || []);
      setAnalytics(analyticsRes.data);
    } catch (err) {
      console.error('Error fetching bidding data:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmitBid = async () => {
    if (!selectedContract) return;
    
    try {
      await axios.post(`${API}/api/bidding/bids`, {
        contract_id: selectedContract.id,
        team_id: newBid.team_id,
        team_name: newBid.team_name,
        proposed_value: parseFloat(newBid.proposed_value),
        timeline_days: parseInt(newBid.timeline_days),
        proposal: newBid.proposal,
        strengths: newBid.strengths.split(',').map(s => s.trim())
      });
      setShowBidDialog(false);
      setNewBid({ team_id: 'team_alpha', team_name: 'Alpha Solutions', proposed_value: '', timeline_days: '', proposal: '', strengths: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to submit bid');
    }
  };

  const handleCreateContract = async () => {
    try {
      await axios.post(`${API}/api/bidding/contracts`, {
        ...newContract,
        estimated_value: parseFloat(newContract.estimated_value),
        requirements: newContract.requirements.split(',').map(r => r.trim())
      });
      setShowCreateDialog(false);
      setNewContract({ title: '', description: '', client_name: '', estimated_value: '', deadline: '', requirements: '', category: 'financial' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create contract');
    }
  };

  const handleEvaluateBid = async (bidId, status, feedback = '') => {
    try {
      await axios.patch(`${API}/api/bidding/bids/${bidId}/evaluate`, {
        status,
        feedback,
        score: status === 'accepted' ? 95 : 60
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to evaluate bid');
    }
  };

  const filteredContracts = filter === 'all' 
    ? contracts 
    : contracts.filter(c => c.status === filter);

  const getContractBids = (contractId) => bids.filter(b => b.contract_id === contractId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="bidding-system">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Gavel className="w-8 h-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{analytics?.total_contracts || 0}</div>
                <div className="text-xs text-muted-foreground">Total Contracts</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{analytics?.open_contracts || 0}</div>
                <div className="text-xs text-muted-foreground">Open for Bidding</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{analytics?.total_bids || 0}</div>
                <div className="text-xs text-muted-foreground">Total Bids</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{analytics?.win_rate || 0}%</div>
                <div className="text-xs text-muted-foreground">Win Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="flex gap-4 items-center">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Contracts</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="under_review">Under Review</SelectItem>
            <SelectItem value="awarded">Awarded</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setShowCreateDialog(true)} data-testid="create-contract-btn">
          <Plus className="w-4 h-4 mr-2" />
          New Contract
        </Button>
        <Button variant="outline" onClick={fetchData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Contracts Grid */}
      <div className="grid grid-cols-2 gap-4">
        {filteredContracts.length === 0 ? (
          <Card className="col-span-2">
            <CardContent className="p-8 text-center">
              <Gavel className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold mb-2">No Contracts Found</h3>
              <p className="text-sm text-muted-foreground">Create a new contract to start the bidding process.</p>
            </CardContent>
          </Card>
        ) : (
          filteredContracts.map(contract => {
            const statusConfig = STATUS_CONFIG[contract.status] || STATUS_CONFIG.open;
            const StatusIcon = statusConfig.icon;
            const contractBids = getContractBids(contract.id);
            
            return (
              <Card 
                key={contract.id} 
                className="cursor-pointer hover:border-primary/50 transition-all"
                onClick={() => setSelectedContract(contract)}
                data-testid={`contract-${contract.id}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base">{contract.title}</CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Building2 className="w-3 h-3" />
                        {contract.client_name}
                      </CardDescription>
                    </div>
                    <Badge className={statusConfig.color}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusConfig.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{contract.description}</p>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-green-500" />
                      <span className="font-semibold">${contract.estimated_value?.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <FileText className="w-4 h-4" />
                      <span>{contractBids.length} bids</span>
                    </div>
                  </div>
                  {contract.status === 'open' && (
                    <Button 
                      className="w-full mt-3" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedContract(contract);
                        setShowBidDialog(true);
                      }}
                      data-testid={`bid-on-${contract.id}`}
                    >
                      Submit Bid
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Contract Detail Dialog */}
      <Dialog open={selectedContract && !showBidDialog} onOpenChange={() => setSelectedContract(null)}>
        {selectedContract && (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedContract.title}</DialogTitle>
              <DialogDescription>{selectedContract.client_name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Estimated Value</Label>
                  <p className="font-semibold">${selectedContract.estimated_value?.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Deadline</Label>
                  <p className="font-semibold">{new Date(selectedContract.deadline).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Category</Label>
                  <p className="font-semibold capitalize">{selectedContract.category}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-xs text-muted-foreground">Description</Label>
                <p className="text-sm">{selectedContract.description}</p>
              </div>
              
              <div>
                <Label className="text-xs text-muted-foreground">Requirements</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedContract.requirements?.map((req, i) => (
                    <Badge key={i} variant="outline">{req}</Badge>
                  ))}
                </div>
              </div>
              
              <Separator />
              
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Submitted Bids ({getContractBids(selectedContract.id).length})</Label>
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {getContractBids(selectedContract.id).map(bid => {
                      const bidStatus = BID_STATUS_CONFIG[bid.status] || BID_STATUS_CONFIG.pending;
                      return (
                        <div key={bid.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">{bid.team_name}</span>
                            </div>
                            <Badge className={bidStatus.color}>{bidStatus.label}</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Proposed: </span>
                              <span className="font-semibold">${bid.proposed_value?.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Timeline: </span>
                              <span className="font-semibold">{bid.timeline_days} days</span>
                            </div>
                          </div>
                          {bid.status === 'pending' && selectedContract.status !== 'awarded' && (
                            <div className="flex gap-2 mt-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="text-green-500"
                                onClick={() => handleEvaluateBid(bid.id, 'accepted', 'Bid accepted')}
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Accept
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="text-red-500"
                                onClick={() => handleEvaluateBid(bid.id, 'rejected', 'Not selected')}
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {getContractBids(selectedContract.id).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No bids submitted yet</p>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedContract(null)}>Close</Button>
              {selectedContract.status === 'open' && (
                <Button onClick={() => setShowBidDialog(true)}>Submit Bid</Button>
              )}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Submit Bid Dialog */}
      <Dialog open={showBidDialog} onOpenChange={setShowBidDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Bid</DialogTitle>
            <DialogDescription>
              Bidding on: {selectedContract?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Team Name</Label>
                <Input 
                  value={newBid.team_name}
                  onChange={(e) => setNewBid({...newBid, team_name: e.target.value})}
                  placeholder="Your team name"
                />
              </div>
              <div>
                <Label>Proposed Value ($)</Label>
                <Input 
                  type="number"
                  value={newBid.proposed_value}
                  onChange={(e) => setNewBid({...newBid, proposed_value: e.target.value})}
                  placeholder="Enter amount"
                />
              </div>
            </div>
            <div>
              <Label>Timeline (days)</Label>
              <Input 
                type="number"
                value={newBid.timeline_days}
                onChange={(e) => setNewBid({...newBid, timeline_days: e.target.value})}
                placeholder="Estimated days to complete"
              />
            </div>
            <div>
              <Label>Proposal</Label>
              <Textarea 
                value={newBid.proposal}
                onChange={(e) => setNewBid({...newBid, proposal: e.target.value})}
                placeholder="Describe your approach..."
                rows={3}
              />
            </div>
            <div>
              <Label>Key Strengths (comma-separated)</Label>
              <Input 
                value={newBid.strengths}
                onChange={(e) => setNewBid({...newBid, strengths: e.target.value})}
                placeholder="e.g., Experienced team, Fast delivery, Cost-effective"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBidDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmitBid} data-testid="submit-bid-btn">Submit Bid</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Contract Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Contract</DialogTitle>
            <DialogDescription>Add a new contract for teams to bid on</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input 
                value={newContract.title}
                onChange={(e) => setNewContract({...newContract, title: e.target.value})}
                placeholder="Contract title"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Client Name</Label>
                <Input 
                  value={newContract.client_name}
                  onChange={(e) => setNewContract({...newContract, client_name: e.target.value})}
                  placeholder="Client company name"
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={newContract.category} onValueChange={(v) => setNewContract({...newContract, category: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="financial">Financial</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="technology">Technology</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Estimated Value ($)</Label>
                <Input 
                  type="number"
                  value={newContract.estimated_value}
                  onChange={(e) => setNewContract({...newContract, estimated_value: e.target.value})}
                  placeholder="Enter amount"
                />
              </div>
              <div>
                <Label>Deadline</Label>
                <Input 
                  type="date"
                  value={newContract.deadline}
                  onChange={(e) => setNewContract({...newContract, deadline: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Textarea 
                value={newContract.description}
                onChange={(e) => setNewContract({...newContract, description: e.target.value})}
                placeholder="Describe the contract scope..."
                rows={3}
              />
            </div>
            <div>
              <Label>Requirements (comma-separated)</Label>
              <Input 
                value={newContract.requirements}
                onChange={(e) => setNewContract({...newContract, requirements: e.target.value})}
                placeholder="e.g., 5+ years experience, Certified, 24/7 support"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateContract} data-testid="create-contract-submit">Create Contract</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BiddingSystem;
