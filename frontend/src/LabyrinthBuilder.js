import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle, CheckCircle2, ChevronRight, ArrowRight, Zap,
  FileText, Clock, Users, Package, Play, RefreshCw, Layers,
  Target, Sparkles, ListChecks, FileCheck, ScrollText, Info,
  Loader2, BookOpen, Briefcase, Settings2, TrendingUp, Calendar,
  DollarSign, Milestone
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LabyrinthBuilder = ({ onWorkflowCreated }) => {
  // Data from API
  const [issues, setIssues] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [playbooks, setPlaybooks] = useState([]);
  
  // User selections (4 dropdown inputs)
  const [selectedIssue, setSelectedIssue] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [selectedSprint, setSelectedSprint] = useState("");
  const [selectedPlaybook, setSelectedPlaybook] = useState("");
  
  // Matched templates (auto-fetched based on selections)
  const [matchedData, setMatchedData] = useState(null);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  
  // Render dialog
  const [showRenderDialog, setShowRenderDialog] = useState(false);
  const [workflowName, setWorkflowName] = useState("");
  const [workflowDescription, setWorkflowDescription] = useState("");
  const [rendering, setRendering] = useState(false);
  const [renderResult, setRenderResult] = useState(null);
  
  // Execution Plan state (Optimization Plan)
  const [executionPlan, setExecutionPlan] = useState(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [clientName, setClientName] = useState("");
  const [planBudget, setPlanBudget] = useState("");
  
  // Loading states
  const [loading, setLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [issuesRes, campaignsRes, sprintsRes, playbooksRes] = await Promise.all([
          axios.get(`${API}/builder/issues`),
          axios.get(`${API}/builder/campaigns`),
          axios.get(`${API}/builder/sprints`),
          axios.get(`${API}/builder/playbooks`),
        ]);
        setIssues(issuesRes.data);
        setCampaigns(campaignsRes.data);
        setSprints(sprintsRes.data);
        setPlaybooks(playbooksRes.data);
      } catch (error) {
        console.error("Error loading builder data:", error);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  // Load campaigns based on issue selection
  useEffect(() => {
    if (!selectedIssue) {
      return;
    }
    
    const loadCampaigns = async () => {
      try {
        const response = await axios.get(`${API}/builder/campaigns`, {
          params: { issue_id: selectedIssue }
        });
        setCampaigns(response.data);
      } catch (error) {
        console.error("Error loading campaigns:", error);
      }
    };
    loadCampaigns();
  }, [selectedIssue]);

  // Fetch matched templates when all 4 selections are made
  useEffect(() => {
    if (!selectedIssue || !selectedCampaign || !selectedSprint || !selectedPlaybook) {
      return;
    }
    
    const fetchMatchedTemplates = async () => {
      setLoadingTemplates(true);
      try {
        const response = await axios.get(`${API}/builder/match`, {
          params: {
            issue_id: selectedIssue,
            campaign_id: selectedCampaign,
            sprint_id: selectedSprint,
            playbook_id: selectedPlaybook,
          }
        });
        setMatchedData(response.data);
        
        // Auto-generate workflow name
        const issueName = issues.find(i => i.id === selectedIssue)?.name || selectedIssue;
        const campaignName = campaigns.find(c => c.id === selectedCampaign)?.name || selectedCampaign;
        setWorkflowName(`${issueName} - ${campaignName}`);
      } catch (error) {
        console.error("Error fetching matched templates:", error);
      }
      setLoadingTemplates(false);
    };
    fetchMatchedTemplates();
  }, [selectedIssue, selectedCampaign, selectedSprint, selectedPlaybook, issues, campaigns]);

  // Check if all selections are complete
  const isConfigComplete = selectedIssue && selectedCampaign && selectedSprint && selectedPlaybook;

  // Handle render workflow
  const handleRenderWorkflow = async () => {
    if (!workflowName.trim()) return;
    
    setRendering(true);
    try {
      const response = await axios.post(`${API}/builder/render-workflow`, {
        selection: {
          issue_id: selectedIssue,
          campaign_id: selectedCampaign,
          sprint_id: selectedSprint,
          playbook_id: selectedPlaybook,
        },
        workflow_name: workflowName,
        description: workflowDescription,
      });
      setRenderResult(response.data);
      
      // Notify parent to switch to WorkflowViz
      if (onWorkflowCreated) {
        onWorkflowCreated(response.data.workflow_id);
      }
    } catch (error) {
      console.error("Error rendering workflow:", error);
      setRenderResult({ error: error.response?.data?.detail || "Failed to render workflow" });
    }
    setRendering(false);
  };

  // Reset selections
  const handleReset = () => {
    setSelectedIssue("");
    setSelectedCampaign("");
    setSelectedSprint("");
    setSelectedPlaybook("");
    setMatchedData(null);
    setRenderResult(null);
    setWorkflowName("");
    setWorkflowDescription("");
    setExecutionPlan(null);
    setClientName("");
    setPlanBudget("");
  };

  // Generate Execution Plan (Optimization Plan)
  const handleGenerateExecutionPlan = async () => {
    if (!selectedIssue || !selectedCampaign || !selectedSprint || !selectedPlaybook) {
      return;
    }
    
    setGeneratingPlan(true);
    try {
      // Find the issue category from the selected issue
      const issue = issues.find(i => i.id === selectedIssue);
      const campaign = campaigns.find(c => c.id === selectedCampaign);
      const sprint = sprints.find(s => s.id === selectedSprint);
      const playbook = playbooks.find(p => p.id === selectedPlaybook);
      
      // Map builder selections to Playbook Engine strategy inputs
      const strategyInput = {
        issue_category: issue?.category || selectedIssue,
        issue_type_id: selectedCampaign,
        issue_name: `${issue?.name || selectedIssue} - ${campaign?.name || selectedCampaign}`,
        sprint_timeline: selectedSprint,
        tier: playbook?.tier || selectedPlaybook,
        client_name: clientName || undefined,
        description: workflowDescription || `Execution plan for ${issue?.name || selectedIssue}`,
        priority: selectedSprint === "YESTERDAY" || selectedSprint === "THREE_DAYS" ? "HIGH" : "MEDIUM",
        budget: planBudget ? parseFloat(planBudget) : undefined
      };
      
      const response = await axios.post(`${API}/playbook-engine/generate`, strategyInput);
      setExecutionPlan(response.data);
      setShowPlanDialog(true);
    } catch (error) {
      console.error("Error generating execution plan:", error);
      alert(error.response?.data?.detail || "Failed to generate execution plan");
    }
    setGeneratingPlan(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto" data-testid="labyrinth-builder">
      {/* Header Card */}
      <Card className="border-primary/20 mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Layers className="w-5 h-5 text-primary" />
                Labyrinth Builder
              </CardTitle>
              <CardDescription className="mt-1">
                Configure your workflow inputs and see matched templates automatically
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RefreshCw className="w-4 h-4 mr-2" /> Reset
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Main Content */}
      <Card>
        <CardContent className="pt-6">
          {/* Section: Configuration Inputs */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-primary" />
              Configuration Inputs
            </h3>
            <Separator className="mb-6" />
            
            <div className="space-y-6">
              {/* 1. Issue */}
              <div>
                <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold">1</span>
                  Issue
                </Label>
                <Select value={selectedIssue} onValueChange={setSelectedIssue}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select issue..." />
                  </SelectTrigger>
                  <SelectContent>
                    {issues.map(issue => (
                      <SelectItem key={issue.id} value={issue.id}>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                          {issue.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 2. Campaign */}
              <div>
                <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold">2</span>
                  Campaign
                </Label>
                <Select 
                  value={selectedCampaign} 
                  onValueChange={setSelectedCampaign}
                  disabled={!selectedIssue}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={selectedIssue ? "Select campaign..." : "Select issue first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {campaigns.map(campaign => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-orange-500" />
                          {campaign.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 3. Sprint */}
              <div>
                <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center text-xs font-bold">3</span>
                  Sprint
                </Label>
                <Select 
                  value={selectedSprint} 
                  onValueChange={setSelectedSprint}
                  disabled={!selectedCampaign}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={selectedCampaign ? "Select sprint..." : "Select campaign first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {sprints.map(sprint => (
                      <SelectItem key={sprint.id} value={sprint.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: sprint.color || '#FFA500' }}
                          />
                          <Clock className="w-4 h-4 text-yellow-500" />
                          {sprint.label || sprint.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 4. Playbook */}
              <div>
                <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">4</span>
                  Playbook
                </Label>
                <Select 
                  value={selectedPlaybook} 
                  onValueChange={setSelectedPlaybook}
                  disabled={!selectedSprint}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={selectedSprint ? "Select playbook..." : "Select sprint first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {playbooks.map(playbook => (
                      <SelectItem key={playbook.id} value={playbook.id}>
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-purple-500" />
                          {playbook.name}
                          {playbook.tier && (
                            <Badge variant="outline" className="text-xs ml-2">
                              Tier {playbook.tier}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Section: Matched Templates (only show when all selections are made) */}
          {isConfigComplete && (
            <div className="mt-8 border-t pt-8">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Matched Templates (Based on Configuration)
              </h3>
              <Separator className="mb-6" />

              {loadingTemplates ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="ml-3 text-muted-foreground">Loading matched templates...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* 5. SOPs */}
                  <div>
                    <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">5</span>
                      SOPs
                    </Label>
                    <div className="border rounded-lg p-4 bg-slate-50">
                      {matchedData?.sops?.length > 0 ? (
                        <ul className="space-y-2">
                          {matchedData.sops.map((sop, idx) => (
                            <li key={sop.id || idx} className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                              <span className="text-sm">{sop.name}</span>
                              {sop.sop_id && (
                                <Badge variant="outline" className="text-xs">{sop.sop_id}</Badge>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="flex items-center gap-2 text-amber-600">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm">No SOPs found for this configuration</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 6. Deliverable Templates */}
                  <div>
                    <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">6</span>
                      Deliverable Templates
                    </Label>
                    <div className="border rounded-lg p-4 bg-slate-50">
                      {matchedData?.deliverables?.length > 0 ? (
                        <ul className="space-y-2">
                          {matchedData.deliverables.map((template, idx) => (
                            <li key={template.id || idx} className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                              <span className="text-sm">{template.name}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="flex items-center gap-2 text-amber-600">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm">No deliverable templates found</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 7. Project-Based Contracts & KPIs */}
                  <div>
                    <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">7</span>
                      Project-Based Contracts & KPIs
                    </Label>
                    <div className="border rounded-lg p-4 bg-slate-50">
                      {matchedData?.projectContracts?.length > 0 ? (
                        <ul className="space-y-2">
                          {matchedData.projectContracts.map((contract, idx) => (
                            <li key={contract.id || idx} className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                              <span className="text-sm">{contract.name}</span>
                              {contract.type && (
                                <Badge variant="secondary" className="text-xs">{contract.type}</Badge>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="flex items-center gap-2 text-amber-600">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm">No project contracts found</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 8. Recurring Contracts & KPIs */}
                  <div>
                    <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center text-xs font-bold">8</span>
                      Recurring Contracts & KPIs
                    </Label>
                    <div className="border rounded-lg p-4 bg-slate-50">
                      {matchedData?.recurringContracts?.length > 0 ? (
                        <ul className="space-y-2">
                          {matchedData.recurringContracts.map((contract, idx) => (
                            <li key={contract.id || idx} className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                              <span className="text-sm">{contract.name}</span>
                              {contract.frequency && (
                                <Badge variant="secondary" className="text-xs">{contract.frequency}</Badge>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="flex items-center gap-2 text-amber-600">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm">No recurring contracts found</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 9. Optimization Plan - Connected to Playbook Engine */}
                  <div>
                    <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-xs font-bold">9</span>
                      Optimization Plan (Execution Engine)
                    </Label>
                    <div className="border rounded-lg p-4 bg-gradient-to-br from-pink-50 to-purple-50">
                      {executionPlan ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                              <span className="font-medium">{executionPlan.name}</span>
                            </div>
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              {executionPlan.status}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-4 gap-3 text-center text-sm">
                            <div className="p-2 bg-white rounded-lg">
                              <div className="font-bold text-lg">{executionPlan.milestones?.length || 0}</div>
                              <div className="text-xs text-muted-foreground">Milestones</div>
                            </div>
                            <div className="p-2 bg-white rounded-lg">
                              <div className="font-bold text-lg">{executionPlan.tasks?.length || 0}</div>
                              <div className="text-xs text-muted-foreground">Tasks</div>
                            </div>
                            <div className="p-2 bg-white rounded-lg">
                              <div className="font-bold text-lg">{executionPlan.roles?.length || 0}</div>
                              <div className="text-xs text-muted-foreground">Roles</div>
                            </div>
                            <div className="p-2 bg-white rounded-lg">
                              <div className="font-bold text-lg text-green-600">${(executionPlan.estimated_budget / 1000).toFixed(0)}k</div>
                              <div className="text-xs text-muted-foreground">Budget</div>
                            </div>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full"
                            onClick={() => setShowPlanDialog(true)}
                          >
                            <Zap className="w-4 h-4 mr-2" />
                            View Full Execution Plan
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-pink-700">
                            <Zap className="h-5 w-5" />
                            <span className="font-medium">Generate Execution Plan</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Transform your configuration into a complete execution plan with milestones, tasks, roles, and contracts.
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Client Name (optional)</Label>
                              <Input 
                                placeholder="Enter client name"
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Budget $ (optional)</Label>
                              <Input 
                                type="number"
                                placeholder="e.g., 50000"
                                value={planBudget}
                                onChange={(e) => setPlanBudget(e.target.value)}
                                className="mt-1"
                              />
                            </div>
                          </div>
                          <Button 
                            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                            onClick={handleGenerateExecutionPlan}
                            disabled={generatingPlan}
                          >
                            {generatingPlan ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Generating Plan...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4 mr-2" />
                                Generate Execution Plan
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator className="my-6" />

                  {/* Generate Workflow Button */}
                  <Button 
                    size="lg" 
                    className="w-full"
                    onClick={() => setShowRenderDialog(true)}
                    disabled={loadingTemplates}
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate Workflow
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Empty state when not all selections made */}
          {!isConfigComplete && (
            <div className="mt-8 border-t pt-8">
              <div className="text-center text-muted-foreground py-12">
                <Settings2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-sm">Complete all 4 configuration inputs above to see matched templates</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Render Dialog */}
      <Dialog open={showRenderDialog} onOpenChange={setShowRenderDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Generate Workflow
            </DialogTitle>
            <DialogDescription>
              Create a visual workflow on the canvas based on your configuration
            </DialogDescription>
          </DialogHeader>
          
          {renderResult ? (
            renderResult.error ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{renderResult.error}</AlertDescription>
              </Alert>
            ) : (
              <Alert className="border-green-500">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertTitle>Workflow Created!</AlertTitle>
                <AlertDescription>
                  Created workflow with {renderResult.nodes_created} nodes and {renderResult.edges_created} connections.
                </AlertDescription>
              </Alert>
            )
          ) : (
            <div className="space-y-4">
              <div>
                <Label>Workflow Name</Label>
                <Input 
                  value={workflowName} 
                  onChange={(e) => setWorkflowName(e.target.value)}
                  placeholder="Enter workflow name..."
                />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea 
                  value={workflowDescription} 
                  onChange={(e) => setWorkflowDescription(e.target.value)}
                  placeholder="Describe this workflow..."
                  rows={3}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            {renderResult ? (
              <Button onClick={() => {
                setShowRenderDialog(false);
                setRenderResult(null);
                handleReset();
              }}>
                Close & Start New
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setShowRenderDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleRenderWorkflow} disabled={rendering || !workflowName.trim()}>
                  {rendering ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Generate
                    </>
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LabyrinthBuilder;
