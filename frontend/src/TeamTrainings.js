import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useRole } from './RoleContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './components/ui/card';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Progress } from './components/ui/progress';
import { ScrollArea } from './components/ui/scroll-area';
import { Separator } from './components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './components/ui/select';
import {
  Play, CheckCircle, Clock, BookOpen, Video, FileText,
  GraduationCap, Award, Target, BarChart3, Users,
  ChevronRight, Lock, RefreshCw, HelpCircle, Zap
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL || '';

// Category configuration
const CATEGORY_CONFIG = {
  onboarding: { label: 'Onboarding', color: '#22C55E', icon: GraduationCap },
  skills: { label: 'Skills', color: '#3B82F6', icon: Target },
  compliance: { label: 'Compliance', color: '#EF4444', icon: Lock },
  tools: { label: 'Tools', color: '#8B5CF6', icon: Zap }
};

// Content type icons
const CONTENT_ICONS = {
  video: Video,
  document: FileText,
  quiz: HelpCircle,
  interactive: Zap
};

// ==================== TRAINING MODULE CARD ====================
const TrainingModuleCard = ({ module, progress, onStart, onContinue, onView }) => {
  const categoryConfig = CATEGORY_CONFIG[module.category] || { label: module.category, color: '#64748B' };
  const ContentIcon = CONTENT_ICONS[module.content_type] || FileText;
  
  const isCompleted = progress?.status === 'completed';
  const isInProgress = progress?.status === 'in_progress';
  const progressPercent = progress?.progress_percent || 0;

  return (
    <Card 
      className={`transition-all hover:shadow-md ${isCompleted ? 'bg-green-500/5 border-green-500/30' : ''}`}
      data-testid={`training-module-${module.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg ${isCompleted ? 'bg-green-500/20' : 'bg-muted'}`}>
            {isCompleted ? (
              <CheckCircle className="w-6 h-6 text-green-500" />
            ) : (
              <ContentIcon className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{module.title}</h3>
              {module.role_required && module.role_required !== 'all' && (
                <Badge variant="outline" className="text-xs capitalize">
                  {module.role_required}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {module.description}
            </p>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {module.duration_minutes} min
              </div>
              <Badge 
                variant="secondary"
                style={{ 
                  backgroundColor: `${categoryConfig.color}15`,
                  color: categoryConfig.color 
                }}
              >
                {categoryConfig.label}
              </Badge>
            </div>
            
            {isInProgress && (
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span>Progress</span>
                  <span>{progressPercent}%</span>
                </div>
                <Progress value={progressPercent} className="h-1.5" />
              </div>
            )}
          </div>
          
          <div className="flex-shrink-0">
            {isCompleted ? (
              <Button variant="ghost" size="sm" onClick={() => onView(module)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : isInProgress ? (
              <Button size="sm" onClick={() => onContinue(module)}>
                Continue
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => onStart(module)}>
                Start
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ==================== TRAINING VIEWER ====================
const TrainingViewer = ({ module, progress, onComplete, onClose, onProgressUpdate }) => {
  const [currentProgress, setCurrentProgress] = useState(progress?.progress_percent || 0);
  const [saving, setSaving] = useState(false);
  const ContentIcon = CONTENT_ICONS[module.content_type] || FileText;

  const handleProgress = async (newProgress) => {
    setCurrentProgress(newProgress);
    setSaving(true);
    try {
      await onProgressUpdate(module.id, { progress_percent: newProgress });
    } catch (err) {
      console.error('Failed to save progress:', err);
    }
    setSaving(false);
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      await onProgressUpdate(module.id, { status: 'completed', progress_percent: 100 });
      onComplete();
    } catch (err) {
      console.error('Failed to complete:', err);
    }
    setSaving(false);
  };

  return (
    <DialogContent className="max-w-4xl max-h-[90vh]">
      <DialogHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <ContentIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <DialogTitle>{module.title}</DialogTitle>
            <DialogDescription>{module.description}</DialogDescription>
          </div>
        </div>
      </DialogHeader>
      
      <div className="my-4">
        <div className="flex justify-between text-sm mb-2">
          <span>Progress</span>
          <span>{currentProgress}%</span>
        </div>
        <Progress value={currentProgress} className="h-2" />
      </div>
      
      <ScrollArea className="h-[400px] border rounded-lg p-6 bg-muted/30">
        {module.content_type === 'video' && (
          <div className="space-y-6">
            <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
              <div className="text-center text-white">
                <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="opacity-70">Video Player Placeholder</p>
                <p className="text-sm opacity-50">Duration: {module.duration_minutes} minutes</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleProgress(25)}>25%</Button>
              <Button variant="outline" onClick={() => handleProgress(50)}>50%</Button>
              <Button variant="outline" onClick={() => handleProgress(75)}>75%</Button>
              <Button variant="outline" onClick={() => handleProgress(100)}>100%</Button>
            </div>
          </div>
        )}
        
        {module.content_type === 'document' && (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <h2>Training Content</h2>
            <p>This is a placeholder for the training document content for <strong>{module.title}</strong>.</p>
            <h3>Key Learning Objectives</h3>
            <ul>
              <li>Understand the core concepts and principles</li>
              <li>Apply best practices in your daily work</li>
              <li>Collaborate effectively with your team</li>
              <li>Meet compliance and quality standards</li>
            </ul>
            <h3>Summary</h3>
            <p>Upon completing this module, you will have a solid understanding of the material and be ready to apply it in practice.</p>
            <div className="mt-6 flex gap-2">
              <Button variant="outline" onClick={() => handleProgress(50)}>Mark as Read (50%)</Button>
              <Button variant="outline" onClick={() => handleProgress(100)}>Fully Read (100%)</Button>
            </div>
          </div>
        )}
        
        {module.content_type === 'quiz' && (
          <div className="space-y-6">
            <h3 className="font-semibold text-lg">Knowledge Check</h3>
            <div className="space-y-4">
              {[1, 2, 3].map(q => (
                <Card key={q}>
                  <CardContent className="p-4">
                    <p className="font-medium mb-3">Question {q}: Sample question about {module.title}?</p>
                    <div className="space-y-2">
                      {['A', 'B', 'C', 'D'].map(opt => (
                        <Button 
                          key={opt} 
                          variant="outline" 
                          className="w-full justify-start"
                          onClick={() => handleProgress(Math.min(100, q * 33))}
                        >
                          {opt}. Sample answer option
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
        
        {module.content_type === 'interactive' && (
          <div className="space-y-6 text-center py-8">
            <Zap className="w-16 h-16 mx-auto text-primary" />
            <h3 className="font-semibold text-lg">Interactive Training</h3>
            <p className="text-muted-foreground">
              This is an interactive training module with hands-on exercises.
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => handleProgress(33)}>Complete Step 1</Button>
              <Button onClick={() => handleProgress(66)}>Complete Step 2</Button>
              <Button onClick={() => handleProgress(100)}>Complete Step 3</Button>
            </div>
          </div>
        )}
      </ScrollArea>
      
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button 
          onClick={handleComplete} 
          disabled={saving || currentProgress < 100}
          data-testid="complete-training"
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark Complete
            </>
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

// ==================== MAIN COMPONENT ====================
const TeamTrainings = () => {
  const { currentRole } = useContext(RoleContext);
  const [modules, setModules] = useState([]);
  const [progressData, setProgressData] = useState({});
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState(null);
  const [showViewer, setShowViewer] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  
  // Demo user ID based on role
  const userId = `user_${currentRole?.id || 'demo'}`;

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch progress which includes modules
      const progressRes = await axios.get(`${API}/api/trainings/progress/${userId}`, {
        params: { role: currentRole?.type?.toLowerCase() }
      });
      
      setModules(progressRes.data.modules || []);
      setSummary(progressRes.data.summary);
      
      // Create progress map
      const progressMap = {};
      (progressRes.data.modules || []).forEach(m => {
        if (m.progress) {
          progressMap[m.id] = m.progress;
        }
      });
      setProgressData(progressMap);
    } catch (err) {
      console.error('Failed to fetch training data:', err);
      // Fallback to just modules
      try {
        const modulesRes = await axios.get(`${API}/api/trainings/modules`, {
          params: { role: currentRole?.type?.toLowerCase() }
        });
        setModules(modulesRes.data.modules || []);
      } catch (e) {
        console.error('Failed to fetch modules:', e);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [currentRole]);

  const handleStartTraining = async (module) => {
    try {
      await axios.post(`${API}/api/trainings/progress/${userId}/${module.id}`);
      setSelectedModule(module);
      setShowViewer(true);
      setProgressData({
        ...progressData,
        [module.id]: { status: 'in_progress', progress_percent: 0 }
      });
    } catch (err) {
      console.error('Failed to start training:', err);
    }
  };

  const handleContinueTraining = (module) => {
    setSelectedModule(module);
    setShowViewer(true);
  };

  const handleProgressUpdate = async (moduleId, update) => {
    try {
      const res = await axios.patch(`${API}/api/trainings/progress/${userId}/${moduleId}`, update);
      setProgressData({
        ...progressData,
        [moduleId]: res.data
      });
      return res.data;
    } catch (err) {
      console.error('Failed to update progress:', err);
      throw err;
    }
  };

  const handleComplete = () => {
    setShowViewer(false);
    fetchData(); // Refresh data
  };

  const filteredModules = activeCategory === 'all' 
    ? modules 
    : modules.filter(m => m.category === activeCategory);

  const categories = ['all', ...new Set(modules.map(m => m.category))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="team-trainings">
      {/* Header Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <GraduationCap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">{summary?.total_modules || modules.length}</div>
                <div className="text-xs text-muted-foreground">Total Modules</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-green-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{summary?.completed || 0}</div>
                <div className="text-xs text-muted-foreground">Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-blue-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{summary?.in_progress || 0}</div>
                <div className="text-xs text-muted-foreground">In Progress</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-purple-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Award className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{summary?.completion_percent || 0}%</div>
                <div className="text-xs text-muted-foreground">Completion</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overall Progress */}
      {summary && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Progress</span>
              <span className="text-sm text-muted-foreground">
                {summary.completed} of {summary.total_modules} modules completed
              </span>
            </div>
            <Progress value={summary.completion_percent} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Total time spent: {summary.total_time_spent_minutes} minutes
            </p>
          </CardContent>
        </Card>
      )}

      {/* Category Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
            <TabsTrigger key={key} value={key} className="capitalize">
              {config.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Modules List */}
      <div className="space-y-3">
        {filteredModules.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <GraduationCap className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold mb-2">No Training Modules</h3>
              <p className="text-sm text-muted-foreground">
                {activeCategory === 'all' 
                  ? 'No training modules available for your role.'
                  : `No ${CATEGORY_CONFIG[activeCategory]?.label || activeCategory} modules available.`
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredModules.map(module => (
            <TrainingModuleCard
              key={module.id}
              module={module}
              progress={progressData[module.id] || module.progress}
              onStart={handleStartTraining}
              onContinue={handleContinueTraining}
              onView={handleContinueTraining}
            />
          ))
        )}
      </div>

      {/* Training Viewer Dialog */}
      <Dialog open={showViewer} onOpenChange={setShowViewer}>
        {selectedModule && (
          <TrainingViewer
            module={selectedModule}
            progress={progressData[selectedModule.id]}
            onComplete={handleComplete}
            onClose={() => setShowViewer(false)}
            onProgressUpdate={handleProgressUpdate}
          />
        )}
      </Dialog>
    </div>
  );
};

export default TeamTrainings;
