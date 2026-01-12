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
  Tabs, TabsContent, TabsList, TabsTrigger
} from './components/ui/tabs';
import {
  Users, DollarSign, TrendingUp, Link, Award, Clock, CheckCircle,
  Plus, RefreshCw, ExternalLink, Copy, ArrowUpRight, UserPlus, Percent
} from 'lucide-react';

const API = import.meta.env.VITE_BACKEND_URL || '';

// Tier configuration
const TIER_CONFIG = {
  BRONZE: { label: 'Bronze', color: '#CD7F32', rate: '10%' },
  SILVER: { label: 'Silver', color: '#C0C0C0', rate: '15%' },
  GOLD: { label: 'Gold', color: '#FFD700', rate: '20%' },
  PLATINUM: { label: 'Platinum', color: '#E5E4E2', rate: '25%' }
};

// ==================== AFFILIATE CARD ====================

const AffiliateCard = ({ affiliate, onSelect }) => {
  const tierConfig = TIER_CONFIG[affiliate.tier] || TIER_CONFIG.BRONZE;
  
  return (
    <Card 
      className="labyrinth-card labyrinth-card--interactive cursor-pointer"
      style={{ borderLeft: `4px solid ${tierConfig.color}` }}
      onClick={() => onSelect(affiliate)}
      data-testid={`affiliate-card-${affiliate.id}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-subheading">{affiliate.name}</CardTitle>
            <CardDescription className="text-caption">{affiliate.company || affiliate.email}</CardDescription>
          </div>
          <Badge 
            className="status-badge px-2 py-1"
            style={{ 
              backgroundColor: `${tierConfig.color}15`,
              color: tierConfig.color === '#E5E4E2' ? '#666' : tierConfig.color,
              border: `1px solid ${tierConfig.color}40`
            }}
          >
            <Award className="w-3 h-3 mr-1" />
            {tierConfig.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-heading text-sm">{affiliate.total_referrals}</div>
            <div className="text-micro">Referrals</div>
          </div>
          <div>
            <div className="text-heading text-sm">{affiliate.total_conversions}</div>
            <div className="text-micro">Conversions</div>
          </div>
          <div>
            <div className="text-heading text-sm" style={{ color: 'var(--function-finance)' }}>
              {affiliate.conversion_rate}%
            </div>
            <div className="text-micro">Rate</div>
          </div>
        </div>
        
        <Separator />
        
        <div className="flex justify-between items-center">
          <span className="text-caption">Total Earnings</span>
          <span className="font-semibold" style={{ color: 'var(--function-finance)' }}>
            ${affiliate.total_earnings?.toLocaleString()}
          </span>
        </div>
        
        {affiliate.pending_earnings > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-caption">Pending</span>
            <span className="text-body">${affiliate.pending_earnings?.toLocaleString()}</span>
          </div>
        )}
        
        <Badge 
          variant={affiliate.status === 'ACTIVE' ? 'default' : 'secondary'}
          className="w-full justify-center"
        >
          {affiliate.status}
        </Badge>
      </CardContent>
    </Card>
  );
};

// ==================== AFFILIATE DETAIL ====================

const AffiliateDetail = ({ affiliate, onClose, onRefresh }) => {
  const [referrals, setReferrals] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  
  const tierConfig = TIER_CONFIG[affiliate?.tier] || TIER_CONFIG.BRONZE;

  useEffect(() => {
    if (affiliate) {
      loadAffiliateData();
    }
  }, [affiliate]);

  const loadAffiliateData = async () => {
    setLoading(true);
    try {
      const [refsRes, commsRes] = await Promise.all([
        axios.get(`${API}/api/affiliates/${affiliate.id}/referrals`),
        axios.get(`${API}/api/affiliates/${affiliate.id}/commissions`)
      ]);
      setReferrals(refsRes.data);
      setCommissions(commsRes.data);
    } catch (error) {
      console.error('Error loading affiliate data:', error);
    }
    setLoading(false);
  };

  const copyReferralLink = () => {
    navigator.clipboard.writeText(affiliate.referral_link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!affiliate) return null;

  return (
    <div className="space-y-6" data-testid="affiliate-detail">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-heading">{affiliate.name}</h2>
          <p className="text-caption mt-1">{affiliate.email}</p>
        </div>
        <Badge 
          className="status-badge px-3 py-1.5"
          style={{ 
            backgroundColor: `${tierConfig.color}15`,
            color: tierConfig.color === '#E5E4E2' ? '#666' : tierConfig.color,
            border: `1px solid ${tierConfig.color}40`
          }}
        >
          <Award className="w-4 h-4 mr-1" />
          {tierConfig.label} ({tierConfig.rate})
        </Badge>
      </div>

      {/* Referral Link */}
      <Card className="labyrinth-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-body font-medium">Referral Link</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input 
              value={affiliate.referral_link} 
              readOnly 
              className="font-mono text-sm"
            />
            <Button variant="outline" onClick={copyReferralLink}>
              {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-micro mt-2">Code: <span className="font-mono">{affiliate.referral_code}</span></p>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="labyrinth-card">
          <CardContent className="pt-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
            <div className="metric-card__value">{affiliate.total_referrals}</div>
            <div className="text-micro">Total Referrals</div>
          </CardContent>
        </Card>
        <Card className="labyrinth-card">
          <CardContent className="pt-4 text-center">
            <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-500" />
            <div className="metric-card__value">{affiliate.total_conversions}</div>
            <div className="text-micro">Conversions</div>
          </CardContent>
        </Card>
        <Card className="labyrinth-card">
          <CardContent className="pt-4 text-center">
            <Percent className="w-6 h-6 mx-auto mb-2 text-blue-500" />
            <div className="metric-card__value">{affiliate.conversion_rate}%</div>
            <div className="text-micro">Conv. Rate</div>
          </CardContent>
        </Card>
        <Card className="labyrinth-card">
          <CardContent className="pt-4 text-center">
            <DollarSign className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--function-finance)' }} />
            <div className="metric-card__value" style={{ color: 'var(--function-finance)' }}>
              ${affiliate.total_earnings?.toLocaleString()}
            </div>
            <div className="text-micro">Total Earned</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Referrals & Commissions */}
      <Tabs defaultValue="referrals">
        <TabsList>
          <TabsTrigger value="referrals">Referrals ({referrals.length})</TabsTrigger>
          <TabsTrigger value="commissions">Commissions ({commissions.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="referrals" className="mt-4">
          <Card className="labyrinth-card">
            <CardContent className="pt-4">
              {loading ? (
                <div className="flex-center py-8">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                </div>
              ) : referrals.length > 0 ? (
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {referrals.map((ref) => (
                      <div key={ref.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">{ref.referred_name}</p>
                          <p className="text-caption">{ref.referred_email}</p>
                        </div>
                        <div className="text-right">
                          <Badge 
                            variant={ref.status === 'CONVERTED' ? 'default' : ref.status === 'QUALIFIED' ? 'secondary' : 'outline'}
                          >
                            {ref.status}
                          </Badge>
                          {ref.deal_value && (
                            <p className="text-sm mt-1" style={{ color: 'var(--function-finance)' }}>
                              ${ref.deal_value.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No referrals yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="commissions" className="mt-4">
          <Card className="labyrinth-card">
            <CardContent className="pt-4">
              {loading ? (
                <div className="flex-center py-8">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                </div>
              ) : commissions.length > 0 ? (
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {commissions.map((comm) => (
                      <div key={comm.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">${comm.amount.toLocaleString()}</p>
                          <p className="text-caption">{comm.description}</p>
                        </div>
                        <Badge 
                          variant={comm.status === 'PAID' ? 'default' : comm.status === 'APPROVED' ? 'secondary' : 'outline'}
                          className={comm.status === 'PAID' ? 'bg-green-500' : ''}
                        >
                          {comm.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No commissions yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ==================== MAIN AFFILIATE CRM COMPONENT ====================

const AffiliateCRM = () => {
  const [affiliates, setAffiliates] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedAffiliate, setSelectedAffiliate] = useState(null);
  const [tierFilter, setTierFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  const [newAffiliate, setNewAffiliate] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    website: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [affiliatesRes, statsRes] = await Promise.all([
        axios.get(`${API}/api/affiliates/`),
        axios.get(`${API}/api/affiliates/stats`)
      ]);
      setAffiliates(affiliatesRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error loading affiliate data:', error);
    }
    setLoading(false);
  };

  const handleCreateAffiliate = async () => {
    try {
      await axios.post(`${API}/api/affiliates/`, newAffiliate);
      setShowCreateDialog(false);
      setNewAffiliate({ name: '', email: '', phone: '', company: '', website: '' });
      loadData();
    } catch (error) {
      console.error('Error creating affiliate:', error);
    }
  };

  const filteredAffiliates = tierFilter === 'all'
    ? affiliates
    : affiliates.filter(a => a.tier === tierFilter);

  if (loading) {
    return (
      <div className="flex-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="affiliate-crm">
      {/* Tier Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(TIER_CONFIG).map(([tier, config]) => {
          const count = stats?.affiliates_by_tier?.[tier] || 0;
          const isSelected = tierFilter === tier;
          return (
            <Card 
              key={tier}
              className={`labyrinth-card cursor-pointer transition-all ${
                isSelected ? 'ring-2 ring-offset-2' : 'hover:shadow-md'
              }`}
              style={{ 
                borderTop: `3px solid ${config.color}`,
                ringColor: config.color,
                background: isSelected ? `${config.color}08` : 'white'
              }}
              onClick={() => setTierFilter(tierFilter === tier ? 'all' : tier)}
              data-testid={`tier-filter-${tier}`}
            >
              <CardContent className="pt-4 pb-3 text-center">
                <Award className="w-6 h-6 mx-auto mb-2" style={{ color: config.color === '#E5E4E2' ? '#666' : config.color }} />
                <div className="metric-card__value">{count}</div>
                <div className="text-micro mt-1">{config.label} ({config.rate})</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="labyrinth-card">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-caption">Active Affiliates</p>
                <p className="text-heading mt-1">{stats?.active_affiliates || 0}</p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="labyrinth-card">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-caption">Total Referrals</p>
                <p className="text-heading mt-1">{stats?.total_referrals || 0}</p>
              </div>
              <UserPlus className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="labyrinth-card">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-caption">Conversions</p>
                <p className="text-heading mt-1">{stats?.total_conversions || 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="labyrinth-card">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-caption">Commissions Paid</p>
                <p className="text-heading mt-1" style={{ color: 'var(--function-finance)' }}>
                  ${stats?.total_commissions_paid?.toLocaleString() || 0}
                </p>
              </div>
              <DollarSign className="w-8 h-8" style={{ color: 'var(--function-finance)' }} />
            </div>
          </CardContent>
        </Card>
        <Card className="labyrinth-card">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-caption">Pending</p>
                <p className="text-heading mt-1">${stats?.pending_commissions?.toLocaleString() || 0}</p>
              </div>
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="flex gap-6">
        {/* Affiliate List */}
        <div className={`space-y-4 ${selectedAffiliate ? 'w-1/3' : 'w-full'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-heading">
                {tierFilter === 'all' ? 'All Affiliates' : `${TIER_CONFIG[tierFilter]?.label} Tier`}
              </h2>
              <p className="text-caption mt-1">
                {filteredAffiliates.length} affiliate{filteredAffiliates.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Button 
              onClick={() => setShowCreateDialog(true)} 
              className="gap-2"
              data-testid="new-affiliate-btn"
            >
              <Plus className="w-4 h-4" />
              Add Affiliate
            </Button>
          </div>
          
          <ScrollArea className={selectedAffiliate ? 'h-[60vh]' : 'h-auto'}>
            <div className={`grid gap-4 ${selectedAffiliate ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
              {filteredAffiliates.map((affiliate) => (
                <AffiliateCard
                  key={affiliate.id}
                  affiliate={affiliate}
                  onSelect={setSelectedAffiliate}
                />
              ))}
              {filteredAffiliates.length === 0 && (
                <div className="col-span-full empty-state">
                  <Users className="empty-state__icon" />
                  <div className="empty-state__title">No affiliates found</div>
                  <div className="empty-state__description">
                    Add your first affiliate partner to get started
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Detail Panel */}
        {selectedAffiliate && (
          <div className="w-2/3 border-l pl-6 animate-slide-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-subheading">Affiliate Details</h3>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedAffiliate(null)}
                data-testid="close-detail-btn"
              >
                Close
              </Button>
            </div>
            <AffiliateDetail
              affiliate={selectedAffiliate}
              onClose={() => setSelectedAffiliate(null)}
              onRefresh={() => {
                loadData();
                axios.get(`${API}/api/affiliates/${selectedAffiliate.id}`)
                  .then(res => setSelectedAffiliate(res.data))
                  .catch(() => setSelectedAffiliate(null));
              }}
            />
          </div>
        )}
      </div>

      {/* Create Affiliate Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Affiliate</DialogTitle>
            <DialogDescription>Enter affiliate partner details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={newAffiliate.name}
                  onChange={(e) => setNewAffiliate({...newAffiliate, name: e.target.value})}
                  placeholder="Partner name"
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={newAffiliate.email}
                  onChange={(e) => setNewAffiliate({...newAffiliate, email: e.target.value})}
                  placeholder="email@partner.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company</Label>
                <Input
                  value={newAffiliate.company}
                  onChange={(e) => setNewAffiliate({...newAffiliate, company: e.target.value})}
                  placeholder="Company name"
                />
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input
                  value={newAffiliate.website}
                  onChange={(e) => setNewAffiliate({...newAffiliate, website: e.target.value})}
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleCreateAffiliate} 
              disabled={!newAffiliate.name || !newAffiliate.email}
            >
              Add Affiliate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AffiliateCRM;
