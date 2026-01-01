import React, { useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, Loader2, AlertTriangle, Check } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Content type configurations
const CONTENT_CONFIGS = {
  workflow: {
    title: "Generate Workflow with AI",
    description: "Describe the workflow you want to create and AI will generate it for you.",
    placeholder: "E.g., Create a customer onboarding workflow that starts when a new contract is signed, sends a welcome email, schedules a kickoff call, assigns an account manager, and tracks completion milestones...",
    icon: "🔄"
  },
  playbook: {
    title: "Generate Playbook with AI",
    description: "Describe the playbook strategy you need and AI will create it.",
    placeholder: "E.g., Create a B2B sales playbook for enterprise software targeting mid-market companies with 100-500 employees, focusing on outbound prospecting and demo-to-close conversion...",
    icon: "📚"
  },
  sop: {
    title: "Generate SOP with AI",
    description: "Describe the standard operating procedure you need.",
    placeholder: "E.g., Create an SOP for handling customer support tickets, including ticket triage, response time SLAs, escalation procedures, and quality assurance checks...",
    icon: "📋"
  },
  talent: {
    title: "Generate Talent Profile with AI",
    description: "Describe the role or talent requirements.",
    placeholder: "E.g., Create a talent profile for a Senior Product Manager who will lead the B2B platform team, with 5+ years experience, strong technical background, and experience with agile methodologies...",
    icon: "👤"
  },
  contract: {
    title: "Generate Contract with AI",
    description: "Describe the contract scope and terms.",
    placeholder: "E.g., Create a contract for a 12-month marketing retainer with monthly deliverables including content creation, social media management, and monthly analytics reports...",
    icon: "📄"
  },
  gate: {
    title: "Generate Gate Scenario with AI",
    description: "Describe the gate execution scenario.",
    placeholder: "E.g., Create a gate execution scenario for launching a new product feature, going through scope validation, playbook alignment, resource allocation, and go-live checklist...",
    icon: "🚪"
  }
};

const AIGenerateDialog = ({ 
  contentType, 
  onGenerated, 
  trigger,
  buttonVariant = "outline",
  buttonSize = "default",
  showIcon = true
}) => {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const config = CONTENT_CONFIGS[contentType] || CONTENT_CONFIGS.workflow;

  const handleGenerate = async () => {
    if (!description.trim()) return;
    
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await axios.post(`${API}/ai/generate/${contentType}`, null, {
        params: { description }
      });

      if (response.data.success) {
        setSuccess(`${config.icon} Successfully generated!`);
        onGenerated?.(response.data);
        
        // Close dialog after short delay
        setTimeout(() => {
          setOpen(false);
          setDescription('');
          setSuccess(null);
        }, 1500);
      }
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Generation failed');
    }
    
    setLoading(false);
  };

  const defaultTrigger = (
    <Button variant={buttonVariant} size={buttonSize}>
      {showIcon && <Sparkles className="w-4 h-4 mr-2" />}
      Generate with AI
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {config.title}
          </DialogTitle>
          <DialogDescription>
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={config.placeholder}
            className="min-h-[150px] resize-none"
            disabled={loading}
          />

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <Check className="w-4 h-4 text-green-500" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={loading || !description.trim()}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AIGenerateDialog;
