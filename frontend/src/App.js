import React, { useState, useEffect, useCallback } from "react";
import "@/App.css";
import axios from "axios";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { 
  LayoutDashboard, BookOpen, FileText, Users, FileCheck, 
  BarChart3, Shield, Settings, AlertTriangle, CheckCircle2, 
  XCircle, Clock, TrendingUp, TrendingDown, Play, RefreshCw,
  Plus, ChevronRight, Activity, Zap, Target, ArrowRight, Workflow
} from "lucide-react";
import WorkflowViz from "./WorkflowViz";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// ==================== CONSTANTS ====================

const FUNCTIONS = ["SALES", "MARKETING", "DEVELOPMENT", "FINANCE", "OPERATIONS", "POWERHOUSE"];
const LEVELS = ["ACQUIRE", "MAINTAIN", "SCALE"];
const PACKAGES = ["BRONZE", "SILVER", "GOLD", "BLACK"];

const FUNCTION_COLORS = {
  SALES: "bg-blue-500",
  MARKETING: "bg-purple-500",
  DEVELOPMENT: "bg-green-500",
  FINANCE: "bg-yellow-500",
  OPERATIONS: "bg-orange-500",
  POWERHOUSE: "bg-pink-500"
};

const LEVEL_COLORS = {
  ACQUIRE: "bg-emerald-500",
  MAINTAIN: "bg-sky-500",
  SCALE: "bg-violet-500"
};

const STATUS_COLORS = {
  GREEN: "bg-green-500 text-white",
  YELLOW: "bg-yellow-500 text-black",
  RED: "bg-red-500 text-white"
};

// ==================== HELPER COMPONENTS ====================

const StatusBadge = ({ status }) => (
  <Badge className={`${STATUS_COLORS[status] || "bg-gray-500"}`}>
    {status === "GREEN" && <CheckCircle2 className="w-3 h-3 mr-1" />}
    {status === "YELLOW" && <AlertTriangle className="w-3 h-3 mr-1" />}
    {status === "RED" && <XCircle className="w-3 h-3 mr-1" />}
    {status}
  </Badge>
);

const TierBadge = ({ tier }) => {
  const colors = {
    1: "bg-slate-500",
    2: "bg-blue-500",
    3: "bg-purple-500"
  };
  return <Badge className={`${colors[tier] || "bg-gray-500"} text-white`}>Tier {tier}</Badge>;
};

const FunctionBadge = ({ func }) => (
  <Badge className={`${FUNCTION_COLORS[func] || "bg-gray-500"} text-white`}>{func}</Badge>
);

const LevelBadge = ({ level }) => (
  <Badge className={`${LEVEL_COLORS[level] || "bg-gray-500"} text-white`}>{level}</Badge>
);

const StatCard = ({ title, value, icon: Icon, trend, color = "text-primary" }) => (
  <Card data-testid={`stat-card-${title.toLowerCase().replace(/\s/g, '-')}`}>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className={`h-4 w-4 ${color}`} />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {trend && (
        <p className="text-xs text-muted-foreground flex items-center mt-1">
          {trend > 0 ? <TrendingUp className="w-3 h-3 mr-1 text-green-500" /> : <TrendingDown className="w-3 h-3 mr-1 text-red-500" />}
          {Math.abs(trend)}% from last period
        </p>
      )}
    </CardContent>
  </Card>
);

// ==================== DASHBOARD COMPONENT ====================

const Dashboard = ({ stats, alerts, onRefresh }) => {
  if (!stats) return <div className="p-4">Loading dashboard...</div>;

  return (
    <div className="space-y-6" data-testid="dashboard">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <StatCard title="Playbooks" value={stats.total_playbooks} icon={BookOpen} color="text-blue-500" />
        <StatCard title="SOPs" value={stats.total_sops} icon={FileText} color="text-green-500" />
        <StatCard title="Talents" value={stats.total_talents} icon={Users} color="text-purple-500" />
        <StatCard title="Contracts" value={stats.total_contracts} icon={FileCheck} color="text-orange-500" />
        <StatCard title="KPIs" value={stats.total_kpis} icon={BarChart3} color="text-yellow-500" />
        <StatCard title="Active Alerts" value={stats.active_alerts} icon={AlertTriangle} color="text-red-500" />
        <StatCard title="Blocks Today" value={stats.gate_blocks_today} icon={Shield} color="text-slate-500" />
      </div>

      {/* Function Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Function Overview
          </CardTitle>
          <CardDescription>Status across all 6 functions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.function_stats?.map((func) => (
              <Card key={func.function} className="bg-muted/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <FunctionBadge func={func.function} />
                    <StatusBadge status={func.kpi_status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-center">
                      <div className="font-bold">{func.total_playbooks}</div>
                      <div className="text-muted-foreground text-xs">Playbooks</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold">{func.total_sops}</div>
                      <div className="text-muted-foreground text-xs">SOPs</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold">{func.total_talents}</div>
                      <div className="text-muted-foreground text-xs">Talents</div>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-xs">
                    <span>Tier Distribution:</span>
                    <span className="space-x-2">
                      <Badge variant="outline">T1: {func.tier_1_count}</Badge>
                      <Badge variant="outline">T2: {func.tier_2_count}</Badge>
                      <Badge variant="outline">T3: {func.tier_3_count}</Badge>
                    </span>
                  </div>
                  {func.active_alerts > 0 && (
                    <div className="flex items-center text-red-500 text-xs">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {func.active_alerts} active alert(s)
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Recent Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts && alerts.length > 0 ? (
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {alerts.slice(0, 10).map((alert) => (
                  <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <StatusBadge status={alert.severity} />
                    <div className="flex-1">
                      <div className="font-medium">{alert.title}</div>
                      <div className="text-sm text-muted-foreground">{alert.message}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(alert.created_at).toLocaleString()}
                      </div>
                    </div>
                    {alert.function && <FunctionBadge func={alert.function} />}
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
              No active alerts
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ==================== PLAYBOOKS COMPONENT ====================

const PlaybooksView = ({ playbooks, onRefresh }) => {
  const [filter, setFilter] = useState({ function: "all", level: "all" });
  const [showCreate, setShowCreate] = useState(false);
  const [newPlaybook, setNewPlaybook] = useState({
    playbook_id: "",
    name: "",
    function: "SALES",
    level: "ACQUIRE",
    min_tier: 1,
    description: "",
    linked_sop_ids: []
  });

  const filteredPlaybooks = playbooks?.filter(pb => {
    if (filter.function !== "all" && pb.function !== filter.function) return false;
    if (filter.level !== "all" && pb.level !== filter.level) return false;
    return true;
  }) || [];

  const groupedByFunction = filteredPlaybooks.reduce((acc, pb) => {
    if (!acc[pb.function]) acc[pb.function] = [];
    acc[pb.function].push(pb);
    return acc;
  }, {});

  const handleCreate = async () => {
    try {
      await axios.post(`${API}/playbooks`, newPlaybook);
      setShowCreate(false);
      setNewPlaybook({ playbook_id: "", name: "", function: "SALES", level: "ACQUIRE", min_tier: 1, description: "", linked_sop_ids: [] });
      onRefresh();
    } catch (error) {
      console.error("Error creating playbook:", error);
    }
  };

  return (
    <div className="space-y-6" data-testid="playbooks-view">
      {/* Filters & Actions */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          <Select value={filter.function} onValueChange={(v) => setFilter({ ...filter, function: v })}>
            <SelectTrigger className="w-40" data-testid="filter-function">
              <SelectValue placeholder="Function" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Functions</SelectItem>
              {FUNCTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filter.level} onValueChange={(v) => setFilter({ ...filter, level: v })}>
            <SelectTrigger className="w-40" data-testid="filter-level">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              {LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button data-testid="create-playbook-btn">
              <Plus className="w-4 h-4 mr-2" /> Add Playbook
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Playbook</DialogTitle>
              <DialogDescription>Add a new playbook to the system</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Playbook ID</Label>
                <Input placeholder="e.g., SALES-ACQ-04" value={newPlaybook.playbook_id} onChange={(e) => setNewPlaybook({ ...newPlaybook, playbook_id: e.target.value })} />
              </div>
              <div>
                <Label>Name</Label>
                <Input placeholder="Playbook name" value={newPlaybook.name} onChange={(e) => setNewPlaybook({ ...newPlaybook, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Function</Label>
                  <Select value={newPlaybook.function} onValueChange={(v) => setNewPlaybook({ ...newPlaybook, function: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FUNCTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Level</Label>
                  <Select value={newPlaybook.level} onValueChange={(v) => setNewPlaybook({ ...newPlaybook, level: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Minimum Tier Required: {newPlaybook.min_tier}</Label>
                <Slider value={[newPlaybook.min_tier]} onValueChange={([v]) => setNewPlaybook({ ...newPlaybook, min_tier: v })} min={1} max={3} step={1} className="mt-2" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea placeholder="Describe the playbook..." value={newPlaybook.description} onChange={(e) => setNewPlaybook({ ...newPlaybook, description: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate}>Create Playbook</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Playbooks Grid */}
      <div className="space-y-6">
        {Object.entries(groupedByFunction).map(([func, pbs]) => (
          <Card key={func}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FunctionBadge func={func} />
                <span>{func} Playbooks</span>
                <Badge variant="outline">{pbs.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pbs.map((pb) => (
                  <Card key={pb.playbook_id} className="bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="font-mono text-xs">{pb.playbook_id}</Badge>
                        <TierBadge tier={pb.min_tier} />
                      </div>
                      <CardTitle className="text-lg">{pb.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">{pb.description}</p>
                      <div className="flex items-center justify-between">
                        <LevelBadge level={pb.level} />
                        <span className="text-xs text-muted-foreground">
                          {pb.linked_sop_ids?.length || 0} SOPs linked
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// ==================== SOPs COMPONENT ====================

const SOPsView = ({ sops, onRefresh }) => {
  const [filter, setFilter] = useState({ function: "all" });
  const [expandedSOP, setExpandedSOP] = useState(null);

  const filteredSOPs = sops?.filter(sop => {
    if (filter.function !== "all" && sop.function !== filter.function) return false;
    return true;
  }) || [];

  return (
    <div className="space-y-6" data-testid="sops-view">
      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Select value={filter.function} onValueChange={(v) => setFilter({ ...filter, function: v })}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Function" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Functions</SelectItem>
            {FUNCTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
        <Badge variant="outline">{filteredSOPs.length} SOPs</Badge>
      </div>

      {/* SOPs List */}
      <div className="space-y-4">
        {filteredSOPs.map((sop) => (
          <Card key={sop.sop_id} className={expandedSOP === sop.sop_id ? "ring-2 ring-primary" : ""}>
            <CardHeader className="cursor-pointer" onClick={() => setExpandedSOP(expandedSOP === sop.sop_id ? null : sop.sop_id)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-mono">{sop.sop_id}</Badge>
                  <CardTitle className="text-lg">{sop.name}</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <FunctionBadge func={sop.function} />
                  <Badge variant="secondary">
                    <Clock className="w-3 h-3 mr-1" />
                    {sop.estimated_time_minutes} min
                  </Badge>
                  <ChevronRight className={`w-5 h-5 transition-transform ${expandedSOP === sop.sop_id ? "rotate-90" : ""}`} />
                </div>
              </div>
              <CardDescription>Template: {sop.template_required}</CardDescription>
            </CardHeader>
            {expandedSOP === sop.sop_id && (
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Linked Playbooks:</Label>
                    <div className="flex gap-2 mt-1">
                      {sop.linked_playbook_ids?.map(pbId => (
                        <Badge key={pbId} variant="outline">{pbId}</Badge>
                      ))}
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Steps ({sop.steps?.length || 0})</Label>
                    <div className="space-y-3">
                      {sop.steps?.map((step, idx) => (
                        <div key={idx} className="p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge>{step.step_number}</Badge>
                            <span className="font-medium">{step.title}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{step.description}</p>
                          {step.checklist_items?.length > 0 && (
                            <div className="space-y-1">
                              {step.checklist_items.map((item, i) => (
                                <div key={i} className="flex items-center gap-2 text-sm">
                                  <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                                  {item}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

// ==================== TALENTS COMPONENT ====================

const TalentsView = ({ talents, onRefresh }) => {
  const [filter, setFilter] = useState({ function: "all", tier: "all" });
  const [showCreate, setShowCreate] = useState(false);
  const [newTalent, setNewTalent] = useState({
    name: "",
    email: "",
    function: "SALES",
    subfunction: "",
    competency_scores: {
      communication: 3,
      technical_skills: 3,
      problem_solving: 3,
      time_management: 3,
      leadership: 3,
      adaptability: 3,
      domain_expertise: 3
    },
    tags: [],
    notes: ""
  });

  const filteredTalents = talents?.filter(t => {
    if (filter.function !== "all" && t.function !== filter.function) return false;
    if (filter.tier !== "all" && t.current_tier !== parseInt(filter.tier)) return false;
    return true;
  }) || [];

  const handleCreate = async () => {
    try {
      await axios.post(`${API}/talents`, newTalent);
      setShowCreate(false);
      setNewTalent({
        name: "", email: "", function: "SALES", subfunction: "",
        competency_scores: { communication: 3, technical_skills: 3, problem_solving: 3, time_management: 3, leadership: 3, adaptability: 3, domain_expertise: 3 },
        tags: [], notes: ""
      });
      onRefresh();
    } catch (error) {
      console.error("Error creating talent:", error);
    }
  };

  const updateScore = (key, value) => {
    setNewTalent({
      ...newTalent,
      competency_scores: { ...newTalent.competency_scores, [key]: value }
    });
  };

  return (
    <div className="space-y-6" data-testid="talents-view">
      {/* Filters & Actions */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          <Select value={filter.function} onValueChange={(v) => setFilter({ ...filter, function: v })}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Function" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Functions</SelectItem>
              {FUNCTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filter.tier} onValueChange={(v) => setFilter({ ...filter, tier: v })}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="1">Tier 1</SelectItem>
              <SelectItem value="2">Tier 2</SelectItem>
              <SelectItem value="3">Tier 3</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button data-testid="create-talent-btn">
              <Plus className="w-4 h-4 mr-2" /> Add Talent
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New Talent</DialogTitle>
              <DialogDescription>Create a new talent profile with competency scoring</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Name</Label>
                    <Input value={newTalent.name} onChange={(e) => setNewTalent({ ...newTalent, name: e.target.value })} />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input type="email" value={newTalent.email} onChange={(e) => setNewTalent({ ...newTalent, email: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Function</Label>
                    <Select value={newTalent.function} onValueChange={(v) => setNewTalent({ ...newTalent, function: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FUNCTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Subfunction</Label>
                    <Input value={newTalent.subfunction} onChange={(e) => setNewTalent({ ...newTalent, subfunction: e.target.value })} />
                  </div>
                </div>
                <Separator />
                <Label className="text-sm font-medium">Competency Scores (1-5)</Label>
                {Object.entries(newTalent.competency_scores).map(([key, value]) => (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">{key.replace(/_/g, " ")}</span>
                      <span className="font-medium">{value}</span>
                    </div>
                    <Slider value={[value]} onValueChange={([v]) => updateScore(key, v)} min={1} max={5} step={0.5} />
                  </div>
                ))}
                <div>
                  <Label>Notes</Label>
                  <Textarea value={newTalent.notes} onChange={(e) => setNewTalent({ ...newTalent, notes: e.target.value })} />
                </div>
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate}>Create Talent</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Talents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTalents.map((talent) => (
          <Card key={talent.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center text-white font-bold">
                    {talent.name.charAt(0)}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{talent.name}</CardTitle>
                    <CardDescription className="text-xs">{talent.email}</CardDescription>
                  </div>
                </div>
                <TierBadge tier={talent.current_tier} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <FunctionBadge func={talent.function} />
                <span className="text-sm text-muted-foreground">
                  Score: <span className="font-bold">{talent.tier_score?.toFixed(2)}</span>
                </span>
              </div>
              <div className="space-y-1">
                {Object.entries(talent.competency_scores || {}).slice(0, 4).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-24 capitalize">{key.replace(/_/g, " ")}</span>
                    <Progress value={(value / 5) * 100} className="h-1.5 flex-1" />
                    <span className="text-xs font-medium w-6">{value}</span>
                  </div>
                ))}
              </div>
              {talent.subfunction && (
                <Badge variant="outline" className="text-xs">{talent.subfunction}</Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// ==================== KPIs COMPONENT ====================

const KPIsView = ({ kpis, onRefresh }) => {
  const [filter, setFilter] = useState({ function: "all" });
  const [showRecord, setShowRecord] = useState(false);
  const [selectedKPI, setSelectedKPI] = useState(null);
  const [newValue, setNewValue] = useState({ current_value: 0, notes: "" });

  const filteredKPIs = kpis?.filter(kpi => {
    if (filter.function !== "all" && kpi.function !== filter.function) return false;
    return true;
  }) || [];

  const groupedKPIs = filteredKPIs.reduce((acc, kpi) => {
    if (!acc[kpi.function]) acc[kpi.function] = [];
    acc[kpi.function].push(kpi);
    return acc;
  }, {});

  const handleRecord = async () => {
    try {
      await axios.post(`${API}/kpi-values`, {
        kpi_id: selectedKPI.kpi_id,
        current_value: parseFloat(newValue.current_value),
        notes: newValue.notes
      });
      setShowRecord(false);
      setSelectedKPI(null);
      setNewValue({ current_value: 0, notes: "" });
      onRefresh();
    } catch (error) {
      console.error("Error recording KPI value:", error);
    }
  };

  return (
    <div className="space-y-6" data-testid="kpis-view">
      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Select value={filter.function} onValueChange={(v) => setFilter({ ...filter, function: v })}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Function" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Functions</SelectItem>
            {FUNCTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
        <Badge variant="outline">{filteredKPIs.length} KPIs</Badge>
      </div>

      {/* Record Value Dialog */}
      <Dialog open={showRecord} onOpenChange={setShowRecord}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record KPI Value</DialogTitle>
            <DialogDescription>
              {selectedKPI?.name} ({selectedKPI?.unit})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Current Value</Label>
              <Input type="number" step="0.1" value={newValue.current_value} onChange={(e) => setNewValue({ ...newValue, current_value: e.target.value })} />
              {selectedKPI && (
                <p className="text-xs text-muted-foreground mt-1">
                  Target: {selectedKPI.thresholds?.target} | Yellow: {selectedKPI.thresholds?.yellow_threshold} | Red: {selectedKPI.thresholds?.red_threshold}
                </p>
              )}
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={newValue.notes} onChange={(e) => setNewValue({ ...newValue, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecord(false)}>Cancel</Button>
            <Button onClick={handleRecord}>Record Value</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KPIs Grid */}
      {Object.entries(groupedKPIs).map(([func, funcKPIs]) => (
        <Card key={func}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FunctionBadge func={func} />
              <span>{func} KPIs</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {funcKPIs.map((kpi) => (
                <Card key={kpi.kpi_id} className="bg-muted/30">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="font-mono text-xs">{kpi.kpi_id}</Badge>
                      <Button size="sm" variant="ghost" onClick={() => { setSelectedKPI(kpi); setShowRecord(true); }}>
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <CardTitle className="text-base">{kpi.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-xs text-muted-foreground">{kpi.description}</p>
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-green-500" />
                      <span className="text-sm">Target: <strong>{kpi.thresholds?.target}</strong> {kpi.unit}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-yellow-500" />
                        Yellow: {kpi.thresholds?.yellow_threshold}
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        Red: {kpi.thresholds?.red_threshold}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {kpi.thresholds?.is_higher_better ? "↑ Higher is better" : "↓ Lower is better"}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// ==================== GATE CONSOLE COMPONENT ====================

const GateConsole = ({ playbooks, talents, onRefresh }) => {
  const [workflowConfig, setWorkflowConfig] = useState({
    client_package: "SILVER",
    level: "ACQUIRE",
    function: "SALES",
    playbook_id: "",
    talent_id: ""
  });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const availablePlaybooks = playbooks?.filter(pb => 
    pb.function === workflowConfig.function && pb.level === workflowConfig.level
  ) || [];

  const availableTalents = talents?.filter(t => t.function === workflowConfig.function) || [];

  const executeWorkflow = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/gates/execute/full-workflow`, null, {
        params: workflowConfig
      });
      setResults(response.data);
    } catch (error) {
      console.error("Error executing workflow:", error);
      setResults({ status: "ERROR", message: error.response?.data?.detail || "Unknown error" });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6" data-testid="gate-console">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            7-Gate Workflow Execution
          </CardTitle>
          <CardDescription>
            Execute the complete Labyrinth workflow through all 7 gates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <Label>Client Package</Label>
              <Select value={workflowConfig.client_package} onValueChange={(v) => setWorkflowConfig({ ...workflowConfig, client_package: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PACKAGES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Level</Label>
              <Select value={workflowConfig.level} onValueChange={(v) => setWorkflowConfig({ ...workflowConfig, level: v, playbook_id: "" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Function</Label>
              <Select value={workflowConfig.function} onValueChange={(v) => setWorkflowConfig({ ...workflowConfig, function: v, playbook_id: "", talent_id: "" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FUNCTIONS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Playbook</Label>
              <Select value={workflowConfig.playbook_id} onValueChange={(v) => setWorkflowConfig({ ...workflowConfig, playbook_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select playbook" /></SelectTrigger>
                <SelectContent>
                  {availablePlaybooks.map(pb => (
                    <SelectItem key={pb.playbook_id} value={pb.playbook_id}>
                      {pb.name} (Tier {pb.min_tier}+)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Talent</Label>
              <Select value={workflowConfig.talent_id} onValueChange={(v) => setWorkflowConfig({ ...workflowConfig, talent_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select talent" /></SelectTrigger>
                <SelectContent>
                  {availableTalents.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} (Tier {t.current_tier})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={executeWorkflow} 
                disabled={loading || !workflowConfig.playbook_id || !workflowConfig.talent_id}
                className="w-full"
                data-testid="execute-workflow-btn"
              >
                {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                Execute Workflow
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <Card className={results.status === "COMPLETED" ? "border-green-500" : results.status === "BLOCKED" ? "border-red-500" : "border-yellow-500"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {results.status === "COMPLETED" && <CheckCircle2 className="w-5 h-5 text-green-500" />}
              {results.status === "BLOCKED" && <XCircle className="w-5 h-5 text-red-500" />}
              {results.status === "WARNING" && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
              Workflow Result: {results.status}
              {results.blocked_at && <Badge variant="destructive" className="ml-2">Blocked at {results.blocked_at}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Gate Progress */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {results.results?.map((gate, idx) => (
                  <React.Fragment key={gate.gate}>
                    <div className={`flex items-center gap-1 px-3 py-2 rounded-lg ${
                      gate.result.status === "PASSED" ? "bg-green-100 text-green-800" :
                      gate.result.status === "BLOCKED" ? "bg-red-100 text-red-800" :
                      "bg-gray-100"
                    }`}>
                      {gate.result.status === "PASSED" ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      <span className="text-xs font-medium whitespace-nowrap">{gate.gate.replace(/_/g, " ")}</span>
                    </div>
                    {idx < results.results.length - 1 && <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                  </React.Fragment>
                ))}
              </div>

              {/* Summary */}
              {results.summary && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Playbook:</span>
                      <span className="ml-2 font-medium">{results.summary.playbook}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Talent:</span>
                      <span className="ml-2 font-medium">{results.summary.talent}</span>
                    </div>
                  </div>
                  {results.summary.activated_sops?.length > 0 && (
                    <div className="mt-3">
                      <span className="text-muted-foreground text-sm">Activated SOPs:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {results.summary.activated_sops.map(sop => (
                          <Badge key={sop.sop_id} variant="outline">{sop.name}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Alerts Generated */}
              {results.alerts?.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Alerts Generated:</Label>
                  <div className="space-y-2 mt-2">
                    {results.alerts.map((alert, idx) => (
                      <Alert key={idx} variant={alert.severity === "RED" ? "destructive" : "default"}>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>{alert.title}</AlertTitle>
                        <AlertDescription>{alert.message}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gate Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">7-Gate System</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { num: 1, name: "Strategy Selection", desc: "Eliminates 80% of options based on package" },
              { num: 2, name: "Level Selection", desc: "Sets phase context (Acquire/Maintain/Scale)" },
              { num: 3, name: "Playbook Selection", desc: "One playbook per function" },
              { num: 4, name: "Talent Matching", desc: "Tier enforcement (CRITICAL)" },
              { num: 5, name: "SOP Activation", desc: "Context-triggered procedures" },
              { num: 6, name: "Contract Enforcement", desc: "Accountability boundaries" },
              { num: 7, name: "KPI Feedback Loop", desc: "Self-monitoring and learning" }
            ].map(gate => (
              <div key={gate.num} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <Badge className="mt-0.5">{gate.num}</Badge>
                <div>
                  <div className="font-medium text-sm">{gate.name}</div>
                  <div className="text-xs text-muted-foreground">{gate.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ==================== CONTRACTS COMPONENT ====================

const ContractsView = ({ contracts, talents, playbooks, onRefresh }) => {
  const [showCreate, setShowCreate] = useState(false);
  const [newContract, setNewContract] = useState({
    talent_id: "",
    client_name: "",
    client_package: "SILVER",
    assigned_playbook_ids: [],
    start_date: new Date().toISOString().split('T')[0],
    hourly_rate: 0,
    monthly_retainer: 0
  });

  const handleCreate = async () => {
    try {
      await axios.post(`${API}/contracts`, {
        ...newContract,
        start_date: new Date(newContract.start_date).toISOString(),
        assigned_sop_ids: [],
        kpi_ids: [],
        boundaries: {
          max_hours_per_week: 40,
          response_time_hours: 24,
          deliverable_quality_min: 3.5,
          escalation_threshold_days: 3
        }
      });
      setShowCreate(false);
      onRefresh();
    } catch (error) {
      console.error("Error creating contract:", error);
    }
  };

  const getTalentName = (id) => talents?.find(t => t.id === id)?.name || id;

  return (
    <div className="space-y-6" data-testid="contracts-view">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Contracts ({contracts?.length || 0})</h2>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button data-testid="create-contract-btn"><Plus className="w-4 h-4 mr-2" /> New Contract</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Contract</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Talent</Label>
                <Select value={newContract.talent_id} onValueChange={(v) => setNewContract({ ...newContract, talent_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select talent" /></SelectTrigger>
                  <SelectContent>
                    {talents?.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Client Name</Label>
                <Input value={newContract.client_name} onChange={(e) => setNewContract({ ...newContract, client_name: e.target.value })} />
              </div>
              <div>
                <Label>Package</Label>
                <Select value={newContract.client_package} onValueChange={(v) => setNewContract({ ...newContract, client_package: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PACKAGES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={newContract.start_date} onChange={(e) => setNewContract({ ...newContract, start_date: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Hourly Rate ($)</Label>
                  <Input type="number" value={newContract.hourly_rate} onChange={(e) => setNewContract({ ...newContract, hourly_rate: parseFloat(e.target.value) })} />
                </div>
                <div>
                  <Label>Monthly Retainer ($)</Label>
                  <Input type="number" value={newContract.monthly_retainer} onChange={(e) => setNewContract({ ...newContract, monthly_retainer: parseFloat(e.target.value) })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {contracts?.map(contract => (
          <Card key={contract.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{contract.client_name}</CardTitle>
                <Badge className={contract.is_active ? "bg-green-500" : "bg-gray-500"}>{contract.is_active ? "Active" : "Inactive"}</Badge>
              </div>
              <CardDescription>Talent: {getTalentName(contract.talent_id)}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Package:</span>
                  <Badge variant="outline">{contract.client_package}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Start Date:</span>
                  <span>{new Date(contract.start_date).toLocaleDateString()}</span>
                </div>
                {contract.hourly_rate > 0 && (
                  <div className="flex justify-between">
                    <span>Hourly Rate:</span>
                    <span>${contract.hourly_rate}/hr</span>
                  </div>
                )}
                {contract.monthly_retainer > 0 && (
                  <div className="flex justify-between">
                    <span>Monthly Retainer:</span>
                    <span>${contract.monthly_retainer}/mo</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// ==================== SETTINGS COMPONENT ====================

const SettingsView = ({ onSeed }) => {
  const [credentials, setCredentials] = useState({
    platform: "n8n",
    base_url: "",
    api_key: ""
  });
  const [savedCreds, setSavedCreds] = useState([]);

  const fetchCredentials = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/platform-credentials`);
      setSavedCreds(response.data);
    } catch (error) {
      console.error("Error fetching credentials:", error);
    }
  }, []);

  useEffect(() => {
    fetchCredentials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveCredentials = async () => {
    try {
      await axios.post(`${API}/platform-credentials`, {
        platform: credentials.platform,
        credentials: {
          base_url: credentials.base_url,
          api_key: credentials.api_key
        }
      });
      fetchCredentials();
      setCredentials({ platform: "n8n", base_url: "", api_key: "" });
    } catch (error) {
      console.error("Error saving credentials:", error);
    }
  };

  return (
    <div className="space-y-6" data-testid="settings-view">
      <Card>
        <CardHeader>
          <CardTitle>System Actions</CardTitle>
          <CardDescription>Administrative actions for the Labyrinth system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Seed Database</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Initialize or reset the database with all 47 playbooks, SOPs, and KPIs from the specification.
            </p>
            <Button onClick={onSeed} data-testid="seed-data-btn">
              <RefreshCw className="w-4 h-4 mr-2" />
              Seed All Data
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Platform Credentials</CardTitle>
          <CardDescription>Configure integration credentials for external platforms</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Platform</Label>
              <Select value={credentials.platform} onValueChange={(v) => setCredentials({ ...credentials, platform: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="n8n">n8n</SelectItem>
                  <SelectItem value="clickup">ClickUp</SelectItem>
                  <SelectItem value="manatal">Manatal</SelectItem>
                  <SelectItem value="discord">Discord</SelectItem>
                  <SelectItem value="suitedash">SuiteDash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Base URL</Label>
              <Input placeholder="https://..." value={credentials.base_url} onChange={(e) => setCredentials({ ...credentials, base_url: e.target.value })} />
            </div>
            <div>
              <Label>API Key</Label>
              <Input type="password" placeholder="API Key" value={credentials.api_key} onChange={(e) => setCredentials({ ...credentials, api_key: e.target.value })} />
            </div>
          </div>
          <Button onClick={saveCredentials}>Save Credentials</Button>

          {savedCreds.length > 0 && (
            <div className="mt-4">
              <Label className="mb-2 block">Saved Credentials</Label>
              <div className="flex flex-wrap gap-2">
                {savedCreds.map(cred => (
                  <Badge key={cred.platform} variant="outline">{cred.platform}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ==================== MAIN APP ====================

function App() {
  // Initialize activeTab from URL or default to dashboard
  const getInitialTab = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromUrl = urlParams.get('tab');
    const workflowFromUrl = urlParams.get('workflow');
    // If workflow param exists, default to workflowviz tab
    if (workflowFromUrl) return 'workflowviz';
    if (tabFromUrl) return tabFromUrl;
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [playbooks, setPlaybooks] = useState([]);
  const [sops, setSOPs] = useState([]);
  const [talents, setTalents] = useState([]);
  const [kpis, setKPIs] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Update URL when tab changes
  const handleTabChange = useCallback((newTab) => {
    setActiveTab(newTab);
    const url = new URL(window.location);
    url.searchParams.set('tab', newTab);
    // Preserve workflow param when switching tabs (don't remove it)
    window.history.replaceState({}, '', url);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, alertsRes, playbooksRes, sopsRes, talentsRes, kpisRes, contractsRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`),
        axios.get(`${API}/alerts?is_resolved=false&limit=20`),
        axios.get(`${API}/playbooks`),
        axios.get(`${API}/sops`),
        axios.get(`${API}/talents`),
        axios.get(`${API}/kpis`),
        axios.get(`${API}/contracts`)
      ]);
      setStats(statsRes.data);
      setAlerts(alertsRes.data);
      setPlaybooks(playbooksRes.data);
      setSOPs(sopsRes.data);
      setTalents(talentsRes.data);
      setKPIs(kpisRes.data);
      setContracts(contractsRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSeed = async () => {
    try {
      await axios.post(`${API}/seed/all`);
      fetchData();
    } catch (error) {
      console.error("Error seeding data:", error);
    }
  };

  const NAV_ITEMS = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "workflowviz", label: "WorkflowViz", icon: Workflow },
    { id: "playbooks", label: "Playbooks", icon: BookOpen },
    { id: "sops", label: "SOPs", icon: FileText },
    { id: "talents", label: "Talents", icon: Users },
    { id: "kpis", label: "KPIs", icon: BarChart3 },
    { id: "gates", label: "Gate Console", icon: Shield },
    { id: "contracts", label: "Contracts", icon: FileCheck },
    { id: "settings", label: "Settings", icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-background" data-testid="labyrinth-app">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-xl">Labyrinth OS</h1>
                <p className="text-xs text-muted-foreground">7-Gate Constraint System</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={fetchData} data-testid="refresh-btn">
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              {stats?.active_alerts > 0 && (
                <Badge variant="destructive" className="animate-pulse">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {stats.active_alerts} Alerts
                </Badge>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            {NAV_ITEMS.map(item => (
              <TabsTrigger key={item.id} value={item.id} className="flex items-center gap-2" data-testid={`tab-${item.id}`}>
                <item.icon className="w-4 h-4" />
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="dashboard">
            <Dashboard stats={stats} alerts={alerts} onRefresh={fetchData} />
          </TabsContent>

          <TabsContent value="workflowviz">
            <WorkflowViz />
          </TabsContent>

          <TabsContent value="playbooks">
            <PlaybooksView playbooks={playbooks} onRefresh={fetchData} />
          </TabsContent>

          <TabsContent value="sops">
            <SOPsView sops={sops} onRefresh={fetchData} />
          </TabsContent>

          <TabsContent value="talents">
            <TalentsView talents={talents} onRefresh={fetchData} />
          </TabsContent>

          <TabsContent value="kpis">
            <KPIsView kpis={kpis} onRefresh={fetchData} />
          </TabsContent>

          <TabsContent value="gates">
            <GateConsole playbooks={playbooks} talents={talents} onRefresh={fetchData} />
          </TabsContent>

          <TabsContent value="contracts">
            <ContractsView contracts={contracts} talents={talents} playbooks={playbooks} onRefresh={fetchData} />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsView onSeed={handleSeed} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
