import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './components/ui/card';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Textarea } from './components/ui/textarea';
import { Checkbox } from './components/ui/checkbox';
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
  BookOpen, FileText, Search, Plus, ChevronRight, ChevronDown,
  FolderOpen, RefreshCw, TrendingUp, Users, Settings, DollarSign,
  GraduationCap, Eye, Copy, CheckCircle, Clock, Tag, ExternalLink,
  ListChecks, Sparkles, Save, Bell, Brain, AlertTriangle, ArrowRight,
  Lightbulb, Wand2
} from 'lucide-react';
import TeamTrainings from './TeamTrainings';

const API = process.env.REACT_APP_BACKEND_URL || '';

const CATEGORY_CONFIG = {
  sales: { label: 'Sales SOPs', icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  client_success: { label: 'Client Success', icon: Users, color: 'text-green-500', bg: 'bg-green-500/10' },
  operations: { label: 'Operations', icon: Settings, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  finance: { label: 'Finance', icon: DollarSign, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  training: { label: 'Training', icon: GraduationCap, color: 'text-pink-500', bg: 'bg-pink-500/10' },
  templates: { label: 'Templates', icon: FileText, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  general: { label: 'General', icon: BookOpen, color: 'text-gray-500', bg: 'bg-gray-500/10' }
};

// ==================== SOP VIEWER ====================
const SOPViewer = ({ sop, onClose, onUseTemplate }) => {
  const [checklistProgress, setChecklistProgress] = useState({});
  const categoryConfig = CATEGORY_CONFIG[sop?.category] || CATEGORY_CONFIG.general;

  useEffect(() => {
    // Track view
    if (sop?.id) {
      axios.post(`${API}/api/knowledge-base/sops/${sop.id}/track-view`).catch(() => {});
    }
  }, [sop?.id]);

  const handleChecklistToggle = (itemId) => {
    setChecklistProgress(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const completedCount = Object.values(checklistProgress).filter(Boolean).length;
  const totalRequired = sop?.checklist?.filter(item => item.required).length || 0;

  if (!sop) return null;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge className={`${categoryConfig.bg} ${categoryConfig.color}`}>
              {categoryConfig.label}
            </Badge>
            {sop.relevant_stages?.map(stage => (
              <Badge key={stage} variant="outline" className="text-xs capitalize">
                {stage}
              </Badge>
            ))}
          </div>
          <h2 className="text-xl font-bold">{sop.title}</h2>
          <p className="text-sm text-muted-foreground mt-1">{sop.description}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Eye className="w-4 h-4" />
          {sop.views || 0} views
        </div>
      </div>

      {/* Checklist Section */}
      {sop.checklist?.length > 0 && (
        <Card className="mb-4 border-primary/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <ListChecks className="w-4 h-4 text-primary" />
                Checklist
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {completedCount}/{totalRequired} complete
              </span>
            </div>
            <Progress value={(completedCount / totalRequired) * 100} className="h-1.5" />
          </CardHeader>
          <CardContent className="pt-2">
            <div className="space-y-2">
              {sop.checklist.map(item => (
                <div key={item.id} className="flex items-start gap-2">
                  <Checkbox 
                    checked={checklistProgress[item.id] || false}
                    onCheckedChange={() => handleChecklistToggle(item.id)}
                    id={item.id}
                  />
                  <label 
                    htmlFor={item.id}
                    className={`text-sm cursor-pointer ${checklistProgress[item.id] ? 'line-through text-muted-foreground' : ''}`}
                  >
                    {item.text}
                    {item.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      <ScrollArea className="flex-1 pr-4">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown>{sop.content}</ReactMarkdown>
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="flex gap-2 mt-4 pt-4 border-t">
        {sop.template_variables?.length > 0 && (
          <Button onClick={() => onUseTemplate(sop)} data-testid="use-template-btn">
            <Sparkles className="w-4 h-4 mr-2" />
            Use Template
          </Button>
        )}
        {sop.external_url && (
          <Button variant="outline" asChild>
            <a href={sop.external_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in Google Docs
            </a>
          </Button>
        )}
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
};

// ==================== TEMPLATE FILLER ====================
const TemplateFiller = ({ sop, onClose, onGenerate }) => {
  const [formData, setFormData] = useState({});
  const [generatedContent, setGeneratedContent] = useState('');
  const [generating, setGenerating] = useState(false);
  const [autoFillMode, setAutoFillMode] = useState(false);
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [availableEntities, setAvailableEntities] = useState([]);
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [saving, setSaving] = useState(false);
  const [documentTitle, setDocumentTitle] = useState('');
  const [savedSuccessfully, setSavedSuccessfully] = useState(false);

  // Fetch available entities when entity type changes
  useEffect(() => {
    if (entityType) {
      fetchEntities();
    }
  }, [entityType]);

  const fetchEntities = async () => {
    setLoadingEntities(true);
    try {
      let endpoint = '';
      if (entityType === 'deal') {
        endpoint = `${API}/api/leads`;
      } else if (entityType === 'contract') {
        endpoint = `${API}/api/contracts`;
      } else if (entityType === 'client') {
        endpoint = `${API}/api/clients`;
      }
      
      if (endpoint) {
        const res = await axios.get(endpoint);
        const data = res.data.leads || res.data.contracts || res.data.clients || [];
        setAvailableEntities(data.slice(0, 20)); // Limit to 20
      }
    } catch (err) {
      console.error('Error fetching entities:', err);
      setAvailableEntities([]);
    }
    setLoadingEntities(false);
  };

  const handleAutoFill = async () => {
    if (!entityType || !entityId) return;
    
    setGenerating(true);
    try {
      const res = await axios.post(
        `${API}/api/knowledge-base/templates/${sop.id}/fill-from-entity?entity_type=${entityType}&entity_id=${entityId}`
      );
      
      // Pre-fill form data with auto-filled values
      setFormData(res.data.auto_filled_data || {});
      setGeneratedContent(res.data.filled_content || '');
      setDocumentTitle(`${sop.title} - ${entityType.charAt(0).toUpperCase() + entityType.slice(1)} ${entityId}`);
    } catch (err) {
      console.error('Error auto-filling:', err);
      alert('Failed to auto-fill from entity. You can still fill manually.');
    }
    setGenerating(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      // Fill template with form data
      let content = sop.content;
      for (const [key, value] of Object.entries(formData)) {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        content = content.replace(regex, value || '');
      }
      setGeneratedContent(content);
      
      // Track usage
      await axios.post(`${API}/api/knowledge-base/sops/${sop.id}/track-use`);
    } catch (err) {
      console.error('Error generating:', err);
    }
    setGenerating(false);
  };

  const handleSaveDocument = async () => {
    if (!generatedContent) return;
    
    setSaving(true);
    try {
      await axios.post(`${API}/api/knowledge-base/documents/save`, {
        template_id: sop.id,
        title: documentTitle || `${sop.title} - ${new Date().toLocaleDateString()}`,
        content: generatedContent,
        entity_type: entityType || null,
        entity_id: entityId || null,
        filled_data: formData
      });
      setSavedSuccessfully(true);
      setTimeout(() => setSavedSuccessfully(false), 3000);
    } catch (err) {
      console.error('Error saving document:', err);
      alert('Failed to save document');
    }
    setSaving(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent);
  };

  return (
    <div className="space-y-4">
      {/* Auto-Fill Section */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">Auto-Fill from CRM</span>
            <Badge variant="outline" className="text-xs">Optional</Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Entity Type</Label>
              <Select value={entityType} onValueChange={setEntityType}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deal">Deal / Lead</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Select Record</Label>
              <Select 
                value={entityId} 
                onValueChange={setEntityId}
                disabled={!entityType || loadingEntities}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={loadingEntities ? "Loading..." : "Select record..."} />
                </SelectTrigger>
                <SelectContent>
                  {availableEntities.map(entity => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.name || entity.title || entity.client_name || entity.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleAutoFill}
            disabled={!entityType || !entityId || generating}
            className="mt-3"
          >
            <RefreshCw className={`w-3 h-3 mr-2 ${generating ? 'animate-spin' : ''}`} />
            Auto-Fill Data
          </Button>
        </CardContent>
      </Card>

      {/* Manual Form Fields */}
      <div className="grid grid-cols-2 gap-4">
        {sop.template_variables?.map(variable => (
          <div key={variable.name}>
            <Label className="text-sm">{variable.label}</Label>
            {variable.type === 'text' || variable.type === 'number' || variable.type === 'date' ? (
              <Input 
                type={variable.type}
                value={formData[variable.name] || ''}
                onChange={(e) => setFormData({...formData, [variable.name]: e.target.value})}
                placeholder={variable.default_value || `Enter ${variable.label.toLowerCase()}`}
              />
            ) : variable.type === 'select' ? (
              <Select 
                value={formData[variable.name] || ''}
                onValueChange={(v) => setFormData({...formData, [variable.name]: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${variable.label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bronze">Bronze</SelectItem>
                  <SelectItem value="silver">Silver</SelectItem>
                  <SelectItem value="gold">Gold</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input 
                value={formData[variable.name] || ''}
                onChange={(e) => setFormData({...formData, [variable.name]: e.target.value})}
              />
            )}
          </div>
        ))}
      </div>

      <Button onClick={handleGenerate} disabled={generating} className="w-full" data-testid="generate-document-btn">
        {generating ? 'Generating...' : 'Generate Document'}
      </Button>

      {generatedContent && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Generated Content</Label>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                <Copy className="w-4 h-4 mr-1" />
                Copy
              </Button>
            </div>
          </div>
          <ScrollArea className="h-64 border rounded-lg p-4 bg-muted/30">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{generatedContent}</ReactMarkdown>
            </div>
          </ScrollArea>
          
          {/* Save Document Section */}
          <Card className="border-primary/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Input 
                    placeholder="Document title..."
                    value={documentTitle}
                    onChange={(e) => setDocumentTitle(e.target.value)}
                    className="h-9"
                  />
                </div>
                <Button 
                  onClick={handleSaveDocument} 
                  disabled={saving}
                  size="sm"
                  data-testid="save-document-btn"
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                  ) : savedSuccessfully ? (
                    <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
                  ) : (
                    <Save className="w-4 h-4 mr-1" />
                  )}
                  {savedSuccessfully ? 'Saved!' : saving ? 'Saving...' : 'Save Document'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

// ==================== AI RECOMMENDATIONS PANEL ====================
const AIRecommendationsPanel = ({ userId = 'demo_user', role, currentStage, onSelectSOP }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState('');
  const [suggestedAction, setSuggestedAction] = useState('');
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [newChecklistRequest, setNewChecklistRequest] = useState({ title: '', description: '', category: 'general' });
  const [generatedChecklist, setGeneratedChecklist] = useState(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchRecommendations();
    fetchAlerts();
  }, [userId, role, currentStage]);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/knowledge-base/ai/recommendations`, {
        user_id: userId,
        role: role,
        current_stage: currentStage,
        recent_activity: []
      });
      setRecommendations(res.data.recommendations || []);
      setInsights(res.data.insights || '');
      setSuggestedAction(res.data.suggested_action || '');
    } catch (err) {
      console.error('Error fetching AI recommendations:', err);
    }
    setLoading(false);
  };

  const fetchAlerts = async () => {
    try {
      const params = new URLSearchParams({ role: role || '', current_stage: currentStage || '' });
      const res = await axios.get(`${API}/api/knowledge-base/ai/proactive-alerts/${userId}?${params}`);
      setAlerts(res.data.alerts || []);
    } catch (err) {
      console.error('Error fetching alerts:', err);
    }
  };

  const handleGenerateChecklist = async () => {
    if (!newChecklistRequest.title) return;
    
    setGenerating(true);
    try {
      const res = await axios.post(`${API}/api/knowledge-base/ai/generate-checklist`, {
        sop_title: newChecklistRequest.title,
        sop_description: newChecklistRequest.description,
        category: newChecklistRequest.category,
        relevant_stages: []
      });
      setGeneratedChecklist(res.data);
    } catch (err) {
      console.error('Error generating checklist:', err);
      alert('Failed to generate checklist');
    }
    setGenerating(false);
  };

  const priorityColors = {
    high: 'text-red-500 bg-red-500/10',
    medium: 'text-yellow-500 bg-yellow-500/10',
    low: 'text-blue-500 bg-blue-500/10'
  };

  const alertIcons = {
    incomplete_checklist: AlertTriangle,
    stage_guidance: BookOpen,
    new_content: Sparkles
  };

  return (
    <div className="space-y-4" data-testid="ai-recommendations-panel">
      {/* Proactive Alerts */}
      {alerts.length > 0 && (
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Bell className="w-4 h-4 text-yellow-500" />
              Proactive Alerts
              <Badge variant="outline" className="text-xs">{alerts.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.slice(0, 3).map((alert, idx) => {
              const AlertIcon = alertIcons[alert.type] || Bell;
              return (
                <div 
                  key={idx} 
                  className={`flex items-start gap-2 p-2 rounded-lg ${priorityColors[alert.priority] || 'bg-muted'}`}
                >
                  <AlertIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{alert.message}</p>
                    <p className="text-xs text-muted-foreground">{alert.details}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* AI Recommendations */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              AI Recommendations
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={fetchRecommendations}
              disabled={loading}
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          {insights && (
            <CardDescription className="text-xs">{insights}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : recommendations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recommendations available
            </p>
          ) : (
            <>
              {recommendations.map((rec, idx) => (
                <div 
                  key={idx}
                  className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => onSelectSOP && rec.sop && onSelectSOP(rec.sop)}
                  data-testid={`ai-recommendation-${idx}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{rec.sop?.title || rec.sop_id}</p>
                      <p className="text-xs text-muted-foreground mt-1">{rec.reason}</p>
                    </div>
                    <Badge variant="outline" className={`text-xs ${priorityColors[rec.priority]}`}>
                      {rec.priority}
                    </Badge>
                  </div>
                  {rec.action && (
                    <p className="text-xs text-primary mt-2 flex items-center gap-1">
                      <ArrowRight className="w-3 h-3" />
                      {rec.action}
                    </p>
                  )}
                </div>
              ))}
              
              {suggestedAction && (
                <div className="mt-3 p-2 bg-primary/5 rounded-lg">
                  <p className="text-xs font-medium text-primary flex items-center gap-1">
                    <Lightbulb className="w-3 h-3" />
                    {suggestedAction}
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* AI Checklist Generator */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-purple-500" />
            AI Checklist Generator
          </CardTitle>
          <CardDescription className="text-xs">
            Auto-generate checklist items for new SOPs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={() => setShowGenerateDialog(true)}
            data-testid="open-checklist-generator"
          >
            <Plus className="w-4 h-4 mr-2" />
            Generate Checklist
          </Button>
        </CardContent>
      </Card>

      {/* Generate Checklist Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-purple-500" />
              AI Checklist Generator
            </DialogTitle>
            <DialogDescription>
              Describe your SOP and let AI generate a comprehensive checklist
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>SOP Title</Label>
              <Input 
                value={newChecklistRequest.title}
                onChange={(e) => setNewChecklistRequest({...newChecklistRequest, title: e.target.value})}
                placeholder="e.g., Client Onboarding Process"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea 
                value={newChecklistRequest.description}
                onChange={(e) => setNewChecklistRequest({...newChecklistRequest, description: e.target.value})}
                placeholder="Describe what this SOP covers..."
                rows={3}
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select 
                value={newChecklistRequest.category}
                onValueChange={(v) => setNewChecklistRequest({...newChecklistRequest, category: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="client_success">Client Success</SelectItem>
                  <SelectItem value="operations">Operations</SelectItem>
                  <SelectItem value="templates">Templates</SelectItem>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={handleGenerateChecklist}
              disabled={generating || !newChecklistRequest.title}
              className="w-full"
              data-testid="generate-checklist-btn"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Checklist
                </>
              )}
            </Button>
            
            {/* Generated Checklist Result */}
            {generatedChecklist && (
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Generated Checklist
                  </Label>
                  {generatedChecklist.ai_powered && (
                    <Badge className="text-xs bg-purple-500/10 text-purple-500">AI Powered</Badge>
                  )}
                </div>
                <div className="space-y-2">
                  {generatedChecklist.checklist?.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <Checkbox disabled checked={false} className="mt-0.5" />
                      <span>{item.text}</span>
                      {item.required && <span className="text-red-500">*</span>}
                    </div>
                  ))}
                </div>
                {generatedChecklist.rationale && (
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    {generatedChecklist.rationale}
                  </p>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(generatedChecklist.checklist, null, 2));
                    alert('Checklist copied to clipboard!');
                  }}
                >
                  <Copy className="w-3 h-3 mr-2" />
                  Copy Checklist JSON
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ==================== MAIN KNOWLEDGE BASE ====================
const KnowledgeBase = () => {
  const [categories, setCategories] = useState([]);
  const [sops, setSOPs] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSOP, setSelectedSOP] = useState(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateSOP, setTemplateSOP] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const [newSOP, setNewSOP] = useState({
    title: '',
    description: '',
    category: 'general',
    content: '',
    relevant_stages: [],
    tags: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [catsRes, analyticsRes] = await Promise.all([
        axios.get(`${API}/api/knowledge-base/categories`),
        axios.get(`${API}/api/knowledge-base/analytics`)
      ]);
      setCategories(catsRes.data.categories || []);
      setAnalytics(analyticsRes.data);
      
      // Fetch all SOPs initially
      const sopsRes = await axios.get(`${API}/api/knowledge-base/sops`);
      setSOPs(sopsRes.data.sops || []);
    } catch (err) {
      console.error('Error fetching knowledge base:', err);
    }
    setLoading(false);
  };

  const fetchSOPs = async (category = null) => {
    try {
      const params = {};
      if (category) params.category = category;
      if (searchQuery) params.search = searchQuery;
      
      const res = await axios.get(`${API}/api/knowledge-base/sops`, { params });
      setSOPs(res.data.sops || []);
    } catch (err) {
      console.error('Error fetching SOPs:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchSOPs(selectedCategory);
  }, [selectedCategory, searchQuery]);

  const handleCategorySelect = (categoryId) => {
    setSelectedCategory(categoryId === selectedCategory ? null : categoryId);
    setSelectedSOP(null);
  };

  const handleSOPSelect = async (sop) => {
    try {
      const res = await axios.get(`${API}/api/knowledge-base/sops/${sop.id}`);
      setSelectedSOP(res.data);
    } catch (err) {
      setSelectedSOP(sop);
    }
  };

  const handleUseTemplate = (sop) => {
    setTemplateSOP(sop);
    setShowTemplateDialog(true);
  };

  const handleCreateSOP = async () => {
    try {
      await axios.post(`${API}/api/knowledge-base/sops`, {
        ...newSOP,
        tags: newSOP.tags.split(',').map(t => t.trim()).filter(Boolean)
      });
      setShowCreateDialog(false);
      setNewSOP({ title: '', description: '', category: 'general', content: '', relevant_stages: [], tags: '' });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create SOP');
    }
  };

  const filteredSOPs = sops.filter(sop => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return sop.title?.toLowerCase().includes(q) || sop.description?.toLowerCase().includes(q);
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="knowledge-base">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            Knowledge Base
          </h2>
          <p className="text-muted-foreground">SOPs, Training, Templates & Resources</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreateDialog(true)} data-testid="create-sop-btn">
            <Plus className="w-4 h-4 mr-2" />
            New SOP
          </Button>
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Main Tabs: SOPs, Training, Templates, Resources */}
      <Tabs defaultValue="sops" className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-xl">
          <TabsTrigger value="sops" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            SOPs
          </TabsTrigger>
          <TabsTrigger value="training" className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            Training
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="resources" className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4" />
            Resources
          </TabsTrigger>
        </TabsList>

        {/* SOPs Tab */}
        <TabsContent value="sops" className="mt-6">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card className="bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-8 h-8 text-primary" />
                  <div>
                    <div className="text-2xl font-bold">{analytics?.total_sops || 0}</div>
                    <div className="text-xs text-muted-foreground">Total SOPs</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-green-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <FileText className="w-8 h-8 text-green-500" />
                  <div>
                    <div className="text-2xl font-bold">{analytics?.total_templates || 0}</div>
                    <div className="text-xs text-muted-foreground">Templates</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-blue-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Eye className="w-8 h-8 text-blue-500" />
                  <div>
                    <div className="text-2xl font-bold">{analytics?.total_views || 0}</div>
                    <div className="text-xs text-muted-foreground">Total Views</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-purple-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-8 h-8 text-purple-500" />
                  <div>
                    <div className="text-2xl font-bold">{analytics?.total_uses || 0}</div>
                    <div className="text-xs text-muted-foreground">Template Uses</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="flex gap-4 items-center mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search SOPs and documentation..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="sop-search"
              />
            </div>
          </div>

          {/* Main Content */}
          <div className="flex gap-6">
            {/* Categories Sidebar */}
            <div className="w-64 flex-shrink-0">
              <h3 className="font-semibold mb-3">Categories</h3>
              <div className="space-y-1">
                {categories.map(cat => {
                  const config = CATEGORY_CONFIG[cat.id] || CATEGORY_CONFIG.general;
                  const Icon = config.icon;
                  const isSelected = selectedCategory === cat.id;
                  
                  return (
                    <Button
                      key={cat.id}
                      variant={isSelected ? "secondary" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => handleCategorySelect(cat.id)}
                      data-testid={`category-${cat.id}`}
                    >
                      <Icon className={`w-4 h-4 mr-2 ${config.color}`} />
                      <span className="flex-1 text-left">{cat.name}</span>
                      <Badge variant="outline" className="ml-auto">{cat.count}</Badge>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* SOP List */}
            <div className="w-80 flex-shrink-0 border-l pl-6">
              <h3 className="font-semibold mb-3">
                {selectedCategory ? CATEGORY_CONFIG[selectedCategory]?.label : 'All SOPs'}
            <span className="text-muted-foreground font-normal ml-2">({filteredSOPs.length})</span>
          </h3>
          <ScrollArea className="h-[500px]">
            <div className="space-y-2 pr-4">
              {filteredSOPs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No SOPs found</p>
                </div>
              ) : (
                filteredSOPs.map(sop => {
                  const config = CATEGORY_CONFIG[sop.category] || CATEGORY_CONFIG.general;
                  const isSelected = selectedSOP?.id === sop.id;
                  
                  return (
                    <Card 
                      key={sop.id}
                      className={`cursor-pointer transition-all hover:border-primary/50 ${isSelected ? 'border-primary ring-1 ring-primary/20' : ''}`}
                      onClick={() => handleSOPSelect(sop)}
                      data-testid={`sop-${sop.id}`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <div className={`p-1.5 rounded ${config.bg}`}>
                            <config.icon className={`w-3.5 h-3.5 ${config.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">{sop.title}</h4>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                              {sop.description}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              {sop.checklist?.length > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  <ListChecks className="w-3 h-3 mr-1" />
                                  {sop.checklist.length}
                                </Badge>
                              )}
                              {sop.template_variables?.length > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  <Sparkles className="w-3 h-3 mr-1" />
                                  Template
                                </Badge>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* SOP Viewer */}
        <div className="flex-1 border-l pl-6">
          {selectedSOP ? (
            <SOPViewer 
              sop={selectedSOP} 
              onClose={() => setSelectedSOP(null)}
              onUseTemplate={handleUseTemplate}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <h3 className="font-semibold text-lg mb-2">Select an SOP</h3>
                <p className="text-sm">Choose an SOP from the list to view its content</p>
              </div>
            </div>
          )}
        </div>

        {/* AI Recommendations Panel */}
        <div className="w-80 flex-shrink-0 border-l pl-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            AI Assistant
          </h3>
          <ScrollArea className="h-[500px]">
            <AIRecommendationsPanel 
              userId="demo_user"
              role="coordinator"
              currentStage={selectedCategory}
              onSelectSOP={handleSOPSelect}
            />
          </ScrollArea>
        </div>
          </div>
        </TabsContent>

        {/* Training Tab */}
        <TabsContent value="training" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-orange-500" />
                Training Materials
              </CardTitle>
              <CardDescription>
                Role-based training modules and completion tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TeamTrainings />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-green-500" />
                Templates Library
              </CardTitle>
              <CardDescription>
                All deliverable templates, playbooks, and contract templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="playbooks">
                <TabsList>
                  <TabsTrigger value="playbooks">Playbooks</TabsTrigger>
                  <TabsTrigger value="sop-templates">SOP Templates</TabsTrigger>
                  <TabsTrigger value="contracts">Contract Templates</TabsTrigger>
                </TabsList>
                <TabsContent value="playbooks" className="mt-4">
                  <div className="text-muted-foreground text-center py-8">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>Playbook templates will be displayed here</p>
                    <p className="text-sm mt-2">Integrate with Workflows module for full functionality</p>
                  </div>
                </TabsContent>
                <TabsContent value="sop-templates" className="mt-4">
                  <div className="space-y-3">
                    {sops.filter(s => s.template_variables?.length > 0).map(sop => (
                      <Card key={sop.id} className="cursor-pointer hover:border-primary/50 transition-colors"
                            onClick={() => { setTemplateSOP(sop); setShowTemplateDialog(true); }}>
                        <CardContent className="p-4 flex items-center justify-between">
                          <div>
                            <p className="font-medium">{sop.title}</p>
                            <p className="text-sm text-muted-foreground">{sop.description}</p>
                          </div>
                          <Badge variant="outline">
                            {sop.template_variables.length} variables
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}
                    {sops.filter(s => s.template_variables?.length > 0).length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        <p>No template SOPs found</p>
                        <p className="text-sm">Create SOPs with template variables to use them here</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="contracts" className="mt-4">
                  <div className="text-muted-foreground text-center py-8">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>Contract templates will be displayed here</p>
                    <p className="text-sm mt-2">Integrate with Contracts module for full functionality</p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-blue-500" />
                Resources & Documents
              </CardTitle>
              <CardDescription>
                Additional documentation, guides, and reference materials
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <Card className="cursor-pointer hover:border-primary/50 transition-colors">
                  <CardContent className="p-6 text-center">
                    <FileText className="w-10 h-10 mx-auto mb-3 text-blue-500" />
                    <p className="font-medium">Policy Documents</p>
                    <p className="text-sm text-muted-foreground mt-1">Company policies and guidelines</p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:border-primary/50 transition-colors">
                  <CardContent className="p-6 text-center">
                    <BookOpen className="w-10 h-10 mx-auto mb-3 text-green-500" />
                    <p className="font-medium">User Guides</p>
                    <p className="text-sm text-muted-foreground mt-1">System and process documentation</p>
                  </CardContent>
                </Card>
                <Card className="cursor-pointer hover:border-primary/50 transition-colors">
                  <CardContent className="p-6 text-center">
                    <FolderOpen className="w-10 h-10 mx-auto mb-3 text-purple-500" />
                    <p className="font-medium">Shared Resources</p>
                    <p className="text-sm text-muted-foreground mt-1">Team files and shared documents</p>
                  </CardContent>
                </Card>
              </div>
              <div className="mt-6 p-4 bg-muted/50 rounded-lg text-center">
                <p className="text-muted-foreground">
                  Resource library coming soon. Upload and organize team documents.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Template Filler Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Fill Template: {templateSOP?.title}</DialogTitle>
            <DialogDescription>
              Fill in the fields below to generate your document
            </DialogDescription>
          </DialogHeader>
          {templateSOP && (
            <TemplateFiller 
              sop={templateSOP}
              onClose={() => setShowTemplateDialog(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Create SOP Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New SOP</DialogTitle>
            <DialogDescription>Add a new SOP or documentation to the knowledge base</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Title</Label>
                <Input 
                  value={newSOP.title}
                  onChange={(e) => setNewSOP({...newSOP, title: e.target.value})}
                  placeholder="SOP Title"
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={newSOP.category} onValueChange={(v) => setNewSOP({...newSOP, category: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Input 
                value={newSOP.description}
                onChange={(e) => setNewSOP({...newSOP, description: e.target.value})}
                placeholder="Brief description of this SOP"
              />
            </div>
            <div>
              <Label>Content (Markdown)</Label>
              <Textarea 
                value={newSOP.content}
                onChange={(e) => setNewSOP({...newSOP, content: e.target.value})}
                placeholder="# SOP Content&#10;&#10;Write your SOP content here using Markdown..."
                rows={10}
              />
            </div>
            <div>
              <Label>Tags (comma-separated)</Label>
              <Input 
                value={newSOP.tags}
                onChange={(e) => setNewSOP({...newSOP, tags: e.target.value})}
                placeholder="e.g., sales, onboarding, process"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateSOP} data-testid="create-sop-submit">Create SOP</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default KnowledgeBase;
