"""
AI Service Module - Supports multiple LLM providers
Handles BYOK (Bring Your Own Key) for OpenAI, Anthropic (Claude), and OpenRouter
"""

import os
import uuid
from typing import Optional, Dict, Any
from dotenv import load_dotenv
from openai import OpenAI

# Try to import emergentintegrations, but make it optional
try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    HAS_EMERGENT = True
except ImportError:
    HAS_EMERGENT = False
    # Create mock classes if emergentintegrations is not available
    class LlmChat:
        def __init__(self, **kwargs):
            pass
        def chat(self, messages):
            return {"content": "Emergent integrations not available. Using mock response."}

    class UserMessage:
        def __init__(self, content):
            self.content = content

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
    "openrouter": {
        "name": "OpenRouter",
        "models": ["openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet", "google/gemini-2.0-flash-exp"],
        "default_model": "openai/gpt-4o-mini"
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
        elif provider == "openrouter":
            self.api_key = os.environ.get("OPENROUTER_API_KEY")
        else:
            # Use Emergent LLM Key for OpenAI, Anthropic, Gemini
            self.api_key = os.environ.get("EMERGENT_LLM_KEY")
    
    async def generate(self, prompt: str, system_message: str = "You are a helpful assistant.", temperature: float = 0.7) -> str:
        """Generate text from the configured LLM provider"""
        
        if self.provider == "openrouter":
            return await self._generate_openrouter(prompt, system_message, temperature)
        else:
            return await self._generate_emergent(prompt, system_message, temperature)
    
    async def _generate_emergent(self, prompt: str, system_message: str, temperature: float) -> str:
        """Use Emergent integrations for OpenAI, Anthropic, Gemini"""
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
    
    async def _generate_openrouter(self, prompt: str, system_message: str, temperature: float) -> str:
        """Use OpenRouter API directly"""
        try:
            client = OpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=self.api_key,
            )
            
            response = client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": prompt}
                ],
                temperature=temperature,
                max_tokens=2000
            )
            
            return response.choices[0].message.content
        except Exception as e:
            raise Exception(f"OpenRouter generation failed: {str(e)}")


# System prompts for different content types
SYSTEM_PROMPTS = {
    "workflow": """You are an expert business workflow designer. Create detailed, actionable workflows with clear steps.
Output in JSON format with the following structure:
{
  "name": "Workflow name",
  "description": "Brief description",
  "nodes": [
    {
      "label": "Node name",
      "description": "What this step does",
      "node_type": "ISSUE|ACTION|RESOURCE|DELIVERABLE",
      "position": {"x": 0, "y": 0}
    }
  ],
  "connections": [
    {"from_index": 0, "to_index": 1}
  ]
}
Positions should be spaced 250px horizontally and 150px vertically.""",
    
    "playbook": """You are an expert business strategist. Create comprehensive playbooks with actionable strategies.
Output in JSON format with the following structure:
{
  "title": "Playbook title",
  "function": "SALES|MARKETING|DEVELOPMENT|FINANCE|OPERATIONS|POWERHOUSE",
  "level": "ACQUIRE|MAINTAIN|SCALE",
  "description": "Detailed description",
  "objectives": ["objective1", "objective2"],
  "strategies": [
    {
      "name": "Strategy name",
      "description": "How to execute",
      "priority": "high|medium|low"
    }
  ],
  "kpi_targets": {"metric": "value"}
}""",
    
    "sop": """You are an expert operations manager. Create detailed Standard Operating Procedures.
Output in JSON format with the following structure:
{
  "title": "SOP Title",
  "function": "SALES|MARKETING|DEVELOPMENT|FINANCE|OPERATIONS|POWERHOUSE",
  "tier": 1|2|3,
  "description": "What this SOP covers",
  "steps": [
    {
      "order": 1,
      "title": "Step title",
      "description": "Detailed instructions",
      "responsible_role": "Who does this",
      "estimated_time": "5 minutes",
      "tools_required": ["tool1"],
      "quality_checks": ["check1"]
    }
  ],
  "tools_required": ["Overall tools"],
  "estimated_total_time": "30 minutes"
}""",
    
    "talent": """You are an HR expert. Create detailed talent profiles and role requirements.
Output in JSON format with the following structure:
{
  "name": "Role/Position Name",
  "function": "SALES|MARKETING|DEVELOPMENT|FINANCE|OPERATIONS|POWERHOUSE",
  "tier": 1|2|3,
  "role": "Job title",
  "description": "Role description",
  "responsibilities": ["resp1", "resp2"],
  "competencies": {
    "technical": 80,
    "communication": 70,
    "leadership": 60,
    "problem_solving": 75,
    "adaptability": 70,
    "creativity": 65,
    "time_management": 70,
    "collaboration": 75
  },
  "skills_required": ["skill1", "skill2"],
  "hourly_rate": 50
}""",
    
    "contract": """You are a legal and business contract expert. Create detailed contract structures.
Output in JSON format with the following structure:
{
  "title": "Contract Title",
  "client_name": "Client Name",
  "package": "BRONZE|SILVER|GOLD|BLACK",
  "description": "Contract scope",
  "boundaries": [
    {
      "category": "Category name",
      "included": ["what's included"],
      "excluded": ["what's not included"],
      "limitations": "Any limits"
    }
  ],
  "value": 10000,
  "duration_months": 12,
  "terms": ["term1", "term2"]
}""",
    
    "gate": """You are a business process and quality gate expert. Create gate execution scenarios.
Output in JSON format with the following structure:
{
  "function": "SALES|MARKETING|DEVELOPMENT|FINANCE|OPERATIONS|POWERHOUSE",
  "gate_sequence": [
    {
      "gate": "G1_SCOPE|G2_PLAYBOOK|G3_TALENT|G4_CONTRACT|G5_SOP|G6_EXECUTION|G7_COMPLETION",
      "action": "Action to take",
      "expected_outcome": "What should happen",
      "validation_criteria": ["criteria1"]
    }
  ],
  "context": "Business context for this gate run"
}"""
}


async def generate_content(content_type: str, description: str, provider: str = "openai", api_key: Optional[str] = None, model: Optional[str] = None) -> Dict[str, Any]:
    """Generate content of specified type from natural language description"""
    import json
    
    system_prompt = SYSTEM_PROMPTS.get(content_type)
    if not system_prompt:
        raise ValueError(f"Unknown content type: {content_type}")
    
    ai_service = AIService(provider=provider, api_key=api_key, model=model)
    
    prompt = f"Create a {content_type} based on the following description:\n\n{description}\n\nOutput only valid JSON, no additional text."
    
    response = await ai_service.generate(prompt, system_prompt)
    
    # Extract JSON from response (handle markdown code blocks)
    response = response.strip()
    if response.startswith("```json"):
        response = response[7:]
    if response.startswith("```"):
        response = response[3:]
    if response.endswith("```"):
        response = response[:-3]
    response = response.strip()
    
    try:
        return json.loads(response)
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse AI response as JSON: {str(e)}")
