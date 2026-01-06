import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Layers, LayoutGrid, ChevronRight, FileText, Sparkles, 
  Calendar, Trash2, Eye, RefreshCw, FolderOpen
} from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, 
  DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import LabyrinthBuilder from "./LabyrinthBuilder";
import WorkflowViz from "./WorkflowViz";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * WorkflowsPage - Combined Gate Console (Builder) + Canvas (WorkflowViz) + Saved Workflows
 */
const WorkflowsPage = () => {
  const [activeSubTab, setActiveSubTab] = useState("builder");
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(null);
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadWorkflows = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/workflowviz/workflows`);
      setWorkflows(response.data);
    } catch (error) {
      console.error("Error loading workflows:", error);
    }
    setLoading(false);
  }, []);

  // Load saved workflows
  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  // When a workflow is created in Builder, switch to Canvas
  const handleWorkflowCreated = (workflowId) => {
    setSelectedWorkflowId(workflowId);
    loadWorkflows(); // Refresh list
    const url = new URL(window.location);
    url.searchParams.set('workflow', workflowId);
    window.history.replaceState({}, '', url);
    setActiveSubTab("canvas");
  };

  // Open workflow in canvas
  const handleOpenWorkflow = (workflow) => {
    setSelectedWorkflowId(workflow.id);
    setActiveSubTab("canvas");
  };

  // Delete workflow
  const handleDeleteWorkflow = async () => {
    if (!workflowToDelete) return;
    setDeleting(true);
    try {
      await axios.delete(`${API}/workflows/${workflowToDelete.id}`);
      await loadWorkflows();
      setDeleteDialogOpen(false);
      setWorkflowToDelete(null);
    } catch (error) {
      console.error("Error deleting workflow:", error);
    }
    setDeleting(false);
  };

  return (
    <TooltipProvider>
      <div className="flex gap-6">
        {/* Left Sidebar - Saved Workflows */}
        <div className="w-72 flex-shrink-0">
          <Card className="h-[calc(100vh-200px)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-primary" />
                Saved Workflows
              </CardTitle>
              <CardDescription className="text-xs">
                {workflows.length} workflow{workflows.length !== 1 ? 's' : ''} saved
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[calc(100vh-300px)]">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : workflows.length === 0 ? (
                  <div className="text-center py-8 px-4 text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No workflows yet</p>
                    <p className="text-xs mt-1">Create one using the Builder</p>
                  </div>
                ) : (
                  <div className="space-y-1 p-2">
                    {workflows.map((wf) => (
                      <div
                        key={wf.id}
                        className={`
                          p-3 rounded-lg cursor-pointer transition-all group relative
                          hover:bg-muted/80 border border-transparent
                          ${selectedWorkflowId === wf.id ? 'bg-primary/10 border-primary/30' : ''}
                        `}
                        onClick={() => handleOpenWorkflow(wf)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate flex items-center gap-1.5">
                              {wf.name}
                              {wf.builder_generated && (
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Sparkles className="w-3 h-3 text-primary flex-shrink-0" />
                                  </TooltipTrigger>
                                  <TooltipContent>Built from Gate Console</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(wf.updated_at || wf.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            {wf.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {wf.description}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenWorkflow(wf);
                                  }}
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View on Canvas</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setWorkflowToDelete(wf);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete Workflow</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0">
          {/* Sub-navigation */}
          <div className="flex items-center gap-4 border-b pb-4 mb-4">
            <Button
              variant={activeSubTab === "builder" ? "default" : "ghost"}
              onClick={() => setActiveSubTab("builder")}
              className="flex items-center gap-2"
            >
              <Layers className="w-4 h-4" />
              Builder
            </Button>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <Button
              variant={activeSubTab === "canvas" ? "default" : "ghost"}
              onClick={() => setActiveSubTab("canvas")}
              className="flex items-center gap-2"
            >
              <LayoutGrid className="w-4 h-4" />
              Canvas
            </Button>
          </div>

          {/* Content */}
          {activeSubTab === "builder" && (
            <LabyrinthBuilder onWorkflowCreated={handleWorkflowCreated} />
          )}
          
          {activeSubTab === "canvas" && (
            <WorkflowViz 
              initialWorkflowId={selectedWorkflowId}
              onWorkflowChange={loadWorkflows}
            />
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="w-5 h-5" />
                Delete Workflow
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete &quot;<span className="font-medium">{workflowToDelete?.name}</span>&quot;? 
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteWorkflow} disabled={deleting}>
                {deleting ? (
                  <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Deleting...</>
                ) : (
                  <><Trash2 className="w-4 h-4 mr-2" /> Delete</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

export default WorkflowsPage;
