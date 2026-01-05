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
import {
  AlertTriangle, CheckCircle2, ChevronRight, ArrowRight, Zap,
  FileText, Clock, Users, Package, Play, RefreshCw, Layers,
  Target, Sparkles, ListChecks, FileCheck, ScrollText
} from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LabyrinthBuilder = ({ onWorkflowCreated }) => {
  // Data from API
  const [issueCategories, setIssueCategories] = useState([]);
  const [issueTypes, setIssueTypes] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [tiers, setTiers] = useState([]);
  
  // User selections
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedIssueType, setSelectedIssueType] = useState("");
  const [selectedSprint, setSelectedSprint] = useState("");
  const [selectedTier, setSelectedTier] = useState("");
  
  // Preview data
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  
  // Render dialog
  const [showRenderDialog, setShowRenderDialog] = useState(false);
  const [workflowName, setWorkflowName] = useState("");
  const [workflowDescription, setWorkflowDescription] = useState("");
  const [rendering, setRendering] = useState(false);
  const [renderResult, setRenderResult] = useState(null);
  
  // Loading states
  const [loading, setLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [categoriesRes, sprintsRes, tiersRes] = await Promise.all([
          axios.get(`${API}/builder/issues/categories`),
          axios.get(`${API}/builder/sprints`),
          axios.get(`${API}/builder/tiers`),
        ]);
        setIssueCategories(categoriesRes.data);
        setSprints(sprintsRes.data);
        setTiers(tiersRes.data);
      } catch (error) {
        console.error("Error loading builder data:", error);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  // Load issue types when category changes
  useEffect(() => {
    if (!selectedCategory) {
      setIssueTypes([]);
      setSelectedIssueType("");
      return;
    }
    
    const loadIssueTypes = async () => {
      try {
        const response = await axios.get(`${API}/builder/issues/types/${selectedCategory}`);
        setIssueTypes(response.data);
        setSelectedIssueType("");
      } catch (error) {
        console.error("Error loading issue types:", error);
      }
    };
    loadIssueTypes();
  }, [selectedCategory]);

  // Load preview when all selections are made
  useEffect(() => {
    if (!selectedCategory || !selectedIssueType || !selectedSprint || !selectedTier) {
      setPreview(null);
      return;
    }
    
    const loadPreview = async () => {
      setPreviewLoading(true);
      try {
        const response = await axios.get(`${API}/builder/preview`, {
          params: {
            issue_category: selectedCategory,
            issue_type_id: selectedIssueType,
            sprint: selectedSprint,
            tier: selectedTier,
          }
        });
        setPreview(response.data);
        
        // Auto-generate workflow name from selections
        const issueName = response.data.issue?.name || selectedIssueType;
        const sprintLabel = response.data.sprint?.label || selectedSprint;
        const tierLabel = selectedTier.replace("_", " ");
        const autoName = `${issueName} - ${sprintLabel} - ${tierLabel}`;
        setWorkflowName(autoName);
      } catch (error) {
        console.error("Error loading preview:", error);
      }
      setPreviewLoading(false);
    };
    loadPreview();
  }, [selectedCategory, selectedIssueType, selectedSprint, selectedTier]);

  // Get current step
  const getCurrentStep = () => {
    if (!selectedCategory) return 1;
    if (!selectedIssueType) return 2;
    if (!selectedSprint) return 3;
    if (!selectedTier) return 4;
    return 5; // Preview ready
  };

  // Handle render workflow
  const handleRenderWorkflow = async () => {
    if (!workflowName.trim()) return;
    
    setRendering(true);
    try {
      const response = await axios.post(`${API}/builder/render-workflow`, {
        selection: {
          issue_category: selectedCategory,
          issue_type_id: selectedIssueType,
          sprint: selectedSprint,
          tier: selectedTier,
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
    setSelectedCategory("");
    setSelectedIssueType("");
    setSelectedSprint("");
    setSelectedTier("");
    setPreview(null);
    setRenderResult(null);
    setWorkflowName("");
    setWorkflowDescription("");
  };

  const currentStep = getCurrentStep();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="labyrinth-builder">
      {/* Header */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                Labyrinth Builder
              </CardTitle>
              <CardDescription className="mt-1">
                Build workflows from your operational framework. Select your challenge, timeline, and resources.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RefreshCw className="w-4 h-4 mr-2" /> Reset
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Progress Indicator */}
      <div className="flex items-center justify-between px-4">
        {[
          { step: 1, label: "Issue", icon: AlertTriangle },
          { step: 2, label: "Type", icon: Target },
          { step: 3, label: "Sprint", icon: Clock },
          { step: 4, label: "Tier", icon: Users },
          { step: 5, label: "Render", icon: Sparkles },
        ].map((item, idx) => (
          <React.Fragment key={item.step}>
            <div className={`flex flex-col items-center ${currentStep >= item.step ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors
                ${currentStep > item.step ? 'bg-primary border-primary text-white' : 
                  currentStep === item.step ? 'border-primary bg-primary/10' : 'border-muted'}
              `}>
                {currentStep > item.step ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <item.icon className="w-5 h-5" />
                )}
              </div>
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </div>
            {idx < 4 && (
              <div className={`flex-1 h-0.5 mx-2 ${currentStep > item.step ? 'bg-primary' : 'bg-muted'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Step 1: Issue Category */}
        <Card className={currentStep === 1 ? "ring-2 ring-primary" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              1. Challenge Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category..." />
              </SelectTrigger>
              <SelectContent>
                {issueCategories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Step 2: Issue Type */}
        <Card className={currentStep === 2 ? "ring-2 ring-primary" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-orange-500" />
              2. Specific Issue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select 
              value={selectedIssueType} 
              onValueChange={setSelectedIssueType}
              disabled={!selectedCategory}
            >
              <SelectTrigger>
                <SelectValue placeholder={selectedCategory ? "Select issue..." : "Select category first"} />
              </SelectTrigger>
              <SelectContent>
                {issueTypes.map(type => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Step 3: Sprint Timeline */}
        <Card className={currentStep === 3 ? "ring-2 ring-primary" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-500" />
              3. Sprint Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select 
              value={selectedSprint} 
              onValueChange={setSelectedSprint}
              disabled={!selectedIssueType}
            >
              <SelectTrigger>
                <SelectValue placeholder={selectedIssueType ? "Select timeline..." : "Select issue first"} />
              </SelectTrigger>
              <SelectContent>
                {sprints.map(sprint => (
                  <SelectItem key={sprint.id} value={sprint.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: sprint.color }}
                      />
                      {sprint.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Step 4: Tier Selection */}
        <Card className={currentStep === 4 ? "ring-2 ring-primary" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-500" />
              4. Resource Tier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select 
              value={selectedTier} 
              onValueChange={setSelectedTier}
              disabled={!selectedSprint}
            >
              <SelectTrigger>
                <SelectValue placeholder={selectedSprint ? "Select tier..." : "Select sprint first"} />
              </SelectTrigger>
              <SelectContent>
                {tiers.map(tier => (
                  <SelectItem key={tier.id} value={tier.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: tier.color }}
                      />
                      {tier.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {/* Preview Section */}
      {currentStep >= 5 && (
        <Card className="border-green-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Workflow Preview
            </CardTitle>
            <CardDescription>
              Based on your selections, here's what will be included in your workflow
            </CardDescription>
          </CardHeader>
          <CardContent>
            {previewLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : preview ? (
              <div className="space-y-6">
                {/* Selection Summary */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-red-600 border-red-300">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {preview.issue?.name}
                  </Badge>
                  <ArrowRight className="w-4 h-4 text-muted-foreground self-center" />
                  <Badge variant="outline" style={{ borderColor: preview.sprint?.color, color: preview.sprint?.color }}>
                    <Clock className="w-3 h-3 mr-1" />
                    {preview.sprint?.label}
                  </Badge>
                  <ArrowRight className="w-4 h-4 text-muted-foreground self-center" />
                  <Badge variant="outline" className="text-purple-600 border-purple-300">
                    <Users className="w-3 h-3 mr-1" />
                    {preview.tier?.replace("_", " ")}
                  </Badge>
                </div>

                <Separator />

                {/* Content Counts */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">{preview.summary?.sop_count || 0}</div>
                    <div className="text-sm text-blue-700 flex items-center justify-center gap-1">
                      <ListChecks className="w-4 h-4" /> SOPs
                    </div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-3xl font-bold text-green-600">{preview.summary?.template_count || 0}</div>
                    <div className="text-sm text-green-700 flex items-center justify-center gap-1">
                      <FileText className="w-4 h-4" /> Templates
                    </div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-3xl font-bold text-purple-600">{preview.summary?.contract_count || 0}</div>
                    <div className="text-sm text-purple-700 flex items-center justify-center gap-1">
                      <ScrollText className="w-4 h-4" /> Contracts
                    </div>
                  </div>
                </div>

                {/* SOPs List */}
                {preview.sops?.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-blue-500" />
                      SOPs (Actions)
                    </h4>
                    <div className="space-y-2">
                      {preview.sops.map((sop, idx) => (
                        <div key={sop.id || idx} className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                          <Badge className="bg-blue-100 text-blue-700">{idx + 1}</Badge>
                          <span className="font-medium">{sop.name}</span>
                          {sop.description && (
                            <span className="text-sm text-muted-foreground">- {sop.description}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Templates List */}
                {preview.templates?.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Package className="w-4 h-4 text-green-500" />
                      Deliverable Templates
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {preview.templates.map((template, idx) => (
                        <Badge key={template.id || idx} variant="outline" className="bg-green-50">
                          {template.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contracts List */}
                {preview.contracts?.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-purple-500" />
                      Contracts
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {preview.contracts.map((contract, idx) => (
                        <Badge key={contract.id || idx} variant="outline" className="bg-purple-50">
                          {contract.name} ({contract.contract_type})
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* No data warning */}
                {preview.summary?.sop_count === 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>No SOPs configured</AlertTitle>
                    <AlertDescription>
                      No SOPs are configured for this Issue + Tier combination yet. 
                      The workflow will be created with placeholder nodes.
                    </AlertDescription>
                  </Alert>
                )}

                <Separator />

                {/* Render Button */}
                <Button 
                  size="lg" 
                  className="w-full"
                  onClick={() => setShowRenderDialog(true)}
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Render Workflow to Canvas
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Loading preview...
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Render Dialog */}
      <Dialog open={showRenderDialog} onOpenChange={setShowRenderDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Render Workflow
            </DialogTitle>
            <DialogDescription>
              Name your workflow and it will be created in WorkflowViz
            </DialogDescription>
          </DialogHeader>
          
          {!renderResult ? (
            <div className="space-y-4">
              <div>
                <Label>Workflow Name</Label>
                <Input
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  placeholder="e.g., Gold Client Onboarding - Tier 1"
                />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea
                  value={workflowDescription}
                  onChange={(e) => setWorkflowDescription(e.target.value)}
                  placeholder="Brief description of this workflow..."
                  rows={3}
                />
              </div>
            </div>
          ) : renderResult.error ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{renderResult.error}</AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <Alert className="border-green-500 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertTitle className="text-green-700">Workflow Created!</AlertTitle>
                <AlertDescription className="text-green-600">
                  "{renderResult.name}" has been created with {renderResult.nodes?.length || 0} nodes.
                </AlertDescription>
              </Alert>
              
              <div className="text-sm text-muted-foreground">
                <p>Included in workflow:</p>
                <ul className="list-disc ml-4 mt-1">
                  <li>{renderResult.sops?.length || 0} SOPs</li>
                  <li>{renderResult.templates?.length || 0} Templates</li>
                  <li>{renderResult.contracts?.length || 0} Contracts</li>
                </ul>
              </div>
            </div>
          )}

          <DialogFooter>
            {!renderResult ? (
              <>
                <Button variant="outline" onClick={() => setShowRenderDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleRenderWorkflow}
                  disabled={!workflowName.trim() || rendering}
                >
                  {rendering ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Create Workflow
                </Button>
              </>
            ) : renderResult.error ? (
              <Button variant="outline" onClick={() => {
                setRenderResult(null);
              }}>
                Try Again
              </Button>
            ) : (
              <div className="flex gap-2 w-full">
                <Button variant="outline" onClick={() => {
                  setShowRenderDialog(false);
                  setRenderResult(null);
                  handleReset();
                }}>
                  Create Another
                </Button>
                <Button className="flex-1" onClick={() => {
                  setShowRenderDialog(false);
                  if (onWorkflowCreated && renderResult.workflow_id) {
                    onWorkflowCreated(renderResult.workflow_id);
                  }
                }}>
                  <ArrowRight className="w-4 h-4 mr-2" />
                  View in WorkflowViz
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Legend / Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { 
                icon: AlertTriangle, 
                color: "text-red-500", 
                title: "Issue (Challenge)", 
                desc: "What's the challenge at hand? Client service, operations, crisis, etc." 
              },
              { 
                icon: Clock, 
                color: "text-yellow-500", 
                title: "Sprint (Timeline)", 
                desc: "How urgent? Red = 1-3 days, Purple = 6+ weeks" 
              },
              { 
                icon: Users, 
                color: "text-purple-500", 
                title: "Playbook (Tier)", 
                desc: "Level of resources: Tier 1 = Best, Tier 3 = Basic" 
              },
              { 
                icon: Sparkles, 
                color: "text-primary", 
                title: "Render", 
                desc: "Auto-generates workflow with SOPs, templates & contracts" 
              },
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <item.icon className={`w-5 h-5 mt-0.5 ${item.color}`} />
                <div>
                  <div className="font-medium text-sm">{item.title}</div>
                  <div className="text-xs text-muted-foreground">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LabyrinthBuilder;
