"""
WorkflowViz - Seed Data
Predefined templates, software list, and mock team data
"""

from workflow_models import (
    Software, SoftwareCategory, TeamMember, WorkloadLevel,
    PredefinedActionTemplate, TemplateCategory, WorkflowTemplate
)


# ==================== PREDEFINED SOFTWARE ====================

PREDEFINED_SOFTWARE = [
    # CRM
    {"name": "GHL (GoHighLevel)", "category": SoftwareCategory.CRM, "icon": "ghl"},
    {"name": "HubSpot", "category": SoftwareCategory.CRM, "icon": "hubspot"},
    {"name": "Salesforce", "category": SoftwareCategory.CRM, "icon": "salesforce"},
    
    # Project Management
    {"name": "ClickUp", "category": SoftwareCategory.PROJECT_MANAGEMENT, "icon": "clickup"},
    {"name": "Asana", "category": SoftwareCategory.PROJECT_MANAGEMENT, "icon": "asana"},
    {"name": "Monday.com", "category": SoftwareCategory.PROJECT_MANAGEMENT, "icon": "monday"},
    {"name": "Trello", "category": SoftwareCategory.PROJECT_MANAGEMENT, "icon": "trello"},
    
    # Automation
    {"name": "n8n", "category": SoftwareCategory.AUTOMATION, "icon": "n8n"},
    {"name": "Zapier", "category": SoftwareCategory.AUTOMATION, "icon": "zapier"},
    {"name": "Make (Integromat)", "category": SoftwareCategory.AUTOMATION, "icon": "make"},
    
    # Recruitment
    {"name": "Manatal", "category": SoftwareCategory.RECRUITMENT, "icon": "manatal"},
    {"name": "Greenhouse", "category": SoftwareCategory.RECRUITMENT, "icon": "greenhouse"},
    
    # Communication
    {"name": "Discord", "category": SoftwareCategory.COMMUNICATION, "icon": "discord"},
    {"name": "Slack", "category": SoftwareCategory.COMMUNICATION, "icon": "slack"},
    {"name": "Microsoft Teams", "category": SoftwareCategory.COMMUNICATION, "icon": "teams"},
    {"name": "Zoom", "category": SoftwareCategory.COMMUNICATION, "icon": "zoom"},
    
    # File Storage
    {"name": "SuiteDash", "category": SoftwareCategory.FILE_STORAGE, "icon": "suitedash"},
    {"name": "Google Drive", "category": SoftwareCategory.FILE_STORAGE, "icon": "gdrive"},
    {"name": "Dropbox", "category": SoftwareCategory.FILE_STORAGE, "icon": "dropbox"},
    {"name": "OneDrive", "category": SoftwareCategory.FILE_STORAGE, "icon": "onedrive"},
    
    # Development
    {"name": "GitHub", "category": SoftwareCategory.DEVELOPMENT, "icon": "github"},
    {"name": "GitLab", "category": SoftwareCategory.DEVELOPMENT, "icon": "gitlab"},
    {"name": "Bitbucket", "category": SoftwareCategory.DEVELOPMENT, "icon": "bitbucket"},
    {"name": "VS Code", "category": SoftwareCategory.DEVELOPMENT, "icon": "vscode"},
    
    # Design
    {"name": "Canva", "category": SoftwareCategory.DESIGN, "icon": "canva"},
    {"name": "Figma", "category": SoftwareCategory.DESIGN, "icon": "figma"},
    {"name": "Adobe Creative Suite", "category": SoftwareCategory.DESIGN, "icon": "adobe"},
]


# ==================== MOCK TEAM DATA ====================

MOCK_TEAM_MEMBERS = [
    # Sales Team
    {"name": "Alex Rodriguez", "email": "alex.r@elev8.com", "role": "Sales Director", "function": "Sales", "workload": WorkloadLevel.MEDIUM, "active_assignments": 5},
    {"name": "Sarah Chen", "email": "sarah.c@elev8.com", "role": "Sales Advisor", "function": "Sales", "workload": WorkloadLevel.HIGH, "active_assignments": 8},
    {"name": "Marcus Johnson", "email": "marcus.j@elev8.com", "role": "Account Executive", "function": "Sales", "workload": WorkloadLevel.LOW, "active_assignments": 2},
    
    # Marketing Team
    {"name": "Emma Wilson", "email": "emma.w@elev8.com", "role": "Marketing Director", "function": "Marketing", "workload": WorkloadLevel.MEDIUM, "active_assignments": 6},
    {"name": "David Kim", "email": "david.k@elev8.com", "role": "Content Strategist", "function": "Marketing", "workload": WorkloadLevel.LOW, "active_assignments": 3},
    {"name": "Lisa Park", "email": "lisa.p@elev8.com", "role": "Digital Marketing Specialist", "function": "Marketing", "workload": WorkloadLevel.HIGH, "active_assignments": 9},
    
    # Operations Team
    {"name": "Michael Brown", "email": "michael.b@elev8.com", "role": "Operations Director", "function": "Operations", "workload": WorkloadLevel.HIGH, "active_assignments": 7},
    {"name": "Jennifer Taylor", "email": "jennifer.t@elev8.com", "role": "Process Manager", "function": "Operations", "workload": WorkloadLevel.MEDIUM, "active_assignments": 4},
    {"name": "Robert Garcia", "email": "robert.g@elev8.com", "role": "Quality Assurance Lead", "function": "Operations", "workload": WorkloadLevel.LOW, "active_assignments": 2},
    
    # Finance Team
    {"name": "Amanda White", "email": "amanda.w@elev8.com", "role": "Finance Director", "function": "Finance", "workload": WorkloadLevel.MEDIUM, "active_assignments": 5},
    {"name": "Chris Lee", "email": "chris.l@elev8.com", "role": "Financial Analyst", "function": "Finance", "workload": WorkloadLevel.LOW, "active_assignments": 3},
    
    # Development Team
    {"name": "Daniel Martinez", "email": "daniel.m@elev8.com", "role": "Tech Lead", "function": "Development", "workload": WorkloadLevel.HIGH, "active_assignments": 8},
    {"name": "Rachel Green", "email": "rachel.g@elev8.com", "role": "Senior Developer", "function": "Development", "workload": WorkloadLevel.MEDIUM, "active_assignments": 6},
    {"name": "Kevin Thompson", "email": "kevin.t@elev8.com", "role": "Frontend Developer", "function": "Development", "workload": WorkloadLevel.LOW, "active_assignments": 4},
    
    # Powerhouse (HR) Team
    {"name": "Nicole Adams", "email": "nicole.a@elev8.com", "role": "HR Director", "function": "Powerhouse", "workload": WorkloadLevel.MEDIUM, "active_assignments": 5},
    {"name": "James Wilson", "email": "james.w@elev8.com", "role": "Talent Acquisition Specialist", "function": "Powerhouse", "workload": WorkloadLevel.HIGH, "active_assignments": 7},
    {"name": "Ashley Moore", "email": "ashley.m@elev8.com", "role": "Training Coordinator", "function": "Powerhouse", "workload": WorkloadLevel.LOW, "active_assignments": 2},
]


# ==================== PREDEFINED ACTION TEMPLATES ====================

PREDEFINED_ACTION_TEMPLATES = [
    {
        "action_name": "Discovery Call",
        "category": TemplateCategory.SALES,
        "description": "Initial discovery call with prospect to understand needs and pain points",
        "resources": [
            {"name": "GHL CRM", "software": "GHL (GoHighLevel)"},
            {"name": "Discovery Call Script", "software": "Google Drive"},
            {"name": "Calendly Link", "software": None},
        ],
        "deliverables": [
            "Discovery Notes",
            "Initial Proposal",
            "Follow-up Email"
        ]
    },
    {
        "action_name": "Onboarding Workflow",
        "category": TemplateCategory.OPERATIONS,
        "description": "Complete client onboarding process from contract to kickoff",
        "resources": [
            {"name": "Client Onboarding Checklist", "software": "ClickUp"},
            {"name": "Welcome Email Template", "software": "GHL (GoHighLevel)"},
            {"name": "Contract Template", "software": "SuiteDash"},
        ],
        "deliverables": [
            "Signed Contract",
            "Client Dashboard Access",
            "Kickoff Meeting Notes"
        ]
    },
    {
        "action_name": "Marketing Campaign Launch",
        "category": TemplateCategory.MARKETING,
        "description": "Full campaign launch from brief to go-live",
        "resources": [
            {"name": "Campaign Brief Template", "software": "Google Drive"},
            {"name": "Asset Library", "software": "Canva"},
            {"name": "GHL Campaign Setup", "software": "GHL (GoHighLevel)"},
        ],
        "deliverables": [
            "Campaign Landing Page",
            "Email Sequences",
            "Analytics Dashboard"
        ]
    },
    {
        "action_name": "Development Sprint",
        "category": TemplateCategory.DEVELOPMENT,
        "description": "Two-week development sprint from planning to deployment",
        "resources": [
            {"name": "ClickUp Sprint Board", "software": "ClickUp"},
            {"name": "GitHub Repo", "software": "GitHub"},
            {"name": "Technical Spec Template", "software": "Google Drive"},
        ],
        "deliverables": [
            "Sprint Plan",
            "Code Review Checklist",
            "Deployment Notes"
        ]
    },
    {
        "action_name": "Financial Review",
        "category": TemplateCategory.FINANCE,
        "description": "Monthly financial review and reporting",
        "resources": [
            {"name": "Financial Dashboard", "software": "Google Drive"},
            {"name": "P&L Template", "software": "Google Drive"},
            {"name": "Budget Spreadsheet", "software": "Google Drive"},
        ],
        "deliverables": [
            "Financial Summary",
            "Variance Report",
            "Recommendations Doc"
        ]
    },
    {
        "action_name": "Recruitment Pipeline",
        "category": TemplateCategory.POWERHOUSE,
        "description": "End-to-end recruitment process from sourcing to offer",
        "resources": [
            {"name": "Manatal Pipeline", "software": "Manatal"},
            {"name": "Job Description Template", "software": "Google Drive"},
            {"name": "Interview Scorecard", "software": "Google Drive"},
        ],
        "deliverables": [
            "Candidate Shortlist",
            "Interview Feedback",
            "Offer Letter"
        ]
    },
    {
        "action_name": "Content Creation",
        "category": TemplateCategory.MARKETING,
        "description": "Content piece creation from ideation to publication",
        "resources": [
            {"name": "Content Calendar", "software": "ClickUp"},
            {"name": "Brand Guidelines", "software": "Canva"},
            {"name": "SEO Checklist", "software": "Google Drive"},
        ],
        "deliverables": [
            "Draft Content",
            "Final Approved Version",
            "Published Link"
        ]
    },
    {
        "action_name": "Client Health Check",
        "category": TemplateCategory.SALES,
        "description": "Quarterly client health assessment and review",
        "resources": [
            {"name": "Health Score Template", "software": "Google Drive"},
            {"name": "Client History (CRM)", "software": "GHL (GoHighLevel)"},
            {"name": "NPS Survey", "software": "GHL (GoHighLevel)"},
        ],
        "deliverables": [
            "Health Score Report",
            "Action Items List",
            "Follow-up Schedule"
        ]
    },
]


# ==================== SAMPLE WORKFLOW TEMPLATES ====================

SAMPLE_WORKFLOW_TEMPLATES = [
    {
        "name": "Sales Discovery Process",
        "description": "Complete sales discovery workflow from lead qualification to proposal",
        "category": TemplateCategory.SALES,
        "tags": ["sales", "discovery", "qualification"],
        "is_predefined": True,
        "nodes": [
            {"id": "t1", "type": "custom", "position": {"x": 0, "y": 0}, "data": {"label": "Lead Received", "node_type": "ISSUE", "description": "New lead enters the pipeline"}},
            {"id": "t2", "type": "custom", "position": {"x": 200, "y": 0}, "data": {"label": "Qualification Call", "node_type": "ACTION", "description": "Initial 15-min qualification call"}},
            {"id": "t3", "type": "custom", "position": {"x": 200, "y": 100}, "data": {"label": "CRM System", "node_type": "RESOURCE", "description": "GoHighLevel CRM"}},
            {"id": "t4", "type": "custom", "position": {"x": 400, "y": 0}, "data": {"label": "Discovery Call", "node_type": "ACTION", "description": "Deep-dive discovery session"}},
            {"id": "t5", "type": "custom", "position": {"x": 600, "y": 0}, "data": {"label": "Proposal Created", "node_type": "DELIVERABLE", "description": "Custom proposal document"}},
        ],
        "edges": [
            {"source": "t1", "target": "t2"},
            {"source": "t3", "target": "t2"},
            {"source": "t2", "target": "t4"},
            {"source": "t4", "target": "t5"},
        ]
    },
    {
        "name": "Client Onboarding",
        "description": "Standard client onboarding workflow",
        "category": TemplateCategory.OPERATIONS,
        "tags": ["onboarding", "client", "setup"],
        "is_predefined": True,
        "nodes": [
            {"id": "o1", "type": "custom", "position": {"x": 0, "y": 0}, "data": {"label": "Contract Signed", "node_type": "ISSUE", "description": "Client has signed the contract"}},
            {"id": "o2", "type": "custom", "position": {"x": 200, "y": 0}, "data": {"label": "Send Welcome Email", "node_type": "ACTION", "description": "Automated welcome sequence"}},
            {"id": "o3", "type": "custom", "position": {"x": 400, "y": 0}, "data": {"label": "Setup Dashboard", "node_type": "ACTION", "description": "Create client portal access"}},
            {"id": "o4", "type": "custom", "position": {"x": 200, "y": 100}, "data": {"label": "SuiteDash Portal", "node_type": "RESOURCE", "description": "Client portal system"}},
            {"id": "o5", "type": "custom", "position": {"x": 600, "y": 0}, "data": {"label": "Kickoff Meeting", "node_type": "ACTION", "description": "Initial strategy session"}},
            {"id": "o6", "type": "custom", "position": {"x": 800, "y": 0}, "data": {"label": "Onboarding Complete", "node_type": "DELIVERABLE", "description": "All onboarding tasks done"}},
        ],
        "edges": [
            {"source": "o1", "target": "o2"},
            {"source": "o2", "target": "o3"},
            {"source": "o4", "target": "o3"},
            {"source": "o3", "target": "o5"},
            {"source": "o5", "target": "o6"},
        ]
    },
    {
        "name": "Marketing Campaign",
        "description": "End-to-end marketing campaign workflow",
        "category": TemplateCategory.MARKETING,
        "tags": ["marketing", "campaign", "launch"],
        "is_predefined": True,
        "nodes": [
            {"id": "m1", "type": "custom", "position": {"x": 0, "y": 0}, "data": {"label": "Campaign Brief", "node_type": "ISSUE", "description": "Campaign requirements defined"}},
            {"id": "m2", "type": "custom", "position": {"x": 200, "y": 0}, "data": {"label": "Create Assets", "node_type": "ACTION", "description": "Design campaign visuals"}},
            {"id": "m3", "type": "custom", "position": {"x": 200, "y": 100}, "data": {"label": "Canva", "node_type": "RESOURCE", "description": "Design tool"}},
            {"id": "m4", "type": "custom", "position": {"x": 400, "y": 0}, "data": {"label": "Build Landing Page", "node_type": "ACTION", "description": "Create conversion page"}},
            {"id": "m5", "type": "custom", "position": {"x": 600, "y": 0}, "data": {"label": "Setup Automation", "node_type": "ACTION", "description": "Configure email sequences"}},
            {"id": "m6", "type": "custom", "position": {"x": 600, "y": 100}, "data": {"label": "n8n Workflows", "node_type": "RESOURCE", "description": "Automation platform"}},
            {"id": "m7", "type": "custom", "position": {"x": 800, "y": 0}, "data": {"label": "Campaign Live", "node_type": "DELIVERABLE", "description": "Campaign launched"}},
        ],
        "edges": [
            {"source": "m1", "target": "m2"},
            {"source": "m3", "target": "m2"},
            {"source": "m2", "target": "m4"},
            {"source": "m4", "target": "m5"},
            {"source": "m6", "target": "m5"},
            {"source": "m5", "target": "m7"},
        ]
    },
    {
        "name": "Development Sprint",
        "description": "Agile development sprint workflow",
        "category": TemplateCategory.DEVELOPMENT,
        "tags": ["development", "sprint", "agile"],
        "is_predefined": True,
        "nodes": [
            {"id": "d1", "type": "custom", "position": {"x": 0, "y": 0}, "data": {"label": "Sprint Planning", "node_type": "ACTION", "description": "Define sprint goals and backlog"}},
            {"id": "d2", "type": "custom", "position": {"x": 0, "y": 100}, "data": {"label": "ClickUp Board", "node_type": "RESOURCE", "description": "Project management"}},
            {"id": "d3", "type": "custom", "position": {"x": 200, "y": 0}, "data": {"label": "Development", "node_type": "ACTION", "description": "Code implementation"}},
            {"id": "d4", "type": "custom", "position": {"x": 200, "y": 100}, "data": {"label": "GitHub", "node_type": "RESOURCE", "description": "Code repository"}},
            {"id": "d5", "type": "custom", "position": {"x": 400, "y": 0}, "data": {"label": "Code Review", "node_type": "ACTION", "description": "Peer review process"}},
            {"id": "d6", "type": "custom", "position": {"x": 600, "y": 0}, "data": {"label": "Testing", "node_type": "ACTION", "description": "QA and testing"}},
            {"id": "d7", "type": "custom", "position": {"x": 800, "y": 0}, "data": {"label": "Deployment", "node_type": "DELIVERABLE", "description": "Code deployed to production"}},
        ],
        "edges": [
            {"source": "d2", "target": "d1"},
            {"source": "d1", "target": "d3"},
            {"source": "d4", "target": "d3"},
            {"source": "d3", "target": "d5"},
            {"source": "d5", "target": "d6"},
            {"source": "d6", "target": "d7"},
        ]
    },
]


def get_predefined_software():
    """Return list of Software objects"""
    return [Software(**s) for s in PREDEFINED_SOFTWARE]


def get_mock_team_members():
    """Return list of TeamMember objects"""
    return [TeamMember(**m) for m in MOCK_TEAM_MEMBERS]


def get_predefined_action_templates():
    """Return list of PredefinedActionTemplate objects"""
    return [PredefinedActionTemplate(**t) for t in PREDEFINED_ACTION_TEMPLATES]


def get_sample_workflow_templates():
    """Return list of WorkflowTemplate objects"""
    return [WorkflowTemplate(**t) for t in SAMPLE_WORKFLOW_TEMPLATES]
