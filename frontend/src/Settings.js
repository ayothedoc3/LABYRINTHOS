import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Key, Plus, Trash2, Check, X, RefreshCw, Eye, EyeOff,
  Brain, Sparkles, TestTube, Settings2, Info, AlertTriangle,
  Zap, Bot, Cpu, Cloud
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Provider icons
const PROVIDER_ICONS = {
  openai: Zap,
  anthropic: Bot,
  gemini: Sparkles,
  openrouter: Cloud
};

const Settings = () => {
  const [aiSettings, setAiSettings] = useState(null);
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddKey, setShowAddKey] = useState(false);
  const [newKey, setNewKey] = useState({ provider: '', api_key: '', model: '' });
  const [showKey, setShowKey] = useState({});
  const [testingKey, setTestingKey] = useState(null);
  const [testResult, setTestResult] = useState(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const [settingsRes, keysRes] = await Promise.all([
        axios.get(`${API}/settings/ai`),
        axios.get(`${API}/settings/api-keys`)
      ]);
      setAiSettings(settingsRes.data);
      setApiKeys(keysRes.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [settingsRes, keysRes] = await Promise.all([
          axios.get(`${API}/settings/ai`),
          axios.get(`${API}/settings/api-keys`)
        ]);
        setAiSettings(settingsRes.data);
        setApiKeys(keysRes.data);
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
      setLoading(false);
    };
    loadData();
  }, []);

  const updateSettings = async (updates) => {
    setSaving(true);
    try {
      await axios.put(`${API}/settings/ai`, {
        ...aiSettings,
        ...updates,
        available_providers: undefined // Don't send this back
      });
      setAiSettings(prev => ({ ...prev, ...updates }));
    } catch (error) {
      console.error('Error updating settings:', error);
    }
    setSaving(false);
  };

  const addApiKey = async () => {
    if (!newKey.provider || !newKey.api_key) return;
    
    try {
      await axios.post(`${API}/settings/api-keys`, newKey);
      setShowAddKey(false);
      setNewKey({ provider: '', api_key: '', model: '' });
      fetchSettings();
    } catch (error) {
      console.error('Error adding API key:', error);
    }
  };

  const deleteApiKey = async (keyId) => {
    try {
      await axios.delete(`${API}/settings/api-keys/${keyId}`);
      fetchSettings();
    } catch (error) {
      console.error('Error deleting API key:', error);
    }
  };

  const testApiKey = async (provider, apiKey) => {
    setTestingKey(provider);
    setTestResult(null);
    
    try {
      const response = await axios.post(`${API}/settings/api-keys/test`, {
        provider,
        api_key: apiKey,
        is_active: true
      });
      setTestResult(response.data);
    } catch (error) {
      setTestResult({ success: false, message: error.message });
    }
    setTestingKey(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6" data-testid="settings">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Settings2 className="w-6 h-6" />
              Settings
            </h2>
            <p className="text-muted-foreground">Configure AI providers and API keys</p>
          </div>
        </div>

        <Tabs defaultValue="ai" className="space-y-4">
          <TabsList>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Brain className="w-4 h-4" /> AI Configuration
            </TabsTrigger>
            <TabsTrigger value="keys" className="flex items-center gap-2">
              <Key className="w-4 h-4" /> API Keys (BYOK)
            </TabsTrigger>
          </TabsList>

          {/* AI Configuration Tab */}
          <TabsContent value="ai" className="space-y-4">
            {/* Enable AI Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  AI Features
                </CardTitle>
                <CardDescription>
                  Enable AI-powered content generation across the platform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable AI Generation</Label>
                    <p className="text-sm text-muted-foreground">
                      Generate workflows, playbooks, SOPs, and more from natural language
                    </p>
                  </div>
                  <Switch
                    checked={aiSettings?.enable_ai_features}
                    onCheckedChange={(checked) => updateSettings({ enable_ai_features: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Default Provider */}
            <Card>
              <CardHeader>
                <CardTitle>Default AI Provider</CardTitle>
                <CardDescription>
                  Choose which AI provider to use by default for content generation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {aiSettings?.available_providers?.map((provider) => {
                    const Icon = PROVIDER_ICONS[provider.id] || Cpu;
                    const isSelected = aiSettings.default_provider === provider.id;
                    
                    return (
                      <Card 
                        key={provider.id}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          isSelected ? 'ring-2 ring-primary border-primary' : ''
                        }`}
                        onClick={() => updateSettings({ default_provider: provider.id })}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                              }`}>
                                <Icon className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="font-medium">{provider.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {provider.models.length} models
                                </div>
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="w-5 h-5 text-primary" />
                            )}
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                            {provider.configured ? (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                <Check className="w-3 h-3 mr-1" /> Ready
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                                <Key className="w-3 h-3 mr-1" /> Key Required
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Model Selection */}
                <div className="space-y-2">
                  <Label>Default Model</Label>
                  <Select
                    value={aiSettings?.default_model || 'default'}
                    onValueChange={(value) => updateSettings({ default_model: value === 'default' ? null : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Use provider default" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Use provider default</SelectItem>
                      {aiSettings?.available_providers
                        ?.find(p => p.id === aiSettings.default_provider)
                        ?.models.map((model) => (
                          <SelectItem key={model} value={model}>{model}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Temperature */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Temperature</Label>
                    <span className="text-sm text-muted-foreground">
                      {aiSettings?.temperature?.toFixed(1)}
                    </span>
                  </div>
                  <Slider
                    value={[aiSettings?.temperature || 0.7]}
                    onValueChange={([value]) => updateSettings({ temperature: value })}
                    min={0}
                    max={2}
                    step={0.1}
                  />
                  <p className="text-xs text-muted-foreground">
                    Lower = more focused, Higher = more creative
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Info Card */}
            <Alert>
              <Info className="w-4 h-4" />
              <AlertTitle>About AI Providers</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>
                  <strong>OpenAI, Anthropic (Claude), and Gemini</strong> are available by default using the Emergent Universal Key.
                  No additional setup required!
                </p>
                <p>
                  <strong>OpenRouter</strong> requires your own API key (BYOK) and provides access to 300+ models from various providers.
                </p>
              </AlertDescription>
            </Alert>
          </TabsContent>

          {/* API Keys Tab */}
          <TabsContent value="keys" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Key className="w-5 h-5" />
                      Bring Your Own Key (BYOK)
                    </CardTitle>
                    <CardDescription>
                      Add your own API keys to use specific providers or models
                    </CardDescription>
                  </div>
                  <Dialog open={showAddKey} onOpenChange={setShowAddKey}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="w-4 h-4 mr-2" /> Add API Key
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add API Key</DialogTitle>
                        <DialogDescription>
                          Add your own API key for a provider
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Provider</Label>
                          <Select
                            value={newKey.provider}
                            onValueChange={(value) => setNewKey({ ...newKey, provider: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select provider" />
                            </SelectTrigger>
                            <SelectContent>
                              {aiSettings?.available_providers?.map((p) => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>API Key</Label>
                          <Input
                            type="password"
                            value={newKey.api_key}
                            onChange={(e) => setNewKey({ ...newKey, api_key: e.target.value })}
                            placeholder="sk-..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Preferred Model (Optional)</Label>
                          <Select
                            value={newKey.model}
                            onValueChange={(value) => setNewKey({ ...newKey, model: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Use default" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="default">Use default</SelectItem>
                              {aiSettings?.available_providers
                                ?.find(p => p.id === newKey.provider)
                                ?.models.map((model) => (
                                  <SelectItem key={model} value={model}>{model}</SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddKey(false)}>
                          Cancel
                        </Button>
                        <Button onClick={addApiKey} disabled={!newKey.provider || !newKey.api_key}>
                          Add Key
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {apiKeys.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Key className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No custom API keys configured</p>
                    <p className="text-sm">Using Emergent Universal Key for default providers</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {apiKeys.map((key) => {
                      const provider = aiSettings?.available_providers?.find(p => p.id === key.provider);
                      const Icon = PROVIDER_ICONS[key.provider] || Cpu;
                      
                      return (
                        <div 
                          key={key.id}
                          className="flex items-center justify-between p-4 rounded-lg border bg-card"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                              <Icon className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="font-medium">{provider?.name || key.provider}</div>
                              <div className="text-sm text-muted-foreground font-mono">
                                {showKey[key.id] ? key.key_preview : '••••••••••••'}
                              </div>
                              {key.model && (
                                <Badge variant="outline" className="mt-1">{key.model}</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setShowKey(prev => ({ ...prev, [key.id]: !prev[key.id] }))}
                                >
                                  {showKey[key.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {showKey[key.id] ? 'Hide key' : 'Show key preview'}
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteApiKey(key.id)}
                                >
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete key</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Test Key */}
            {testResult && (
              <Alert variant={testResult.success ? "default" : "destructive"}>
                {testResult.success ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
                <AlertTitle>{testResult.success ? 'Success' : 'Failed'}</AlertTitle>
                <AlertDescription>
                  {testResult.message}
                  {testResult.response && (
                    <p className="mt-2 font-mono text-sm bg-muted p-2 rounded">
                      {testResult.response}
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Where to get keys */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Where to get API Keys</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>OpenAI</span>
                  <a 
                    href="https://platform.openai.com/api-keys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm"
                  >
                    platform.openai.com/api-keys →
                  </a>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span>Anthropic (Claude)</span>
                  <a 
                    href="https://console.anthropic.com/settings/keys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm"
                  >
                    console.anthropic.com →
                  </a>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span>OpenRouter</span>
                  <a 
                    href="https://openrouter.ai/keys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm"
                  >
                    openrouter.ai/keys →
                  </a>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <span>Google AI (Gemini)</span>
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm"
                  >
                    aistudio.google.com →
                  </a>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
};

export default Settings;
