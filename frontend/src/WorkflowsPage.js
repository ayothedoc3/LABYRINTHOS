import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Layers, LayoutGrid, ChevronRight } from "lucide-react";
import LabyrinthBuilder from "./LabyrinthBuilder";
import WorkflowViz from "./WorkflowViz";

/**
 * WorkflowsPage - Combined Gate Console (Builder) + Canvas (WorkflowViz)
 * 
 * This component provides:
 * 1. Builder tab - Questionnaire to build workflows from selections
 * 2. Canvas tab - Visual workflow editor
 */
const WorkflowsPage = () => {
  const [activeSubTab, setActiveSubTab] = useState("builder");
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(null);

  // When a workflow is created in Builder, switch to Canvas
  const handleWorkflowCreated = (workflowId) => {
    setSelectedWorkflowId(workflowId);
    // Update URL with workflow ID
    const url = new URL(window.location);
    url.searchParams.set('workflow', workflowId);
    window.history.replaceState({}, '', url);
    // Switch to canvas view
    setActiveSubTab("canvas");
  };

  return (
    <div className="space-y-4">
      {/* Sub-navigation */}
      <div className="flex items-center gap-4 border-b pb-4">
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
        <WorkflowViz />
      )}
    </div>
  );
};

export default WorkflowsPage;
