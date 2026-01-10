import React from 'react';
import { useRole, ROLE_CONFIG } from './RoleContext';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Shield, Crown, Users, CheckCircle, Briefcase, ListTodo, BookOpen,
  Wrench, Link, User, ChevronDown
} from 'lucide-react';

// Icon mapping
const ICONS = {
  Shield, Crown, Users, CheckCircle, Briefcase, ListTodo, BookOpen,
  Wrench, Link, User
};

const RoleSelector = ({ variant = 'dropdown' }) => {
  const { currentRole, switchRole, getRoleConfig } = useRole();
  const roleConfig = getRoleConfig(currentRole);
  
  // Get icon safely without dynamic component creation in render
  const roleIconName = roleConfig?.icon || 'User';
  const CurrentRoleIcon = ICONS[roleIconName] || User;

  const roles = Object.entries(ROLE_CONFIG).map(([key, config]) => ({
    key,
    ...config,
    IconComponent: ICONS[config.icon] || User,
  }));

  // Group roles by type
  const internalRoles = roles.filter(r => 
    !['AFFILIATE', 'CLIENT'].includes(r.key)
  );
  const externalRoles = roles.filter(r => 
    ['AFFILIATE', 'CLIENT'].includes(r.key)
  );

  if (variant === 'dialog') {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <CurrentRoleIcon className="w-4 h-4" style={{ color: roleConfig?.color }} />
            <span>{roleConfig?.displayName}</span>
            <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Switch Role</DialogTitle>
            <DialogDescription>
              Select a role to view the system from that perspective.
              Each role has different permissions and dashboard views.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 p-1">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Internal Roles</h4>
                <div className="grid grid-cols-2 gap-2">
                  {internalRoles.map((role) => {
                    const RoleIcon = role.IconComponent;
                    const isActive = currentRole === role.key;
                    return (
                      <button
                        key={role.key}
                        onClick={() => switchRole(role.key)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          isActive 
                            ? 'border-2 bg-muted/50' 
                            : 'border-muted hover:border-muted-foreground/20 hover:bg-muted/30'
                        }`}
                        style={isActive ? { borderColor: role.color } : {}}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <RoleIcon className="w-4 h-4" style={{ color: role.color }} />
                          <span className="font-medium text-sm">{role.displayName}</span>
                          {isActive && (
                            <Badge variant="secondary" className="ml-auto text-xs">Active</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {role.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">External Roles</h4>
                <div className="grid grid-cols-2 gap-2">
                  {externalRoles.map((role) => {
                    const RoleIcon = role.IconComponent;
                    const isActive = currentRole === role.key;
                    return (
                      <button
                        key={role.key}
                        onClick={() => switchRole(role.key)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          isActive 
                            ? 'border-2 bg-muted/50' 
                            : 'border-muted hover:border-muted-foreground/20 hover:bg-muted/30'
                        }`}
                        style={isActive ? { borderColor: role.color } : {}}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <RoleIcon className="w-4 h-4" style={{ color: role.color }} />
                          <span className="font-medium text-sm">{role.displayName}</span>
                          {isActive && (
                            <Badge variant="secondary" className="ml-auto text-xs">Active</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {role.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  }

  // Default dropdown variant
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 h-9">
          <div 
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${roleConfig?.color}20` }}
          >
            <CurrentRoleIcon className="w-3.5 h-3.5" style={{ color: roleConfig?.color }} />
          </div>
          <span className="hidden md:inline text-sm font-medium">
            {roleConfig?.displayName}
          </span>
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Switch Role</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Internal Roles */}
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Internal
        </DropdownMenuLabel>
        {internalRoles.map((role) => {
          const RoleIcon = role.IconComponent;
          const isActive = currentRole === role.key;
          return (
            <DropdownMenuItem
              key={role.key}
              onClick={() => switchRole(role.key)}
              className={isActive ? 'bg-muted' : ''}
            >
              <RoleIcon className="w-4 h-4 mr-2" style={{ color: role.color }} />
              <span>{role.displayName}</span>
              {isActive && (
                <Badge variant="secondary" className="ml-auto text-xs">●</Badge>
              )}
            </DropdownMenuItem>
          );
        })}
        
        <DropdownMenuSeparator />
        
        {/* External Roles */}
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          External
        </DropdownMenuLabel>
        {externalRoles.map((role) => {
          const RoleIcon = role.IconComponent;
          const isActive = currentRole === role.key;
          return (
            <DropdownMenuItem
              key={role.key}
              onClick={() => switchRole(role.key)}
              className={isActive ? 'bg-muted' : ''}
            >
              <RoleIcon className="w-4 h-4 mr-2" style={{ color: role.color }} />
              <span>{role.displayName}</span>
              {isActive && (
                <Badge variant="secondary" className="ml-auto text-xs">●</Badge>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default RoleSelector;
