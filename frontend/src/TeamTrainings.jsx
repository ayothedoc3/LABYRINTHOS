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
import { Input } from './components/ui/input';
import { Textarea } from './components/ui/textarea';
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
  ChevronRight, Lock, RefreshCw, HelpCircle, Zap,
  Rocket, MessageCircle, Send, Reply, Shield, Star
} from 'lucide-react';

const API = import.meta.env.VITE_BACKEND_URL || '';

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

// Demo user for comments
const CURRENT_USER = { id: "user1", name: "Sarah Johnson", role: "Manager" };

// ==================== QUICK START CARD ====================
const QuickStartCard = ({ module, onStart }) => {
  const categoryConfig = CATEGORY_CONFIG[module.category] || { label: module.category, color: '#64748B' };
  
  return (
    <Card className="hover:shadow-lg transition-all cursor-pointer group" onClick={() => onStart(module)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div 
            className="p-3 rounded-xl group-hover:scale-110 transition-transform"
            style={{ backgroundColor: `${categoryConfig.color}20` }}
          >
            <Rocket className="w-6 h-6" style={{ color: categoryConfig.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{module.title}</h3>
            <p className="text-xs text-muted-foreground">{module.duration_minutes} min • {categoryConfig.label}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
        </div>
      </CardContent>
    </Card>
  );
};

// ==================== COMMENT COMPONENT ====================
const CommentCard = ({ comment, onReply, canModerate }) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  
  const handleSubmitReply = () => {
    if (replyText.trim()) {
      onReply(comment.id, replyText);
      setReplyText('');
      setShowReplyForm(false);
    }
  };
  
  return (
    <div className={`p-4 rounded-lg ${comment.is_question ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'bg-muted/50'}`}>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold
          ${comment.is_moderator_answer ? 'bg-gradient-to-br from-violet-500 to-purple-600' : 'bg-gradient-to-br from-blue-500 to-cyan-500'}`}>
          {comment.user_name?.charAt(0) || 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{comment.user_name}</span>
            {comment.is_moderator_answer && (
              <Badge className="bg-violet-100 text-violet-700 text-xs">
                <Shield className="w-3 h-3 mr-1" /> Moderator
              </Badge>
            )}
            {comment.is_question && (
              <Badge className="bg-blue-100 text-blue-700 text-xs">
                <HelpCircle className="w-3 h-3 mr-1" /> Question
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {new Date(comment.created_at).toLocaleDateString()}
            </span>
          </div>
          <p className="text-sm">{comment.content}</p>
          
          {!comment.parent_id && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="mt-2 text-xs"
              onClick={() => setShowReplyForm(!showReplyForm)}
            >
              <Reply className="w-3 h-3 mr-1" /> Reply
            </Button>
          )}
          
          {showReplyForm && (
            <div className="mt-3 space-y-2">
              <Textarea 
                placeholder="Write your reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="text-sm"
                rows={2}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSubmitReply}>
                  <Send className="w-3 h-3 mr-1" /> Send
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowReplyForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== Q&A SECTION ====================
const QASection = ({ moduleId, userRole }) => {
  const [comments, setComments] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [isQuestion, setIsQuestion] = useState(true);
  const [loading, setLoading] = useState(true);
  
  const canModerate = ['Administrator', 'Manager', 'Executive'].includes(userRole);
  
  const fetchComments = async () => {
    try {
      const response = await axios.get(`${API}/api/trainings/comments/${moduleId}`);
      setComments(response.data || []);
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (moduleId) {
      fetchComments();
    }
  }, [moduleId]);
  
  const handleSubmitComment = async () => {
    if (!newQuestion.trim()) return;
    
    try {
      await axios.post(`${API}/api/trainings/comments`, {
        module_id: moduleId,
        user_id: CURRENT_USER.id,
        user_name: CURRENT_USER.name,
        user_role: CURRENT_USER.role,
        content: newQuestion,
        is_question: isQuestion,
        is_answer: false,
        parent_id: null,
        is_moderator_answer: false
      });
      setNewQuestion('');
      fetchComments();
    } catch (err) {
      console.error('Failed to post comment:', err);
    }
  };
  
  const handleReply = async (parentId, content) => {
    try {
      await axios.post(`${API}/api/trainings/comments/${parentId}/reply`, {
        module_id: moduleId,
        user_id: CURRENT_USER.id,
        user_name: CURRENT_USER.name,
        user_role: CURRENT_USER.role,
        content: content,
        is_question: false,
        is_answer: true,
        parent_id: parentId,
        is_moderator_answer: canModerate
      });
      fetchComments();
    } catch (err) {
      console.error('Failed to post reply:', err);
    }
  };
  
  // Group comments by parent
  const parentComments = comments.filter(c => !c.parent_id);
  const getReplies = (parentId) => comments.filter(c => c.parent_id === parentId);
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Questions & Answers
        </h3>
        <Badge variant="secondary">{comments.length} comments</Badge>
      </div>
      
      {/* New Question Form */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <Textarea 
            placeholder={isQuestion ? "Ask a question about this training..." : "Share a comment or tip..."}
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            rows={3}
          />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button 
                variant={isQuestion ? "default" : "outline"} 
                size="sm"
                onClick={() => setIsQuestion(true)}
              >
                <HelpCircle className="w-4 h-4 mr-1" /> Question
              </Button>
              <Button 
                variant={!isQuestion ? "default" : "outline"} 
                size="sm"
                onClick={() => setIsQuestion(false)}
              >
                <MessageCircle className="w-4 h-4 mr-1" /> Comment
              </Button>
            </div>
            <Button onClick={handleSubmitComment} disabled={!newQuestion.trim()}>
              <Send className="w-4 h-4 mr-2" /> Post
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Comments List */}
      <ScrollArea className="h-[300px]">
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              Loading comments...
            </div>
          ) : parentComments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No questions yet. Be the first to ask!</p>
            </div>
          ) : (
            parentComments.map(comment => (
              <div key={comment.id} className="space-y-2">
                <CommentCard 
                  comment={comment} 
                  onReply={handleReply}
                  canModerate={canModerate}
                />
                {/* Replies */}
                {getReplies(comment.id).map(reply => (
                  <div key={reply.id} className="ml-8">
                    <CommentCard 
                      comment={reply} 
                      onReply={handleReply}
                      canModerate={canModerate}
                    />
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
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
  const [activeTab, setActiveTab] = useState('content');
  const ContentIcon = CONTENT_ICONS[module.content_type] || FileText;
  const { currentRole } = useRole();

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
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="content">
            <BookOpen className="w-4 h-4 mr-2" /> Content
          </TabsTrigger>
          <TabsTrigger value="qa">
            <MessageCircle className="w-4 h-4 mr-2" /> Q&A
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="content" className="mt-4">
          <ScrollArea className="h-[350px] border rounded-lg p-6 bg-muted/30">
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
              <div className="prose prose-sm max-w-none">
                <h2>Training Document</h2>
                <p>This is placeholder content for the training document: <strong>{module.title}</strong></p>
                <p>{module.description}</p>
                <h3>Key Learning Points:</h3>
                <ul>
                  <li>Understanding the fundamentals</li>
                  <li>Best practices and guidelines</li>
                  <li>Common scenarios and solutions</li>
                  <li>Tips for implementation</li>
                </ul>
                <p>Estimated reading time: {module.duration_minutes} minutes</p>
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" onClick={() => handleProgress(50)}>Mark Halfway</Button>
                  <Button variant="outline" onClick={() => handleProgress(100)}>Mark Complete</Button>
                </div>
              </div>
            )}
            
            {module.content_type === 'quiz' && (
              <div className="space-y-6">
                <div className="text-center py-8">
                  <HelpCircle className="w-16 h-16 mx-auto mb-4 text-primary opacity-50" />
                  <h3 className="font-semibold mb-2">Quiz: {module.title}</h3>
                  <p className="text-muted-foreground mb-4">Test your knowledge with this quiz</p>
                  <Button onClick={() => handleProgress(100)}>
                    Start Quiz
                  </Button>
                </div>
              </div>
            )}
            
            {module.content_type === 'interactive' && (
              <div className="text-center py-8">
                <Zap className="w-16 h-16 mx-auto mb-4 text-purple-500 opacity-50" />
                <h3 className="font-semibold mb-2">Interactive Training</h3>
                <p className="text-muted-foreground mb-4">{module.description}</p>
                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={() => handleProgress(50)}>50%</Button>
                  <Button variant="outline" onClick={() => handleProgress(100)}>Complete</Button>
                </div>
              </div>
            )}
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="qa" className="mt-4">
          <QASection moduleId={module.id} userRole={currentRole} />
        </TabsContent>
      </Tabs>
      
      <DialogFooter className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">
          {saving ? 'Saving...' : 'Progress auto-saved'}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          {currentProgress >= 100 && (
            <Button onClick={handleComplete}>
              <Award className="w-4 h-4 mr-2" />
              Complete Training
            </Button>
          )}
        </div>
      </DialogFooter>
    </DialogContent>
  );
};

// ==================== MAIN COMPONENT ====================
const TeamTrainings = () => {
  const { currentRole } = useRole();
  const [modules, setModules] = useState([]);
  const [progressData, setProgressData] = useState({});
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [mainTab, setMainTab] = useState('quickstart'); // NEW: Quick Start as default
  const [selectedModule, setSelectedModule] = useState(null);
  const [showViewer, setShowViewer] = useState(false);
  
  const userId = 'demo-user';

  const fetchData = async () => {
    setLoading(true);
    try {
      // Seed modules
      await axios.post(`${API}/api/trainings/seed`).catch(() => {});
      
      const [modulesRes, progressRes, summaryRes] = await Promise.all([
        axios.get(`${API}/api/trainings/modules`),
        axios.get(`${API}/api/trainings/progress/${userId}`),
        axios.get(`${API}/api/trainings/summary/${userId}`)
      ]);
      
      setModules(modulesRes.data);
      
      const progressMap = {};
      progressRes.data.forEach(p => {
        progressMap[p.module_id] = p;
      });
      setProgressData(progressMap);
      
      setSummary(summaryRes.data);
    } catch (err) {
      console.error('Failed to fetch training data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStartTraining = async (module) => {
    try {
      await axios.post(`${API}/api/trainings/progress/${userId}/${module.id}/start`);
      setProgressData(prev => ({
        ...prev,
        [module.id]: { status: 'in_progress', progress_percent: 0 }
      }));
      setSelectedModule(module);
      setShowViewer(true);
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
      const response = await axios.patch(
        `${API}/api/trainings/progress/${userId}/${moduleId}`,
        update
      );
      setProgressData(prev => ({
        ...prev,
        [moduleId]: response.data
      }));
    } catch (err) {
      console.error('Failed to update progress:', err);
    }
  };

  const handleComplete = () => {
    setShowViewer(false);
    fetchData();
  };

  const filteredModules = modules.filter(m => 
    activeCategory === 'all' || m.category === activeCategory
  );

  // Get quick start modules (onboarding + not completed)
  const quickStartModules = modules
    .filter(m => m.category === 'onboarding' && progressData[m.id]?.status !== 'completed')
    .slice(0, 4);
  
  // Get recommended modules (in progress or next to start)
  const recommendedModules = modules
    .filter(m => {
      const progress = progressData[m.id];
      return progress?.status === 'in_progress' || !progress;
    })
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" data-testid="team-trainings">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-primary" />
            Team Trainings
          </h1>
          <p className="text-muted-foreground">Learn, grow, and excel in your role</p>
        </div>
        <Button onClick={fetchData} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Stats Cards */}
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

      {/* Main Tabs: Quick Start vs Full Training */}
      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="quickstart" className="gap-2">
            <Rocket className="w-4 h-4" /> Quick Start
          </TabsTrigger>
          <TabsTrigger value="full" className="gap-2">
            <BookOpen className="w-4 h-4" /> Full Training
          </TabsTrigger>
        </TabsList>
        
        {/* Quick Start Tab */}
        <TabsContent value="quickstart" className="mt-6 space-y-6">
          {/* Getting Started Section */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              Getting Started
            </h2>
            {quickStartModules.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {quickStartModules.map(module => (
                  <QuickStartCard 
                    key={module.id} 
                    module={module} 
                    onStart={handleStartTraining}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                  <h3 className="font-semibold mb-2">All Set!</h3>
                  <p className="text-sm text-muted-foreground">
                    You've completed all onboarding modules. Great job!
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
          
          {/* Recommended Section */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-500" />
              Recommended for You
            </h2>
            <div className="space-y-3">
              {recommendedModules.map(module => (
                <TrainingModuleCard
                  key={module.id}
                  module={module}
                  progress={progressData[module.id]}
                  onStart={handleStartTraining}
                  onContinue={handleContinueTraining}
                  onView={handleContinueTraining}
                />
              ))}
            </div>
          </div>
        </TabsContent>
        
        {/* Full Training Tab */}
        <TabsContent value="full" className="mt-6 space-y-6">
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
        </TabsContent>
      </Tabs>

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
