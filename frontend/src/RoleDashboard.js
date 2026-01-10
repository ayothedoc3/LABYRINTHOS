import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useRole, ROLE_CONFIG } from './RoleContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Shield, Crown, Users, CheckCircle, Briefcase, ListTodo, BookOpen,
  Wrench, Link, User, Activity, TrendingUp, AlertTriangle, Clock,
  FileText, DollarSign, Target, BarChart3, Play, Pause, Archive,
  ChevronRight, RefreshCw, Settings, Zap
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Icon mapping
const ICONS = {
  Shield, Crown, Users, CheckCircle, Briefcase, ListTodo, BookOpen,
  Wrench, Link, User, Activity, TrendingUp, AlertTriangle, Clock,
  FileText, DollarSign, Target, BarChart3, Play, Pause, Archive,
  ChevronRight, RefreshCw, Settings, Zap
};

const getIcon = (iconName) => ICONS[iconName] || Activity;

// ==================== TILE COMPONENTS ====================

const TileWrapper = ({ title, icon: Icon, color, children, onClick }) => (
  <Card 
    className={`cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] border-l-4`}
    style={{ borderLeftColor: color }}
    onClick={onClick}
  >
    <CardHeader className="pb-2">
      <div className="flex items-center justify-between">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4" style={{ color }} />}
          {title}
        </CardTitle>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

// System Overview Tile (Admin)
const SystemOverviewTile = ({ data }) => (
  <TileWrapper title="System Overview" icon={Activity} color="#EF4444">
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Active Users</span>
        <span className="font-medium">{data?.active_users || 0}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">System Health</span>
        <Badge variant="outline" className="bg-green-50 text-green-700">Healthy</Badge>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">API Calls Today</span>
        <span className="font-medium">{data?.api_calls || 0}</span>
      </div>
    </div>
  </TileWrapper>
);

// Contract Lifecycle Tile (Accountability)
const ContractLifecycleTile = ({ data }) => {
  const stages = data?.stage_counts || {};
  const total = Object.values(stages).reduce((a, b) => a + b, 0);
  
  return (
    <TileWrapper title="Contract Lifecycle" icon={FileText} color="#F97316">
      <div className="space-y-3">
        {['PROPOSAL', 'BID_SUBMITTED', 'QUEUED', 'ACTIVE', 'COMPLETED'].map(stage => (
          <div key={stage} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground capitalize">{stage.replace('_', ' ').toLowerCase()}</span>
              <span>{stages[stage] || 0}</span>
            </div>
            <Progress 
              value={total > 0 ? ((stages[stage] || 0) / total) * 100 : 0} 
              className="h-1"
            />
          </div>
        ))}
      </div>
    </TileWrapper>
  );
};

// Active Tasks Tile (Coordinator)
const ActiveTasksTile = ({ data }) => (
  <TileWrapper title="Active Tasks" icon={ListTodo} color="#10B981">
    <div className="space-y-2">
      <div className="text-3xl font-bold">{data?.active_count || 0}</div>
      <div className="flex gap-2 text-xs">
        <Badge variant="secondary">{data?.pending || 0} pending</Badge>
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
          {data?.overdue || 0} overdue
        </Badge>
      </div>
    </div>
  </TileWrapper>
);

// My Tasks Tile (Specialist)
const MyTasksTile = ({ data }) => (
  <TileWrapper title="My Tasks" icon={Target} color="#64748B">
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold">{data?.assigned || 0}</span>
        <span className="text-sm text-muted-foreground">assigned</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Due Today</span>
        <span className="font-medium text-orange-600">{data?.due_today || 0}</span>
      </div>
    </div>
  </TileWrapper>
);

// Executive Summary Tile
const ExecutiveSummaryTile = ({ data }) => (
  <TileWrapper title="Executive Summary" icon={Crown} color="#8B5CF6">
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="text-center p-2 bg-muted/50 rounded">
          <div className="text-xl font-bold">{data?.total_revenue || '$0'}</div>
          <div className="text-xs text-muted-foreground">Revenue</div>
        </div>
        <div className="text-center p-2 bg-muted/50 rounded">
          <div className="text-xl font-bold">{data?.active_projects || 0}</div>
          <div className="text-xs text-muted-foreground">Projects</div>
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <TrendingUp className="w-4 h-4 text-green-500" />
        <span className="text-green-600">+12% from last month</span>
      </div>
    </div>
  </TileWrapper>
);

// Overdue Items Tile (Accountability)
const OverdueItemsTile = ({ data }) => (
  <TileWrapper title="Overdue Items" icon={AlertTriangle} color="#EF4444">
    <div className="space-y-2">
      <div className="text-3xl font-bold text-red-600">{data?.count || 0}</div>
      <div className="text-sm text-muted-foreground">
        Requires immediate attention
      </div>
      {data?.count > 0 && (
        <Button variant="destructive" size="sm" className="w-full">
          View All
        </Button>
      )}
    </div>
  </TileWrapper>
);

// Commissions Tile (Affiliate)
const CommissionsTile = ({ data }) => (
  <TileWrapper title="My Commissions" icon={DollarSign} color="#EC4899">
    <div className="space-y-2">
      <div className="text-3xl font-bold">${data?.total || 0}</div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Pending</span>
        <span className="font-medium">${data?.pending || 0}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">This Month</span>
        <span className="font-medium text-green-600">+${data?.this_month || 0}</span>
      </div>
    </div>
  </TileWrapper>
);

// Generic Stats Tile
const StatsTile = ({ title, icon, color, value, subtitle, trend }) => (
  <TileWrapper title={title} icon={icon} color={color}>
    <div className="space-y-1">
      <div className="text-3xl font-bold">{value}</div>
      {subtitle && <div className="text-sm text-muted-foreground">{subtitle}</div>}
      {trend && (
        <div className="flex items-center gap-1 text-sm">
          {trend > 0 ? (
            <TrendingUp className="w-3 h-3 text-green-500" />
          ) : (
            <TrendingUp className="w-3 h-3 text-red-500 rotate-180" />
          )}
          <span className={trend > 0 ? 'text-green-600' : 'text-red-600'}>
            {Math.abs(trend)}%
          </span>
        </div>
      )}
    </div>
  </TileWrapper>
);

// ==================== TILE RENDERER ====================

const TileRenderer = ({ tileId, data }) => {
  const tileConfig = {
    system_overview: () => <SystemOverviewTile data={data} />,
    contract_lifecycle: () => <ContractLifecycleTile data={data?.lifecycle} />,
    active_tasks: () => <ActiveTasksTile data={data?.tasks} />,
    my_tasks: () => <MyTasksTile data={data?.myTasks} />,
    executive_summary: () => <ExecutiveSummaryTile data={data?.executive} />,
    overdue_items: () => <OverdueItemsTile data={data?.overdue} />,
    commissions: () => <CommissionsTile data={data?.commissions} />,
    
    // Generic tiles
    all_contracts: () => <StatsTile title="All Contracts" icon={FileText} color="#3B82F6" value={data?.totalContracts || 0} subtitle="Total contracts" />,
    all_users: () => <StatsTile title="All Users" icon={Users} color="#8B5CF6" value={data?.totalUsers || 0} subtitle="Registered users" />,
    automations: () => <StatsTile title="Automations" icon={Zap} color="#F59E0B" value={data?.automations || 0} subtitle="Active workflows" />,
    settings: () => <StatsTile title="Settings" icon={Settings} color="#64748B" value="→" subtitle="System configuration" />,
    analytics: () => <StatsTile title="Analytics" icon={BarChart3} color="#10B981" value="→" subtitle="View reports" />,
    
    finance_overview: () => <StatsTile title="Finance" icon={DollarSign} color="#10B981" value={`$${data?.revenue || 0}`} subtitle="Total revenue" trend={8} />,
    sales_pipeline: () => <StatsTile title="Sales Pipeline" icon={TrendingUp} color="#3B82F6" value={data?.pipeline || 0} subtitle="Active deals" />,
    operations_health: () => <StatsTile title="Operations" icon={Activity} color="#F97316" value="Good" subtitle="System status" />,
    project_health: () => <StatsTile title="Projects" icon={Target} color="#8B5CF6" value={data?.healthyProjects || 0} subtitle="On track" />,
    strategic_kpis: () => <StatsTile title="KPIs" icon={BarChart3} color="#06B6D4" value={data?.kpiScore || '85%'} subtitle="Achievement rate" />,
    
    my_projects: () => <StatsTile title="My Projects" icon={Briefcase} color="#06B6D4" value={data?.myProjects || 0} subtitle="Active" />,
    client_communications: () => <StatsTile title="Communications" icon={Users} color="#8B5CF6" value={data?.unread || 0} subtitle="Unread messages" />,
    deliverables: () => <StatsTile title="Deliverables" icon={FileText} color="#10B981" value={data?.deliverables || 0} subtitle="Pending" />,
    timeline: () => <StatsTile title="Timeline" icon={Clock} color="#F59E0B" value="→" subtitle="View schedule" />,
    team_status: () => <StatsTile title="Team Status" icon={Users} color="#3B82F6" value={data?.teamOnline || 0} subtitle="Online now" />,
    
    compliance_dashboard: () => <StatsTile title="Compliance" icon={Shield} color="#10B981" value={`${data?.compliance || 95}%`} subtitle="Score" />,
    escalations: () => <StatsTile title="Escalations" icon={AlertTriangle} color="#EF4444" value={data?.escalations || 0} subtitle="Active" />,
    performance_metrics: () => <StatsTile title="Performance" icon={BarChart3} color="#8B5CF6" value="→" subtitle="View metrics" />,
    
    function_overview: () => <StatsTile title="Function" icon={Activity} color="#3B82F6" value="→" subtitle="Department view" />,
    team_bids: () => <StatsTile title="Team Bids" icon={FileText} color="#F59E0B" value={data?.bids || 0} subtitle="Pending review" />,
    proposals: () => <StatsTile title="Proposals" icon={FileText} color="#10B981" value={data?.proposals || 0} subtitle="Active" />,
    strategy_inputs: () => <StatsTile title="Strategy" icon={Target} color="#8B5CF6" value="→" subtitle="Inputs needed" />,
    
    sop_library: () => <StatsTile title="SOPs" icon={BookOpen} color="#3B82F6" value={data?.sops || 0} subtitle="Available" />,
    team_assignments: () => <StatsTile title="Assignments" icon={Users} color="#F97316" value={data?.assignments || 0} subtitle="Active" />,
    milestone_tracker: () => <StatsTile title="Milestones" icon={Target} color="#10B981" value={data?.milestones || 0} subtitle="In progress" />,
    
    training_content: () => <StatsTile title="Training" icon={BookOpen} color="#6366F1" value={data?.courses || 0} subtitle="Courses" />,
    contract_overview: () => <StatsTile title="Contracts" icon={FileText} color="#3B82F6" value={data?.contracts || 0} subtitle="Overview" />,
    guidance_requests: () => <StatsTile title="Guidance" icon={Users} color="#F59E0B" value={data?.requests || 0} subtitle="Requests" />,
    
    my_deliverables: () => <StatsTile title="My Deliverables" icon={FileText} color="#10B981" value={data?.myDeliverables || 0} subtitle="Pending" />,
    instructions: () => <StatsTile title="Instructions" icon={BookOpen} color="#3B82F6" value="→" subtitle="View guide" />,
    
    referral_link: () => <StatsTile title="Referral Link" icon={Link} color="#EC4899" value="→" subtitle="Copy link" />,
    leads_overview: () => <StatsTile title="Leads" icon={Users} color="#3B82F6" value={data?.leads || 0} subtitle="Referred" />,
    conversions: () => <StatsTile title="Conversions" icon={TrendingUp} color="#10B981" value={data?.conversions || 0} subtitle="This month" />,
    marketing_resources: () => <StatsTile title="Resources" icon={FileText} color="#8B5CF6" value="→" subtitle="Marketing kit" />,
    training: () => <StatsTile title="Training" icon={BookOpen} color="#6366F1" value="→" subtitle="View tutorials" />,
    
    project_dashboard: () => <StatsTile title="Dashboard" icon={BarChart3} color="#14B8A6" value="→" subtitle="Project overview" />,
    reports: () => <StatsTile title="Reports" icon={FileText} color="#3B82F6" value={data?.reports || 0} subtitle="Available" />,
    support: () => <StatsTile title="Support" icon={Users} color="#8B5CF6" value="→" subtitle="Get help" />,
  };
  
  const renderer = tileConfig[tileId];
  if (!renderer) {
    return (
      <TileWrapper title={tileId.replace(/_/g, ' ')} icon={Activity} color="#64748B">
        <div className="text-sm text-muted-foreground">Coming soon</div>
      </TileWrapper>
    );
  }
  
  return renderer();
};

// ==================== MAIN DASHBOARD COMPONENT ====================

const RoleDashboard = () => {
  const { currentRole, getRoleConfig, getDashboardTiles, loading: roleLoading } = useRole();
  const [dashboardData, setDashboardData] = useState({});
  const [loading, setLoading] = useState(true);
  
  const roleConfig = getRoleConfig(currentRole);
  const tiles = getDashboardTiles();
  const RoleIcon = getIcon(roleConfig?.icon);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        // Load lifecycle stats
        const lifecycleRes = await axios.get(`${API}/lifecycle/stats`);
        
        // Load other stats
        const [dashboardRes, usersRes] = await Promise.all([
          axios.get(`${API}/dashboard/stats`).catch(() => ({ data: {} })),
          axios.get(`${API}/roles/users`).catch(() => ({ data: [] })),
        ]);
        
        setDashboardData({
          lifecycle: lifecycleRes.data,
          totalContracts: lifecycleRes.data.total_contracts,
          totalUsers: usersRes.data.length,
          dashboard: dashboardRes.data,
          // Mock data for demo - in production, fetch from appropriate endpoints
          executive: { total_revenue: '125,000', active_projects: 12 },
          tasks: { active_count: 45, pending: 12, overdue: 3 },
          myTasks: { assigned: 8, due_today: 2 },
          overdue: { count: dashboardRes.data.active_alerts || 0 },
          commissions: { total: 2500, pending: 750, this_month: 500 },
          automations: 15,
          sops: dashboardRes.data.total_sops || 0,
          milestones: 8,
          myDeliverables: 3,
          contracts: lifecycleRes.data.total_contracts,
          leads: 25,
          conversions: 8,
        });
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      }
      setLoading(false);
    };
    
    loadDashboardData();
  }, [currentRole]);

  if (roleLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Role Header */}
      <Card className="border-none shadow-none bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div 
              className="p-3 rounded-xl" 
              style={{ backgroundColor: `${roleConfig?.color}15` }}
            >
              <RoleIcon className="w-8 h-8" style={{ color: roleConfig?.color }} />
            </div>
            <div>
              <CardTitle className="text-xl">{roleConfig?.displayName} Dashboard</CardTitle>
              <CardDescription>{roleConfig?.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Dashboard Tiles - Game Menu Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiles.map((tileId) => (
          <TileRenderer key={tileId} tileId={tileId} data={dashboardData} />
        ))}
      </div>
    </div>
  );
};

export default RoleDashboard;
