"""
AI Service Module - Supports multiple LLM providers
Handles BYOK (Bring Your Own Key) for OpenAI, Anthropic, and Gemini
Uses EmergentIntegrations for unified access
"""

import os
import uuid
import json
import re
from typing import Optional, Dict, Any
from dotenv import load_dotenv

# Try to import emergentintegrations
try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    HAS_EMERGENT = True
except ImportError:
    HAS_EMERGENT = False
    print("Warning: emergentintegrations not installed. AI features will be limited.")

load_dotenv()

# Provider configurations
PROVIDERS = {
    "openai": {
        "name": "OpenAI",
        "models": ["gpt-5.2", "gpt-5.1", "gpt-4o", "gpt-4o-mini"],
        "default_model": "gpt-5.2"
    },
    "anthropic": {
        "name": "Anthropic (Claude)",
        "models": ["claude-sonnet-4-5-20250929", "claude-4-sonnet-20250514", "claude-3-5-haiku-20241022"],
        "default_model": "claude-sonnet-4-5-20250929"
    },
    "gemini": {
        "name": "Google Gemini",
        "models": ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-3-flash-preview"],
        "default_model": "gemini-2.5-flash"
    }
}


class AIService:
    """Unified AI Service supporting multiple providers with BYOK"""
    
    def __init__(self, provider: str = "openai", api_key: Optional[str] = None, model: Optional[str] = None):
        self.provider = provider
        self.model = model or PROVIDERS.get(provider, {}).get("default_model", "gpt-5.2")
        
        # Use provided key or fallback to environment
        if api_key:
            self.api_key = api_key
        else:
            # Use Emergent LLM Key
            self.api_key = os.environ.get("EMERGENT_LLM_KEY")
    
    async def generate(self, prompt: str, system_message: str = "You are a helpful assistant.") -> str:
        """Generate text from the configured LLM provider"""
        
        if not HAS_EMERGENT:
            raise Exception("AI features require emergentintegrations. Install with: pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/")
        
        if not self.api_key:
            raise Exception("No API key configured. Set EMERGENT_LLM_KEY in environment or provide an API key.")
        
        try:
            session_id = str(uuid.uuid4())
            chat = LlmChat(
                api_key=self.api_key,
                session_id=session_id,
                system_message=system_message
            )
            
            # Set the appropriate model and provider
            if self.provider == "anthropic":
                chat.with_model("anthropic", self.model)
            elif self.provider == "gemini":
                chat.with_model("gemini", self.model)
            else:  # openai
                chat.with_model("openai", self.model)
            
            user_message = UserMessage(text=prompt)
            response = await chat.send_message(user_message)
            return response
        except Exception as e:
            raise Exception(f"AI generation failed: {str(e)}")


# ==================== INDUSTRY SAMPLES ====================

INDUSTRY_SAMPLES = {
    "sales": {
        "playbooks": [
            "Lead Generation", "Discovery Call Process", "Proposal Creation", 
            "Objection Handling", "Closing Techniques", "Account Management",
            "Upselling Strategies", "Referral Programs"
        ],
        "sops": [
            "Lead Qualification Checklist", "CRM Data Entry", "Follow-up Sequence",
            "Demo Preparation", "Contract Review Process", "Handoff to Success Team"
        ]
    },
    "marketing": {
        "playbooks": [
            "Content Marketing Strategy", "Social Media Campaign", "Email Marketing",
            "SEO Optimization", "Paid Advertising", "Brand Development",
            "Influencer Partnerships", "Event Marketing"
        ],
        "sops": [
            "Content Creation Workflow", "Social Media Posting Schedule",
            "Email List Segmentation", "Campaign Analytics Review", "A/B Testing Process"
        ]
    },
    "operations": {
        "playbooks": [
            "Process Optimization", "Quality Assurance", "Vendor Management",
            "Inventory Control", "Facility Management", "Cost Reduction"
        ],
        "sops": [
            "Daily Operations Checklist", "Equipment Maintenance", "Safety Protocols",
            "Incident Reporting", "Shift Handover Process", "Inventory Audit"
        ]
    },
    "hr": {
        "playbooks": [
            "Recruitment Strategy", "Onboarding Program", "Performance Management",
            "Employee Engagement", "Training & Development", "Offboarding"
        ],
        "sops": [
            "Interview Process", "Background Check Procedure", "New Hire Setup",
            "Performance Review Cycle", "PTO Request Handling", "Exit Interview"
        ]
    },
    "finance": {
        "playbooks": [
            "Budget Planning", "Cash Flow Management", "Financial Reporting",
            "Audit Preparation", "Tax Planning", "Investment Strategy"
        ],
        "sops": [
            "Invoice Processing", "Expense Approval", "Month-End Close",
            "Payroll Processing", "Vendor Payment", "Financial Reconciliation"
        ]
    },
    "customer_service": {
        "playbooks": [
            "Customer Onboarding", "Support Escalation", "Complaint Resolution",
            "Customer Retention", "Feedback Collection", "Service Recovery"
        ],
        "sops": [
            "Ticket Triage Process", "First Response Protocol", "Escalation Matrix",
            "Refund Processing", "Customer Survey Distribution", "Knowledge Base Update"
        ]
    },
    "technology": {
        "playbooks": [
            "Software Development Lifecycle", "Incident Response", "Security Protocol",
            "Data Backup Strategy", "System Integration", "Tech Stack Evaluation"
        ],
        "sops": [
            "Code Review Process", "Deployment Checklist", "Bug Triage",
            "Server Maintenance", "Access Control Review", "Disaster Recovery"
        ]
    }
}

# ==================== SYSTEM PROMPTS ====================

SYSTEM_PROMPTS = {
    "playbook_md": """You are an expert business strategist creating comprehensive playbooks.

Generate a detailed playbook in Markdown format based on the provided topic/industry keywords.

Format your response as follows:

# [Playbook Title]

## Overview
Brief description of what this playbook covers and its objectives.

## Target Audience
Who should use this playbook.

## Prerequisites
What needs to be in place before using this playbook.

## Key Strategies

### Strategy 1: [Name]
**Objective:** What this strategy achieves
**Steps:**
1. Step one description
2. Step two description
3. Step three description

**Best Practices:**
- Practice 1
- Practice 2

**Common Pitfalls:**
- Pitfall to avoid 1
- Pitfall to avoid 2

### Strategy 2: [Name]
[Continue with same format]

## KPIs & Metrics
| Metric | Target | Measurement Frequency |
|--------|--------|----------------------|
| Metric 1 | Target value | Weekly/Monthly |

## Resources Needed
- Resource 1
- Resource 2

## Timeline
Suggested implementation timeline.

## Next Steps
What to do after implementing this playbook.

Be specific, actionable, and industry-relevant.""",

    "sop_md": """You are an expert operations manager creating detailed Standard Operating Procedures.

Generate a comprehensive SOP in Markdown format based on the provided topic/industry keywords.

Format your response as follows:

# SOP: [Title]

## Document Information
- **Version:** 1.0
- **Effective Date:** [Current Date]
- **Department:** [Relevant Department]
- **Owner:** [Role responsible]

## Purpose
Clear statement of why this SOP exists and what it accomplishes.

## Scope
What this SOP covers and what it doesn't cover.

## Definitions
| Term | Definition |
|------|------------|
| Term 1 | Definition |

## Responsibilities
| Role | Responsibilities |
|------|-----------------|
| Role 1 | What they're responsible for |

## Procedure

### Step 1: [Title]
**Estimated Time:** X minutes
**Responsible:** [Role]

**Instructions:**
1. Detailed instruction 1
2. Detailed instruction 2
3. Detailed instruction 3

**Quality Checks:**
- [ ] Checkpoint 1
- [ ] Checkpoint 2

### Step 2: [Title]
[Continue with same format for each step]

## Tools & Resources Required
- Tool/Resource 1
- Tool/Resource 2

## Related Documents
- Document 1
- Document 2

## Revision History
| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | [Date] | Initial version | [Author] |

Be specific, detailed, and include quality checkpoints.""",

    "contract_md": """You are an expert contract specialist creating contract templates and frameworks.

Generate a contract framework/template in Markdown format based on the provided type/industry keywords.

Format your response as follows:

# [Contract Type] Agreement

## Parties
**Service Provider:** [Company Name]
**Client:** [Client Name]
**Effective Date:** [Date]

## 1. Purpose & Scope
Clear description of what this agreement covers.

### 1.1 Services Included
- Service 1
- Service 2
- Service 3

### 1.2 Services Excluded
- Exclusion 1
- Exclusion 2

## 2. Term & Duration
- **Start Date:** [Date]
- **End Date:** [Date]
- **Renewal Terms:** [Auto-renewal/Manual]

## 3. Deliverables
| Deliverable | Description | Due Date |
|-------------|-------------|----------|
| Deliverable 1 | Description | Date |

## 4. Pricing & Payment
### 4.1 Fee Structure
| Service | Price | Frequency |
|---------|-------|-----------|
| Service 1 | $X | Monthly |

### 4.2 Payment Terms
- Payment due within X days
- Accepted methods: [Methods]

## 5. Key Performance Indicators (KPIs)
| KPI | Target | Measurement |
|-----|--------|-------------|
| KPI 1 | Target | How measured |

## 6. Responsibilities

### 6.1 Provider Responsibilities
- Responsibility 1
- Responsibility 2

### 6.2 Client Responsibilities
- Responsibility 1
- Responsibility 2

## 7. Confidentiality
Terms for handling confidential information.

## 8. Termination
- **Notice Period:** X days
- **Termination for Cause:** Conditions
- **Termination for Convenience:** Conditions

## 9. Limitation of Liability
Standard limitation language.

## 10. Signatures
| Party | Name | Title | Date | Signature |
|-------|------|-------|------|-----------|
| Provider | | | | |
| Client | | | | |

Be professional and include relevant legal considerations."""
}


# ==================== GENERATION FUNCTIONS ====================

async def generate_content(
    content_type: str,
    description: str,
    provider: str = "openai",
    api_key: Optional[str] = None,
    model: Optional[str] = None,
    industry: Optional[str] = None
) -> Dict[str, Any]:
    """Generate content based on type and description"""
    
    service = AIService(provider=provider, api_key=api_key, model=model)
    
    # Build the prompt with industry context
    industry_context = ""
    if industry and industry.lower() in INDUSTRY_SAMPLES:
        samples = INDUSTRY_SAMPLES[industry.lower()]
        if content_type == "playbook":
            industry_context = f"\n\nIndustry: {industry.upper()}\nExample topics in this industry: {', '.join(samples.get('playbooks', []))}"
        elif content_type == "sop":
            industry_context = f"\n\nIndustry: {industry.upper()}\nExample SOPs in this industry: {', '.join(samples.get('sops', []))}"
    
    if content_type == "playbook":
        system_prompt = SYSTEM_PROMPTS["playbook_md"]
        prompt = f"Create a detailed playbook for: {description}{industry_context}"
    elif content_type == "sop":
        system_prompt = SYSTEM_PROMPTS["sop_md"]
        prompt = f"Create a detailed SOP for: {description}{industry_context}"
    elif content_type == "contract":
        system_prompt = SYSTEM_PROMPTS["contract_md"]
        prompt = f"Create a contract framework for: {description}{industry_context}"
    else:
        # Default generic generation
        system_prompt = "You are a helpful business consultant. Generate professional content in Markdown format."
        prompt = f"Generate professional content about: {description}"
    
    # Generate the content
    response = await service.generate(prompt, system_prompt)
    
    # Extract title from markdown
    title = description
    if response:
        title_match = re.search(r'^#\s+(.+)$', response, re.MULTILINE)
        if title_match:
            title = title_match.group(1).strip()
    
    return {
        "title": title,
        "content": response,
        "content_type": content_type,
        "format": "markdown",
        "industry": industry,
        "description": description
    }


async def generate_playbook(description: str, industry: str = None, provider: str = "openai", api_key: str = None, model: str = None) -> Dict[str, Any]:
    """Generate a playbook in Markdown format"""
    return await generate_content("playbook", description, provider, api_key, model, industry)


async def generate_sop(description: str, industry: str = None, provider: str = "openai", api_key: str = None, model: str = None) -> Dict[str, Any]:
    """Generate an SOP in Markdown format"""
    return await generate_content("sop", description, provider, api_key, model, industry)


async def generate_contract(description: str, industry: str = None, provider: str = "openai", api_key: str = None, model: str = None) -> Dict[str, Any]:
    """Generate a contract framework in Markdown format"""
    return await generate_content("contract", description, provider, api_key, model, industry)


# ==================== INDUSTRY SUGGESTIONS ====================

def get_industry_suggestions(industry: str = None) -> Dict[str, Any]:
    """Get industry-specific suggestions for SOPs and playbooks"""
    if industry and industry.lower() in INDUSTRY_SAMPLES:
        return {
            "industry": industry,
            "suggestions": INDUSTRY_SAMPLES[industry.lower()]
        }
    return {
        "industries": list(INDUSTRY_SAMPLES.keys()),
        "all_suggestions": INDUSTRY_SAMPLES
    }
