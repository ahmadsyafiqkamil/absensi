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
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

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

  // Filter hierarchy based on search and category
  const getFilteredHierarchy = () => {
    let filtered = hierarchy;

    // Apply category filter
    if (filterCategory !== "all") {
      const filterNodes = (nodes: RoleHierarchyNode[]): RoleHierarchyNode[] => {
        return nodes
          .filter(node => node.role.role_category === filterCategory)
          .map(node => ({
            ...node,
            children: filterNodes(node.children)
          }));
      };
      filtered = filterNodes(filtered);
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      const searchNodes = (nodes: RoleHierarchyNode[]): RoleHierarchyNode[] => {
        return nodes
          .filter(node =>
            node.role.name.toLowerCase().includes(searchLower) ||
            node.role.display_name.toLowerCase().includes(searchLower)
          )
          .map(node => ({
            ...node,
            children: searchNodes(node.children)
          }));
      };
      filtered = searchNodes(filtered);
    }

    return filtered;
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

  const filteredHierarchy = getFilteredHierarchy();

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

        {/* Search and Filter Controls */}
        <div className="flex gap-4 mt-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search roles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="admin">Admin</option>
            <option value="supervisor">Supervisor</option>
            <option value="employee">Employee</option>
            <option value="system">System</option>
          </select>
        </div>
      </CardHeader>

      <CardContent>
        {filteredHierarchy.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {hierarchy.length === 0 ? 'No roles found in hierarchy' : 'No roles match the current filters'}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredHierarchy.map((node) => (
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
