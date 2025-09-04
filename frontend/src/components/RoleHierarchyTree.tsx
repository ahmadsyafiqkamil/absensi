"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Users, Shield, Settings, User } from "lucide-react";
import { Role, RoleHierarchyNode } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RoleHierarchyTreeProps {
  onRoleSelect?: (role: Role) => void;
  showStats?: boolean;
  maxDepth?: number;
}

interface TreeNodeProps {
  node: RoleHierarchyNode;
  level: number;
  expandedNodes: Set<number>;
  onToggle: (roleId: number) => void;
  onRoleSelect?: (role: Role) => void;
  showStats: boolean;
}

function TreeNode({ node, level, expandedNodes, onToggle, onRoleSelect, showStats }: TreeNodeProps) {
  const isExpanded = expandedNodes.has(node.role.id);
  const hasChildren = node.children.length > 0;
  const indentClass = `ml-${Math.min(level * 4, 16)}`;

  const getRoleIcon = (category: Role['role_category']) => {
    switch (category) {
      case 'admin': return <Shield className="w-4 h-4 text-red-500" />;
      case 'supervisor': return <Users className="w-4 h-4 text-orange-500" />;
      case 'system': return <Settings className="w-4 h-4 text-purple-500" />;
      default: return <User className="w-4 h-4 text-blue-500" />;
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

  return (
    <div className={`${indentClass}`}>
      <div className="flex items-center gap-2 py-2 hover:bg-gray-50 rounded px-2">
        <div className="flex items-center">
          {hasChildren ? (
            <Button
              variant="ghost"
              size="sm"
              className="w-6 h-6 p-0"
              onClick={() => onToggle(node.role.id)}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </Button>
          ) : (
            <div className="w-6" />
          )}
          {getRoleIcon(node.role.role_category)}
        </div>

        <div className="flex-1 flex items-center gap-3">
          <div
            className="cursor-pointer hover:underline"
            onClick={() => onRoleSelect?.(node.role)}
          >
            <span className="font-medium">{node.role.display_name}</span>
            <span className="text-sm text-gray-500 ml-2">({node.role.name})</span>
          </div>

          <Badge className={getRoleBadgeColor(node.role.role_category)}>
            {node.role.role_category}
          </Badge>

          {showStats && (
            <div className="flex gap-2 text-xs text-gray-500">
              <span>P:{node.role.role_priority}</span>
              <span>L:{node.level}</span>
              <span>D:{node.descendant_count}</span>
              <span>Perm:{node.permissions_count}</span>
            </div>
          )}
        </div>

        {!node.role.is_active && (
          <Badge variant="destructive">Inactive</Badge>
        )}

        {node.role.inherit_permissions && (
          <Badge variant="outline" className="text-xs">
            Inherits
          </Badge>
        )}
      </div>

      {isExpanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.role.id}
              node={child}
              level={level + 1}
              expandedNodes={expandedNodes}
              onToggle={onToggle}
              onRoleSelect={onRoleSelect}
              showStats={showStats}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function RoleHierarchyTree({
  onRoleSelect,
  showStats = true,
  maxDepth = 10
}: RoleHierarchyTreeProps) {
  const [hierarchy, setHierarchy] = useState<RoleHierarchyNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchHierarchy();
  }, []);

  const fetchHierarchy = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/roles/hierarchy/');
      if (!response.ok) {
        throw new Error('Failed to fetch hierarchy');
      }

      const data = await response.json();
      setHierarchy(data);

      // Auto-expand first level
      if (data.length > 0) {
        const firstLevelIds = data.map((node: RoleHierarchyNode) => node.role.id);
        setExpandedNodes(new Set(firstLevelIds));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch hierarchy');
    } finally {
      setLoading(false);
    }
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

  const expandAll = () => {
    const allIds = new Set<number>();
    const collectIds = (nodes: RoleHierarchyNode[]) => {
      nodes.forEach(node => {
        allIds.add(node.role.id);
        if (node.children.length > 0) {
          collectIds(node.children);
        }
      });
    };
    collectIds(hierarchy);
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-2"></div>
            <p>Loading hierarchy...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-red-600">
            <p>Error: {error}</p>
            <Button onClick={fetchHierarchy} className="mt-2">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Role Hierarchy</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={expandAll}>
              Expand All
            </Button>
            <Button size="sm" variant="outline" onClick={collapseAll}>
              Collapse All
            </Button>
            <Button size="sm" onClick={fetchHierarchy}>
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {hierarchy.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No roles found in hierarchy
          </div>
        ) : (
          <div className="space-y-1">
            {hierarchy.map((node) => (
              <TreeNode
                key={node.role.id}
                node={node}
                level={0}
                expandedNodes={expandedNodes}
                onToggle={toggleNode}
                onRoleSelect={onRoleSelect}
                showStats={showStats}
              />
            ))}
          </div>
        )}

        {showStats && hierarchy.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold text-lg">{hierarchy.length}</div>
                <div className="text-gray-600">Root Roles</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-lg">
                  {hierarchy.reduce((sum, node) => sum + node.descendant_count, 0)}
                </div>
                <div className="text-gray-600">Total Descendants</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-lg">
                  {Math.max(...hierarchy.map(node => node.role.hierarchy_level || 0)) + 1}
                </div>
                <div className="text-gray-600">Max Depth</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-lg">
                  {hierarchy.reduce((sum, node) => sum + node.permissions_count, 0)}
                </div>
                <div className="text-gray-600">Total Permissions</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
