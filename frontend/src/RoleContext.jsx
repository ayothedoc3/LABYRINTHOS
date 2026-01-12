import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Role Context
const RoleContext = createContext(null);

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};

// Role definitions with icons and colors
export const ROLE_CONFIG = {
  ADMIN: {
    displayName: 'Administrator',
    description: 'Full system access. Protects and repairs the system.',
    color: '#EF4444',
    bgColor: 'bg-red-500',
    icon: 'Shield',
  },
  EXECUTIVE: {
    displayName: 'Executive',
    description: 'Governs direction and structure. Views all, approves strategy.',
    color: '#8B5CF6',
    bgColor: 'bg-purple-500',
    icon: 'Crown',
  },
  PROJECT_DIRECTOR: {
    displayName: 'Project Director',
    description: 'Voice of Elev8 to client. Manages client communication.',
    color: '#06B6D4',
    bgColor: 'bg-cyan-500',
    icon: 'Users',
  },
  ACCOUNTABILITY: {
    displayName: 'Accountability',
    description: 'Enforces discipline, timing, structure. Moves contracts.',
    color: '#F97316',
    bgColor: 'bg-orange-500',
    icon: 'CheckCircle',
  },
  MANAGER: {
    displayName: 'Manager',
    description: 'Shapes strategy within function. Reviews bids and proposals.',
    color: '#3B82F6',
    bgColor: 'bg-blue-500',
    icon: 'Briefcase',
  },
  COORDINATOR: {
    displayName: 'Coordinator',
    description: 'Turns strategy into structured execution. Manages tasks.',
    color: '#10B981',
    bgColor: 'bg-emerald-500',
    icon: 'ListTodo',
  },
  ADVISOR: {
    displayName: 'Advisor',
    description: 'Thinks, guides, teaches. Maintains training content.',
    color: '#6366F1',
    bgColor: 'bg-indigo-500',
    icon: 'BookOpen',
  },
  SPECIALIST: {
    displayName: 'Specialist',
    description: 'Executes tasks cleanly and focused. Sees own work only.',
    color: '#64748B',
    bgColor: 'bg-slate-500',
    icon: 'Wrench',
  },
  AFFILIATE: {
    displayName: 'Affiliate',
    description: 'Refers leads. Views earnings and referral performance.',
    color: '#EC4899',
    bgColor: 'bg-pink-500',
    icon: 'Link',
  },
  CLIENT: {
    displayName: 'Client',
    description: 'Views project progress, deliverables, and reports.',
    color: '#14B8A6',
    bgColor: 'bg-teal-500',
    icon: 'User',
  },
};

// Dashboard tiles by role
export const ROLE_TILES = {
  ADMIN: ['system_overview', 'all_contracts', 'all_users', 'automations', 'settings', 'analytics'],
  EXECUTIVE: ['executive_summary', 'finance_overview', 'sales_pipeline', 'operations_health', 'project_health', 'strategic_kpis'],
  PROJECT_DIRECTOR: ['my_projects', 'client_communications', 'deliverables', 'timeline', 'team_status'],
  ACCOUNTABILITY: ['compliance_dashboard', 'overdue_items', 'contract_lifecycle', 'escalations', 'performance_metrics'],
  MANAGER: ['function_overview', 'team_bids', 'proposals', 'strategy_inputs'],
  COORDINATOR: ['active_tasks', 'sop_library', 'team_assignments', 'milestone_tracker'],
  ADVISOR: ['training_content', 'contract_overview', 'guidance_requests'],
  SPECIALIST: ['my_tasks', 'my_deliverables', 'instructions'],
  AFFILIATE: ['referral_link', 'leads_overview', 'conversions', 'commissions', 'marketing_resources', 'training'],
  CLIENT: ['project_dashboard', 'deliverables', 'reports', 'timeline', 'support'],
};

// Role Provider Component
export const RoleProvider = ({ children }) => {
  const [currentRole, setCurrentRole] = useState(() => {
    // Load from localStorage or default to COORDINATOR
    const saved = localStorage.getItem('labyrinth_role');
    return saved || 'COORDINATOR';
  });
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rolesInfo, setRolesInfo] = useState([]);

  // Load roles info on mount
  useEffect(() => {
    const loadRolesInfo = async () => {
      try {
        const response = await axios.get(`${API}/roles/info`);
        setRolesInfo(response.data);
      } catch (error) {
        console.error('Error loading roles info:', error);
      }
    };
    loadRolesInfo();
  }, []);

  // Create/restore session when role changes
  useEffect(() => {
    const initSession = async () => {
      setLoading(true);
      try {
        const response = await axios.post(`${API}/roles/session?role=${currentRole}`);
        setUser(response.data.user);
        setPermissions(response.data.permissions);
        setSessionId(response.data.session_id);
        localStorage.setItem('labyrinth_role', currentRole);
      } catch (error) {
        console.error('Error creating session:', error);
        // Set default permissions based on role config
        setPermissions([]);
      }
      setLoading(false);
    };
    initSession();
  }, [currentRole]);

  const switchRole = useCallback((newRole) => {
    setCurrentRole(newRole);
  }, []);

  const hasPermission = useCallback((permission) => {
    return permissions.includes(permission) || 
           permissions.includes('VIEW_ALL') || 
           permissions.includes('EDIT_ALL');
  }, [permissions]);

  const getRoleConfig = useCallback((role) => {
    return ROLE_CONFIG[role] || ROLE_CONFIG.SPECIALIST;
  }, []);

  const getDashboardTiles = useCallback(() => {
    return ROLE_TILES[currentRole] || [];
  }, [currentRole]);

  const value = {
    currentRole,
    switchRole,
    user,
    permissions,
    sessionId,
    loading,
    rolesInfo,
    hasPermission,
    getRoleConfig,
    getDashboardTiles,
    ROLE_CONFIG,
    ROLE_TILES,
  };

  return (
    <RoleContext.Provider value={value}>
      {children}
    </RoleContext.Provider>
  );
};

export default RoleContext;
