import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Badge } from './components/ui/badge';
import { Progress } from './components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { ScrollArea } from './components/ui/scroll-area';
import { Separator } from './components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './components/ui/dialog';
import {
  Play, CheckCircle, Clock, FileText, Upload, Eye, 
  Lock, Unlock, ArrowRight, Building2, Mail, Phone,
  User, Shield, Calendar, DollarSign, Target, Zap,
  Video, BookOpen, MessageSquare, Gift, BarChart3
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL || '';

// ==================== SIGN UP COMPONENT ====================
const SignUp = ({ onComplete }) => {
  const [formData, setFormData] = useState({
    company_name: '',
    email: '',
    phone: '',
    company_size: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const companySizes = ['1-5', '6-20', '21-50', '51-200', '200+'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await axios.post(`${API}/api/client-portal/signup`, formData);
      onComplete(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create account');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
      <Card className="w-full max-w-md mx-4 shadow-2xl border-primary/20">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome to Labyrinth</CardTitle>
          <CardDescription>
            Enter your details to begin your journey
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                placeholder="Acme Corporation"
                value={formData.company_name}
                onChange={(e) => setFormData({...formData, company_name: e.target.value})}
                required
                data-testid="signup-company"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  className="pl-10"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  data-testid="signup-email"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  className="pl-10"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  required
                  data-testid="signup-phone"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Company Size</Label>
              <div className="grid grid-cols-5 gap-2">
                {companySizes.map(size => (
                  <Button
                    key={size}
                    type="button"
                    variant={formData.company_size === size ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFormData({...formData, company_size: size})}
                    data-testid={`company-size-${size}`}
                  >
                    {size}
                  </Button>
                ))}
              </div>
            </div>
            
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
            
            <Button 
              type="submit" 
              className="w-full" 
              size="lg"
              disabled={loading || !formData.company_size}
              data-testid="signup-submit"
            >
              {loading ? 'Creating...' : 'Join the Movement'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

// ==================== LOBBY V1 COMPONENT ====================
const LobbyV1 = ({ client, onComplete }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [uploads, setUploads] = useState({});
  const [showVideoModal, setShowVideoModal] = useState(false);

  const steps = [
    { 
      id: 'video', 
      title: 'Watch Audit Overview', 
      icon: Video, 
      description: 'Understand what was audited and how to read results',
      locked: false
    },
    { 
      id: 'review', 
      title: 'Review Audit Results & Pricing', 
      icon: BarChart3, 
      description: 'View your audit findings and confirm scope',
      locked: !completedSteps.includes('video')
    },
    { 
      id: 'sign', 
      title: 'Sign Documents', 
      icon: FileText, 
      description: 'Formalize your commitment with e-signature',
      locked: !completedSteps.includes('review')
    },
    { 
      id: 'access', 
      title: 'Provide Final Access', 
      icon: Lock, 
      description: 'Submit remaining credentials and access',
      locked: !completedSteps.includes('sign')
    }
  ];

  const accessItems = [
    { id: 'quickbooks', name: 'QuickBooks', status: uploads.quickbooks ? 'complete' : 'pending' },
    { id: 'meta_ads', name: 'Meta Ads', status: uploads.meta_ads ? 'complete' : 'pending' },
    { id: 'google_analytics', name: 'Google Analytics', status: uploads.google_analytics ? 'complete' : 'pending' },
    { id: 'crm', name: 'CRM Access', status: uploads.crm ? 'complete' : 'pending' },
  ];

  const completeStep = (stepId) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId]);
    }
    const nextIndex = steps.findIndex(s => s.id === stepId) + 1;
    if (nextIndex < steps.length) {
      setActiveStep(nextIndex);
    }
  };

  const handleAccessSubmit = (itemId) => {
    setUploads({...uploads, [itemId]: true});
  };

  const allAccessComplete = accessItems.every(item => uploads[item.id]);

  const progress = (completedSteps.length / steps.length) * 100;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome, {client?.company_name || 'Client'}</h1>
          <p className="text-muted-foreground">Complete these steps to begin your transformation</p>
          <Progress value={progress} className="mt-4 h-2" />
          <p className="text-sm text-muted-foreground mt-2">{completedSteps.length} of {steps.length} steps complete</p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = completedSteps.includes(step.id);
            const isActive = index === activeStep;
            
            return (
              <Card 
                key={step.id}
                className={`cursor-pointer transition-all ${
                  step.locked ? 'opacity-50' : 'hover:border-primary/50'
                } ${isActive ? 'border-primary ring-2 ring-primary/20' : ''} ${
                  isCompleted ? 'bg-green-500/5 border-green-500/30' : ''
                }`}
                onClick={() => !step.locked && setActiveStep(index)}
                data-testid={`lobby-step-${step.id}`}
              >
                <CardContent className="p-4 flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${
                    isCompleted ? 'bg-green-500/20' : isActive ? 'bg-primary/20' : 'bg-muted'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    ) : step.locked ? (
                      <Lock className="w-6 h-6 text-muted-foreground" />
                    ) : (
                      <Icon className={`w-6 h-6 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                  {!step.locked && !isCompleted && (
                    <Badge variant="outline" className="ml-auto">
                      {isActive ? 'Current' : 'Available'}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Active Step Content */}
        <Card className="labyrinth-card">
          <CardHeader>
            <CardTitle>{steps[activeStep].title}</CardTitle>
            <CardDescription>{steps[activeStep].description}</CardDescription>
          </CardHeader>
          <CardContent>
            {activeStep === 0 && (
              <div className="text-center py-8">
                <Video className="w-16 h-16 mx-auto mb-4 text-primary" />
                <h3 className="text-lg font-semibold mb-2">Audit Overview Video</h3>
                <p className="text-muted-foreground mb-6">
                  Watch this 5-minute video to understand your audit results
                </p>
                <Button onClick={() => setShowVideoModal(true)} data-testid="watch-video-btn">
                  <Play className="w-4 h-4 mr-2" />
                  Watch Video
                </Button>
              </div>
            )}

            {activeStep === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <Card className="bg-primary/5">
                    <CardContent className="p-4 text-center">
                      <Target className="w-8 h-8 mx-auto mb-2 text-primary" />
                      <div className="text-2xl font-bold">85%</div>
                      <div className="text-sm text-muted-foreground">Audit Score</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-green-500/5">
                    <CardContent className="p-4 text-center">
                      <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-500" />
                      <div className="text-2xl font-bold">$45K</div>
                      <div className="text-sm text-muted-foreground">Potential Savings</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-blue-500/5">
                    <CardContent className="p-4 text-center">
                      <Zap className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                      <div className="text-2xl font-bold">12</div>
                      <div className="text-sm text-muted-foreground">Action Items</div>
                    </CardContent>
                  </Card>
                </div>
                <Separator />
                <div className="flex justify-end">
                  <Button onClick={() => completeStep('review')} data-testid="accept-audit-btn">
                    Accept Audit & Pricing
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {activeStep === 2 && (
              <div className="space-y-6">
                <div className="border rounded-lg p-4 bg-muted/30">
                  <div className="flex items-center gap-3 mb-4">
                    <FileText className="w-5 h-5 text-primary" />
                    <span className="font-semibold">Service Agreement</span>
                    <Badge variant="outline" className="ml-auto">Ready to Sign</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Review and sign the service agreement to proceed
                  </p>
                  <Button onClick={() => completeStep('sign')} data-testid="sign-documents-btn">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Sign Documents
                  </Button>
                </div>
              </div>
            )}

            {activeStep === 3 && (
              <div className="space-y-4">
                {accessItems.map(item => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {uploads[item.id] ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <Clock className="w-5 h-5 text-muted-foreground" />
                      )}
                      <span>{item.name}</span>
                    </div>
                    {!uploads[item.id] && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleAccessSubmit(item.id)}
                        data-testid={`provide-${item.id}`}
                      >
                        <Upload className="w-4 h-4 mr-1" />
                        Provide Access
                      </Button>
                    )}
                  </div>
                ))}
                
                {allAccessComplete && (
                  <div className="pt-4">
                    <Button 
                      className="w-full" 
                      size="lg"
                      onClick={() => {
                        completeStep('access');
                        onComplete();
                      }}
                      data-testid="complete-setup-btn"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Complete Setup
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Video Modal */}
        <Dialog open={showVideoModal} onOpenChange={setShowVideoModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Audit Overview</DialogTitle>
              <DialogDescription>
                Understanding your audit results and next steps
              </DialogDescription>
            </DialogHeader>
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center">
                <Play className="w-16 h-16 mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Video Player Placeholder</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowVideoModal(false)}>
                Close
              </Button>
              <Button onClick={() => {
                setShowVideoModal(false);
                completeStep('video');
              }} data-testid="video-complete-btn">
                Video Complete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

// ==================== LOBBY V2 COMPONENT ====================
const LobbyV2 = ({ client }) => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tiles = [
    { id: 'training', title: 'Training Portal', icon: BookOpen, description: 'Learn how to work with our systems', color: 'text-blue-500' },
    { id: 'howto', title: 'How to Work With Us', icon: User, description: 'Communication and collaboration guide', color: 'text-green-500' },
    { id: 'insights', title: 'Insights & Guidance', icon: Zap, description: 'AI-powered recommendations', color: 'text-purple-500' },
    { id: 'reports', title: 'Reports', icon: BarChart3, description: 'Monthly summaries and outcomes', color: 'text-orange-500' },
    { id: 'collaborate', title: 'Collaborate', icon: MessageSquare, description: 'Submit ideas and questions', color: 'text-pink-500' },
    { id: 'rewards', title: 'Rewards & Progress', icon: Gift, description: 'Track your achievements', color: 'text-yellow-500' },
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Welcome back, {client?.company_name || 'Client'}</h1>
          <p className="text-muted-foreground">Your long-term engagement hub</p>
        </div>

        {/* Tiles Grid */}
        <div className="grid grid-cols-3 gap-4">
          {tiles.map(tile => {
            const Icon = tile.icon;
            return (
              <Card 
                key={tile.id}
                className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg"
                data-testid={`lobby2-tile-${tile.id}`}
              >
                <CardContent className="p-6">
                  <div className={`p-3 rounded-lg bg-muted w-fit mb-4`}>
                    <Icon className={`w-6 h-6 ${tile.color}`} />
                  </div>
                  <h3 className="font-semibold mb-1">{tile.title}</h3>
                  <p className="text-sm text-muted-foreground">{tile.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mt-8">
          <Card className="bg-primary/5">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">87%</div>
              <div className="text-sm text-muted-foreground">Project Progress</div>
            </CardContent>
          </Card>
          <Card className="bg-green-500/5">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">12</div>
              <div className="text-sm text-muted-foreground">Completed Tasks</div>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/5">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">3</div>
              <div className="text-sm text-muted-foreground">Active Sprints</div>
            </CardContent>
          </Card>
          <Card className="bg-purple-500/5">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">A+</div>
              <div className="text-sm text-muted-foreground">Engagement Score</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// ==================== MAIN CLIENT PORTAL ====================
const ClientPortal = () => {
  const [stage, setStage] = useState('signup'); // signup, lobby1, lobby2
  const [client, setClient] = useState(null);

  const handleSignupComplete = (clientData) => {
    setClient(clientData);
    setStage('lobby1');
  };

  const handleLobby1Complete = () => {
    setStage('lobby2');
  };

  return (
    <div className="client-portal">
      {stage === 'signup' && (
        <SignUp onComplete={handleSignupComplete} />
      )}
      {stage === 'lobby1' && (
        <LobbyV1 client={client} onComplete={handleLobby1Complete} />
      )}
      {stage === 'lobby2' && (
        <LobbyV2 client={client} />
      )}
    </div>
  );
};

export default ClientPortal;
