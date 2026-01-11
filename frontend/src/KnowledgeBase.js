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
  ListChecks, Sparkles
} from 'lucide-react';

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

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {sop.template_variables?.map(variable => (
          <div key={variable.name}>
            <Label>{variable.label}</Label>
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

      <Button onClick={handleGenerate} disabled={generating} className="w-full">
        {generating ? 'Generating...' : 'Generate Document'}
      </Button>

      {generatedContent && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Generated Content</Label>
            <Button variant="ghost" size="sm" onClick={handleCopy}>
              <Copy className="w-4 h-4 mr-1" />
              Copy
            </Button>
          </div>
          <ScrollArea className="h-64 border rounded-lg p-4 bg-muted/30">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{generatedContent}</ReactMarkdown>
            </div>
          </ScrollArea>
        </div>
      )}
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
      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-4">
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

      {/* Search and Actions */}
      <div className="flex gap-4 items-center">
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
        <Button onClick={() => setShowCreateDialog(true)} data-testid="create-sop-btn">
          <Plus className="w-4 h-4 mr-2" />
          New SOP
        </Button>
        <Button variant="outline" onClick={fetchData}>
          <RefreshCw className="w-4 h-4" />
        </Button>
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
      </div>

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
