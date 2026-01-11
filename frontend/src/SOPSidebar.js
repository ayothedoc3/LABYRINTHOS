import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Checkbox } from './components/ui/checkbox';
import { Progress } from './components/ui/progress';
import { ScrollArea } from './components/ui/scroll-area';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger
} from './components/ui/collapsible';
import {
  BookOpen, ChevronRight, ChevronDown, CheckCircle, ListChecks,
  Sparkles, ExternalLink, FileText, Clock
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL || '';

/**
 * SOPSidebar - Contextual SOP display for deals, contracts, and other entities
 * 
 * Usage:
 * <SOPSidebar 
 *   stage="proposal"
 *   dealType="upsell"
 *   entityType="deal"
 *   entityId="deal_123"
 *   onUseTemplate={(sop) => {...}}
 * />
 */
const SOPSidebar = ({ 
  stage, 
  dealType, 
  entityType = 'deal',
  entityId,
  onUseTemplate,
  className = ''
}) => {
  const [sops, setSOPs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSOPs, setExpandedSOPs] = useState({});
  const [checklistProgress, setChecklistProgress] = useState({});

  const fetchRelevantSOPs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (stage) params.stage = stage;
      if (dealType) params.deal_type = dealType;
      if (entityType) params.entity_type = entityType;
      
      const res = await axios.get(`${API}/api/knowledge-base/relevant`, { params });
      setSOPs(res.data.sops || []);
      
      // Fetch checklist progress if we have an entity
      if (entityType && entityId) {
        const progressRes = await axios.get(`${API}/api/knowledge-base/checklist-progress/${entityType}/${entityId}`);
        const progressMap = {};
        (progressRes.data.progress || []).forEach(p => {
          progressMap[p.sop_id] = p.completed_items || [];
        });
        setChecklistProgress(progressMap);
      }
    } catch (err) {
      console.error('Error fetching relevant SOPs:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRelevantSOPs();
  }, [stage, dealType, entityType, entityId]);

  const toggleExpand = (sopId) => {
    setExpandedSOPs(prev => ({
      ...prev,
      [sopId]: !prev[sopId]
    }));
  };

  const handleChecklistToggle = async (sopId, itemId) => {
    const currentItems = checklistProgress[sopId] || [];
    const newItems = currentItems.includes(itemId)
      ? currentItems.filter(id => id !== itemId)
      : [...currentItems, itemId];
    
    setChecklistProgress(prev => ({
      ...prev,
      [sopId]: newItems
    }));

    // Save progress to backend
    if (entityType && entityId) {
      try {
        await axios.post(`${API}/api/knowledge-base/checklist-progress`, {
          sop_id: sopId,
          entity_type: entityType,
          entity_id: entityId,
          completed_items: newItems
        });
      } catch (err) {
        console.error('Error saving checklist progress:', err);
      }
    }
  };

  const getChecklistCompletion = (sop) => {
    const completed = checklistProgress[sop.id] || [];
    const required = sop.checklist?.filter(item => item.required) || [];
    return {
      completed: completed.length,
      required: required.length,
      percent: required.length > 0 ? Math.round((completed.length / required.length) * 100) : 100,
      isComplete: required.every(item => completed.includes(item.id))
    };
  };

  if (loading) {
    return (
      <Card className={`${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4 animate-pulse" />
            Loading guidance...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sops.length === 0) {
    return (
      <Card className={`${className}`}>
        <CardContent className="p-4 text-center">
          <BookOpen className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">No SOPs for this stage</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className}`} data-testid="sop-sidebar">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          Guidance & SOPs
          <Badge variant="outline" className="ml-auto">{sops.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <ScrollArea className="h-[400px]">
          <div className="space-y-2 pr-2">
            {sops.map(sop => {
              const isExpanded = expandedSOPs[sop.id];
              const completion = getChecklistCompletion(sop);
              const hasChecklist = sop.checklist?.length > 0;
              const hasTemplate = sop.template_variables?.length > 0;
              
              return (
                <Collapsible 
                  key={sop.id} 
                  open={isExpanded}
                  onOpenChange={() => toggleExpand(sop.id)}
                >
                  <Card className="border-muted">
                    <CollapsibleTrigger asChild>
                      <CardContent className="p-3 cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-start gap-2">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 mt-0.5 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="w-4 h-4 mt-0.5 text-muted-foreground" />
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm">{sop.title}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              {hasChecklist && (
                                <div className="flex items-center gap-1">
                                  {completion.isComplete ? (
                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                  ) : (
                                    <ListChecks className="w-3 h-3 text-muted-foreground" />
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    {completion.completed}/{completion.required}
                                  </span>
                                </div>
                              )}
                              {hasTemplate && (
                                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                  <Sparkles className="w-3 h-3 mr-1" />
                                  Template
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        {hasChecklist && !completion.isComplete && (
                          <Progress 
                            value={completion.percent} 
                            className="h-1 mt-2" 
                          />
                        )}
                      </CardContent>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="px-3 pb-3 pt-0 border-t">
                        <p className="text-xs text-muted-foreground mt-2 mb-3">
                          {sop.description}
                        </p>
                        
                        {/* Checklist */}
                        {hasChecklist && (
                          <div className="space-y-2 mb-3">
                            <h5 className="text-xs font-semibold text-muted-foreground uppercase">
                              Checklist
                            </h5>
                            {sop.checklist.map(item => {
                              const isChecked = (checklistProgress[sop.id] || []).includes(item.id);
                              return (
                                <div key={item.id} className="flex items-start gap-2">
                                  <Checkbox 
                                    checked={isChecked}
                                    onCheckedChange={() => handleChecklistToggle(sop.id, item.id)}
                                    id={`${sop.id}-${item.id}`}
                                  />
                                  <label 
                                    htmlFor={`${sop.id}-${item.id}`}
                                    className={`text-xs cursor-pointer ${isChecked ? 'line-through text-muted-foreground' : ''}`}
                                  >
                                    {item.text}
                                    {item.required && <span className="text-red-500 ml-0.5">*</span>}
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        
                        {/* Actions */}
                        <div className="flex gap-2">
                          {hasTemplate && onUseTemplate && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => onUseTemplate(sop)}
                            >
                              <Sparkles className="w-3 h-3 mr-1" />
                              Use Template
                            </Button>
                          )}
                          {sop.external_url && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="text-xs h-7"
                              asChild
                            >
                              <a href={sop.external_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-3 h-3 mr-1" />
                                View Full
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default SOPSidebar;
