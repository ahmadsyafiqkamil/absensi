"use client";

import React, { useState, useEffect } from "react";
import { Role } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Shield, Users, Settings, User } from "lucide-react";

interface RoleHierarchyDisplayProps {
  roles: Role[];
  maxDepth?: number;
  compact?: boolean;
}

interface RoleTreeNode {
  role: Role;
  children: RoleTreeNode[];
  level: number;
}

export default function RoleHierarchyDisplay({
  roles,
  maxDepth = 3,
  compact = true
}: RoleHierarchyDisplayProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());
  const [hierarchy, setHierarchy] = useState<RoleTreeNode[]>([]);

  useEffect(() => {
    buildHierarchy();
  }, [roles]);

  const buildHierarchy = () => {
    if (!roles || roles.length === 0) {
      setHierarchy([]);
      return;
    }

    // Create role map for quick lookup
    const roleMap = new Map<number, Role>();
    roles.forEach(role => roleMap.set(role.id, role));

    // Find root roles (no parent or parent not in current roles)
    const rootRoles: RoleTreeNode[] = [];
    const processed = new Set<number>();

    roles.forEach(role => {
      if (processed.has(role.id)) return;

      const node = buildNode(role, roleMap, processed, 0);
      if (node) {
        rootRoles.push(node);
      }
    });

    setHierarchy(rootRoles);
    // Auto-expand first level
    if (rootRoles.length > 0) {
      const firstLevelIds = rootRoles.map(node => node.role.id);
      setExpandedNodes(new Set(firstLevelIds));
    }
  };

  const buildNode = (
    role: Role,
    roleMap: Map<number, Role>,
    processed: Set<number>,
    level: number
  ): RoleTreeNode | null => {
    if (processed.has(role.id) || level >= maxDepth) {
      return null;
    }

    processed.add(role.id);

    const node: RoleTreeNode = {
      role,
      children: [],
      level
    };

    // Find children
    if (role.id) {
      roles.forEach(childRole => {
        if (childRole.parent_role?.id === role.id && !processed.has(childRole.id)) {
          const childNode = buildNode(childRole, roleMap, processed, level + 1);
          if (childNode) {
            node.children.push(childNode);
          }
        }
      });
    }

    return node;
  };

  const toggleNode = (roleId: number) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(roleId)) {
        newSet.delete(roleId);
      } else {
        newSet.add(roleId);
      }
      return newSet;
    });
  };

  const getRoleIcon = (category: Role['role_category']) => {
    switch (category) {
      case 'admin': return <Shield className="w-3 h-3 text-red-500" />;
      case 'supervisor': return <Users className="w-3 h-3 text-orange-500" />;
      case 'system': return <Settings className="w-3 h-3 text-purple-500" />;
      default: return <User className="w-3 h-3 text-blue-500" />;
    }
  };

  const getRoleBadgeColor = (category: Role['role_category']) => {
    switch (category) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'supervisor': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'system': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const renderNode = (node: RoleTreeNode): React.JSX.Element => {
    const isExpanded = expandedNodes.has(node.role.id);
    const hasChildren = node.children.length > 0;
    const shouldShowChildren = hasChildren && isExpanded && node.level < maxDepth;

    return (
      <div key={node.role.id}>
        <div className="flex items-center gap-1 py-1">
          <div className="flex items-center">
            {hasChildren ? (
              <Button
                variant="ghost"
                size="sm"
                className="w-4 h-4 p-0"
                onClick={() => toggleNode(node.role.id)}
              >
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </Button>
            ) : (
              <div className="w-4" />
            )}
            {getRoleIcon(node.role.role_category)}
          </div>

          <div className="flex items-center gap-1">
            <span className="text-xs font-medium">{node.role.display_name}</span>
            <Badge
              className={`${getRoleBadgeColor(node.role.role_category)} text-xs px-1 py-0`}
            >
              {node.role.role_category}
            </Badge>
            {node.role.inherit_permissions && (
              <Badge variant="outline" className="text-xs px-1 py-0">
                I
              </Badge>
            )}
            {compact && (
              <span className="text-xs text-gray-500">
                P:{node.role.role_priority}
              </span>
            )}
          </div>
        </div>

        {shouldShowChildren && (
          <div className="ml-4 border-l border-gray-200 pl-2">
            {node.children.map(child => renderNode(child))}
          </div>
        )}
      </div>
    );
  };

  if (!roles || roles.length === 0) {
    return (
      <div className="text-xs text-gray-500 italic">
        No roles assigned
      </div>
    );
  }

  return (
    <div className="max-w-xs">
      {hierarchy.map(node => renderNode(node))}
    </div>
  );
}
