import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useRole, ROLE_CONFIG } from './RoleContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Shield, Crown, Users, CheckCircle, Briefcase, ListTodo, BookOpen,
  Wrench, Link, User, Activity, TrendingUp, AlertTriangle, Clock,
  FileText, DollarSign, Target, BarChart3, Play, Pause, Archive,
  ChevronRight, RefreshCw, Settings, Zap, X
} from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Icon mapping
const ICONS = {
  Shield, Crown, Users, CheckCircle, Briefcase, ListTodo, BookOpen,
  Wrench, Link, User, Activity, TrendingUp, AlertTriangle, Clock,
  FileText, DollarSign, Target, BarChart3, Play, Pause, Archive,
  ChevronRight, RefreshCw, Settings, Zap
};

// Navigation mapping for tiles
const TILE_NAVIGATION = {
  system_overview: { tab: 'analytics', detail: 'users' },
  contract_lifecycle: { tab: 'contracts', detail: 'overview' },
  active_tasks: { tab: 'execution', detail: 'tasks' },
  my_tasks: { tab: 'execution', detail: 'my-tasks' },
  executive_summary: { tab: 'analytics', detail: 'executive' },
  overdue_items: { tab: 'notifications', detail: 'overdue' },
  commissions: { tab: 'affiliates', detail: 'commissions' },
  all_contracts: { tab: 'contracts', detail: 'list' },
  all_users: { tab: 'team', detail: 'users' },
  automations: { tab: 'workflows', detail: 'automations' },
  settings: { tab: 'settings', detail: 'general' },
  analytics: { tab: 'analytics', detail: 'reports' },
  finance_overview: { tab: 'analytics', detail: 'finance' },
  sales_pipeline: { tab: 'pipeline', detail: 'overview' },
  operations_health: { tab: 'analytics', detail: 'operations' },
  project_health: { tab: 'contracts', detail: 'health' },
  strategic_kpis: { tab: 'analytics', detail: 'kpis' },
  my_projects: { tab: 'contracts', detail: 'my-projects' },
  client_communications: { tab: 'communications', detail: 'inbox' },
  deliverables: { tab: 'execution', detail: 'deliverables' },
  timeline: { tab: 'execution', detail: 'timeline' },
  team_status: { tab: 'team', detail: 'status' },
  compliance_dashboard: { tab: 'analytics', detail: 'compliance' },
  escalations: { tab: 'notifications', detail: 'escalations' },
  performance_metrics: { tab: 'analytics', detail: 'performance' },
  function_overview: { tab: 'analytics', detail: 'department' },
  team_bids: { tab: 'bidding', detail: 'pending' },
  proposals: { tab: 'pipeline', detail: 'proposals' },
  strategy_inputs: { tab: 'workflows', detail: 'strategy' },
  sop_library: { tab: 'knowledge-base', detail: 'sops' },
  team_assignments: { tab: 'execution', detail: 'assignments' },
  milestone_tracker: { tab: 'contracts', detail: 'milestones' },
  training_content: { tab: 'knowledge-base', detail: 'training' },
  contract_overview: { tab: 'contracts', detail: 'overview' },
  guidance_requests: { tab: 'communications', detail: 'requests' },
  my_deliverables: { tab: 'execution', detail: 'my-deliverables' },
  instructions: { tab: 'knowledge-base', detail: 'instructions' },
  referral_link: { tab: 'affiliates', detail: 'referral' },
  leads_overview: { tab: 'affiliates', detail: 'leads' },
  conversions: { tab: 'affiliates', detail: 'conversions' },
  marketing_resources: { tab: 'affiliates', detail: 'resources' },
  training: { tab: 'knowledge-base', detail: 'training' },
  project_dashboard: { tab: 'contracts', detail: 'dashboard' },
  reports: { tab: 'analytics', detail: 'reports' },
  support: { tab: 'knowledge-base', detail: 'support' },
};

// ==================== TILE WRAPPER ====================

const TileWrapper = ({ title, iconName, color, children, onClick, hasDetail }) => {
  const Icon = ICONS[iconName] || Activity;
  return (
    <Card 
      className={`labyrinth-tile border-l-4 bg-white transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:shadow-lg hover:-translate-y-0.5 group' : ''
      }`}
      style={{ 
        borderLeftColor: color,
        '--tile-accent-color': color 
      }}
      onClick={onClick}
      data-testid={`tile-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <div 
              className="p-1.5 rounded-md"
              style={{ backgroundColor: `${color}10` }}
            >
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <span className="text-neutral-700">{title}</span>
          </CardTitle>
          {(onClick || hasDetail) && (
            <ChevronRight className="w-4 h-4 text-neutral-400 transition-transform group-hover:translate-x-1" />
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
};

// ==================== STATS TILE ====================

const StatsTile = ({ title, iconName, color, value, subtitle, trend, onClick, hasDetail }) => (
  <TileWrapper title={title} iconName={iconName} color={color} onClick={onClick} hasDetail={hasDetail}>
    <div className="space-y-1 mt-2">
      <div className="text-2xl font-bold text-neutral-900">{value}</div>
      {subtitle && <div className="text-sm text-neutral-500">{subtitle}</div>}
      {trend && (
        <div className="flex items-center gap-1 text-xs mt-2">
          {trend > 0 ? (
            <TrendingUp className="w-3 h-3" style={{ color: 'var(--status-completed)' }} />
          ) : (
            <TrendingUp className="w-3 h-3 rotate-180" style={{ color: 'var(--status-overdue)' }} />
          )}
          <span style={{ color: trend > 0 ? 'var(--status-completed)' : 'var(--status-overdue)' }}>
            {trend > 0 ? '+' : ''}{trend}% from last period
          </span>
        </div>
      )}
    </div>
  </TileWrapper>
);

// ==================== TILE CONFIG ====================

const getTileConfig = (tileId, data) => {
  const configs = {
    system_overview: { title: 'System Overview', iconName: 'Activity', color: '#EF4444', value: data?.active_users || 0, subtitle: 'Active users' },
    contract_lifecycle: { title: 'Contract Lifecycle', iconName: 'FileText', color: '#F97316', value: data?.lifecycle?.total_contracts || 0, subtitle: 'Total contracts' },
    active_tasks: { title: 'Active Tasks', iconName: 'ListTodo', color: '#10B981', value: data?.tasks?.active_count || 0, subtitle: 'In progress' },
    my_tasks: { title: 'My Tasks', iconName: 'Target', color: '#64748B', value: data?.myTasks?.assigned || 0, subtitle: 'Assigned to you' },
    executive_summary: { title: 'Executive Summary', iconName: 'Crown', color: '#8B5CF6', value: data?.executive?.active_projects || 0, subtitle: 'Active projects' },
    overdue_items: { title: 'Overdue Items', iconName: 'AlertTriangle', color: '#EF4444', value: data?.overdue?.count || 0, subtitle: 'Need attention' },
    commissions: { title: 'Commissions', iconName: 'DollarSign', color: '#EC4899', value: `$${data?.commissions?.total || 0}`, subtitle: 'Total earned' },
    
    all_contracts: { title: 'All Contracts', iconName: 'FileText', color: '#3B82F6', value: data?.totalContracts || 0, subtitle: 'Total contracts' },
    all_users: { title: 'All Users', iconName: 'Users', color: '#8B5CF6', value: data?.totalUsers || 0, subtitle: 'Registered users' },
    automations: { title: 'Automations', iconName: 'Zap', color: '#F59E0B', value: data?.automations || 0, subtitle: 'Active workflows' },
    settings: { title: 'Settings', iconName: 'Settings', color: '#64748B', value: '→', subtitle: 'System configuration' },
    analytics: { title: 'Analytics', iconName: 'BarChart3', color: '#10B981', value: '→', subtitle: 'View reports' },
    
    finance_overview: { title: 'Finance', iconName: 'DollarSign', color: '#10B981', value: `$${data?.revenue || 0}`, subtitle: 'Total revenue', trend: 8 },
    sales_pipeline: { title: 'Sales Pipeline', iconName: 'TrendingUp', color: '#3B82F6', value: data?.pipeline || 0, subtitle: 'Active deals' },
    operations_health: { title: 'Operations', iconName: 'Activity', color: '#F97316', value: 'Good', subtitle: 'System status' },
    project_health: { title: 'Projects', iconName: 'Target', color: '#8B5CF6', value: data?.healthyProjects || 0, subtitle: 'On track' },
    strategic_kpis: { title: 'KPIs', iconName: 'BarChart3', color: '#06B6D4', value: data?.kpiScore || '85%', subtitle: 'Achievement rate' },
    
    my_projects: { title: 'My Projects', iconName: 'Briefcase', color: '#06B6D4', value: data?.myProjects || 0, subtitle: 'Active' },
    client_communications: { title: 'Communications', iconName: 'Users', color: '#8B5CF6', value: data?.unread || 0, subtitle: 'Unread messages' },
    deliverables: { title: 'Deliverables', iconName: 'FileText', color: '#10B981', value: data?.deliverables || 0, subtitle: 'Pending' },
    timeline: { title: 'Timeline', iconName: 'Clock', color: '#F59E0B', value: '→', subtitle: 'View schedule' },
    team_status: { title: 'Team Status', iconName: 'Users', color: '#3B82F6', value: data?.teamOnline || 0, subtitle: 'Online now' },
    
    compliance_dashboard: { title: 'Compliance', iconName: 'Shield', color: '#10B981', value: `${data?.compliance || 95}%`, subtitle: 'Score' },
    escalations: { title: 'Escalations', iconName: 'AlertTriangle', color: '#EF4444', value: data?.escalations || 0, subtitle: 'Active' },
    performance_metrics: { title: 'Performance', iconName: 'BarChart3', color: '#8B5CF6', value: '→', subtitle: 'View metrics' },
    
    function_overview: { title: 'Function', iconName: 'Activity', color: '#3B82F6', value: '→', subtitle: 'Department view' },
    team_bids: { title: 'Team Bids', iconName: 'FileText', color: '#F59E0B', value: data?.bids || 0, subtitle: 'Pending review' },
    proposals: { title: 'Proposals', iconName: 'FileText', color: '#10B981', value: data?.proposals || 0, subtitle: 'Active' },
    strategy_inputs: { title: 'Strategy', iconName: 'Target', color: '#8B5CF6', value: '→', subtitle: 'Inputs needed' },
    
    sop_library: { title: 'SOPs', iconName: 'BookOpen', color: '#3B82F6', value: data?.sops || 0, subtitle: 'Available' },
    team_assignments: { title: 'Assignments', iconName: 'Users', color: '#F97316', value: data?.assignments || 0, subtitle: 'Active' },
    milestone_tracker: { title: 'Milestones', iconName: 'Target', color: '#10B981', value: data?.milestones || 0, subtitle: 'In progress' },
    
    training_content: { title: 'Training', iconName: 'BookOpen', color: '#6366F1', value: data?.courses || 0, subtitle: 'Courses' },
    contract_overview: { title: 'Contracts', iconName: 'FileText', color: '#3B82F6', value: data?.contracts || 0, subtitle: 'Overview' },
    guidance_requests: { title: 'Guidance', iconName: 'Users', color: '#F59E0B', value: data?.requests || 0, subtitle: 'Requests' },
    
    my_deliverables: { title: 'My Deliverables', iconName: 'FileText', color: '#10B981', value: data?.myDeliverables || 0, subtitle: 'Pending' },
    instructions: { title: 'Instructions', iconName: 'BookOpen', color: '#3B82F6', value: '→', subtitle: 'View guide' },
    
    referral_link: { title: 'Referral Link', iconName: 'Link', color: '#EC4899', value: '→', subtitle: 'Copy link' },
    leads_overview: { title: 'Leads', iconName: 'Users', color: '#3B82F6', value: data?.leads || 0, subtitle: 'Referred' },
    conversions: { title: 'Conversions', iconName: 'TrendingUp', color: '#10B981', value: data?.conversions || 0, subtitle: 'This month' },
    marketing_resources: { title: 'Resources', iconName: 'FileText', color: '#8B5CF6', value: '→', subtitle: 'Marketing kit' },
    training: { title: 'Training', iconName: 'BookOpen', color: '#6366F1', value: '→', subtitle: 'View tutorials' },
    
    project_dashboard: { title: 'Dashboard', iconName: 'BarChart3', color: '#14B8A6', value: '→', subtitle: 'Project overview' },
    reports: { title: 'Reports', iconName: 'FileText', color: '#3B82F6', value: data?.reports || 0, subtitle: 'Available' },
    support: { title: 'Support', iconName: 'Users', color: '#8B5CF6', value: '→', subtitle: 'Get help' },
  };
  
  return configs[tileId] || { 
    title: tileId.replace(/_/g, ' '), 
    iconName: 'Activity', 
    color: '#64748B', 
    value: '—', 
    subtitle: 'Coming soon' 
  };
};

// ==================== MAIN DASHBOARD COMPONENT ====================

const RoleDashboard = ({ onNavigateToTab }) => {
  const { currentRole, getRoleConfig, getDashboardTiles, loading: roleLoading } = useRole();
  const [dashboardData, setDashboardData] = useState({});
  const [loading, setLoading] = useState(true);
  const [detailSheet, setDetailSheet] = useState({ open: false, tileId: null, data: null });
  
  const roleConfig = getRoleConfig(currentRole);
  const tiles = getDashboardTiles();
  
  // Get the icon component safely
  const roleIconName = roleConfig?.icon || 'User';
  const RoleIconComponent = ICONS[roleIconName] || User;

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const lifecycleRes = await axios.get(`${API}/lifecycle/stats`).catch(() => ({ data: {} }));
        const dashboardRes = await axios.get(`${API}/dashboard/stats`).catch(() => ({ data: {} }));
        const usersRes = await axios.get(`${API}/roles/users`).catch(() => ({ data: [] }));
        
        setDashboardData({
          lifecycle: lifecycleRes.data,
          totalContracts: lifecycleRes.data.total_contracts || 0,
          totalUsers: usersRes.data.length,
          dashboard: dashboardRes.data,
          executive: { total_revenue: '125,000', active_projects: 12 },
          tasks: { active_count: 45, pending: 12, overdue: 3 },
          myTasks: { assigned: 8, due_today: 2 },
          overdue: { count: dashboardRes.data?.active_alerts || 0 },
          commissions: { total: 2500, pending: 750, this_month: 500 },
          automations: 15,
          sops: dashboardRes.data?.total_sops || 0,
          milestones: 8,
          myDeliverables: 3,
          contracts: lifecycleRes.data.total_contracts || 0,
          leads: 25,
          conversions: 8,
          active_users: usersRes.data.filter(u => u.status === 'active').length || usersRes.data.length,
        });
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      }
      setLoading(false);
    };
    
    loadDashboardData();
  }, [currentRole]);

  // Handle tile click - navigate to tab or show detail
  const handleTileClick = (tileId, config) => {
    const nav = TILE_NAVIGATION[tileId];
    if (nav && onNavigateToTab) {
      // Navigate to the target tab
      onNavigateToTab(nav.tab);
    } else {
      // Show detail sheet for tiles without navigation
      setDetailSheet({
        open: true,
        tileId,
        data: config
      });
    }
  };

  if (roleLoading || loading) {
    return (
      <div className="flex-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="role-dashboard">
      {/* Role Header */}
      <div className="role-header">
        <div className="flex items-center gap-4">
          <div 
            className="role-header__icon" 
            style={{ backgroundColor: `${roleConfig?.color}12` }}
          >
            <RoleIconComponent className="w-7 h-7" style={{ color: roleConfig?.color }} />
          </div>
          <div>
            <h1 className="role-header__title">{roleConfig?.displayName} Dashboard</h1>
            <p className="role-header__description">{roleConfig?.description}</p>
          </div>
        </div>
      </div>

      {/* Dashboard Tiles - Game Menu Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiles.map((tileId, index) => {
          const config = getTileConfig(tileId, dashboardData);
          const hasNavigation = !!TILE_NAVIGATION[tileId];
          return (
            <div key={tileId} style={{ animationDelay: `${index * 50}ms` }} className="animate-fade-in">
              <StatsTile
                title={config.title}
                iconName={config.iconName}
                color={config.color}
                value={config.value}
                subtitle={config.subtitle}
                trend={config.trend}
                onClick={() => handleTileClick(tileId, config)}
                hasDetail={hasNavigation}
              />
            </div>
          );
        })}
      </div>

      {/* Detail Sheet for tiles that don't navigate */}
      <Sheet open={detailSheet.open} onOpenChange={(open) => setDetailSheet({ ...detailSheet, open })}>
        <SheetContent className="w-[400px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {detailSheet.data && (
                <>
                  {(() => {
                    const Icon = ICONS[detailSheet.data.iconName] || Activity;
                    return <Icon className="w-5 h-5" style={{ color: detailSheet.data.color }} />;
                  })()}
                  {detailSheet.data.title}
                </>
              )}
            </SheetTitle>
            <SheetDescription>
              {detailSheet.data?.subtitle}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {detailSheet.data && (
              <>
                <div className="text-center py-6 bg-muted/30 rounded-lg">
                  <div className="text-4xl font-bold" style={{ color: detailSheet.data.color }}>
                    {detailSheet.data.value}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">{detailSheet.data.subtitle}</div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Quick Actions</h4>
                  {TILE_NAVIGATION[detailSheet.tileId] && (
                    <Button 
                      className="w-full" 
                      onClick={() => {
                        const nav = TILE_NAVIGATION[detailSheet.tileId];
                        if (nav && onNavigateToTab) {
                          onNavigateToTab(nav.tab);
                          setDetailSheet({ open: false, tileId: null, data: null });
                        }
                      }}
                    >
                      View Full Details
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default RoleDashboard;
