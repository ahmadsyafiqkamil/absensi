import { Role, RoleHierarchyNode } from './types';

/**
 * Utility functions for role management and hierarchy operations
 */

/**
 * Build a hierarchical tree structure from flat role list
 */
export function buildRoleHierarchy(roles: Role[]): RoleHierarchyNode[] {
  if (!roles || roles.length === 0) {
    return [];
  }

  // Create role map for quick lookup
  const roleMap = new Map<number, Role>();
  roles.forEach(role => roleMap.set(role.id, role));

  // Find root roles (no parent)
  const rootRoles: RoleHierarchyNode[] = [];
  const processed = new Set<number>();

  roles.forEach(role => {
    if (processed.has(role.id)) return;

    const node = buildHierarchyNode(role, roleMap, processed, 0);
    if (node) {
      rootRoles.push(node);
    }
  });

  return rootRoles;
}

/**
 * Build a single hierarchy node recursively
 */
function buildHierarchyNode(
  role: Role,
  roleMap: Map<number, Role>,
  processed: Set<number>,
  level: number
): RoleHierarchyNode | null {
  if (processed.has(role.id)) {
    return null;
  }

  processed.add(role.id);

  const node: RoleHierarchyNode = {
    role,
    children: [],
    level,
    permissions_count: Object.keys(role.permissions || {}).length,
    descendant_count: 0
  };

  // Find children
  roleMap.forEach(childRole => {
    if (childRole.parent_role?.id === role.id && !processed.has(childRole.id)) {
      const childNode = buildHierarchyNode(childRole, roleMap, processed, level + 1);
      if (childNode) {
        node.children.push(childNode);
        node.descendant_count += 1 + childNode.descendant_count;
      }
    }
  });

  return node;
}

/**
 * Get all permissions for a role including inherited ones
 */
export function getAllPermissions(role: Role, allRoles: Role[]): Record<string, string[]> {
  const allPermissions = { ...role.permissions };

  if (!role.inherit_permissions || !role.parent_role) {
    return allPermissions;
  }

  // Find parent role
  const parentRole = allRoles.find(r => r.id === role.parent_role?.id);
  if (!parentRole) {
    return allPermissions;
  }

  // Get parent's permissions recursively
  const parentPermissions = getAllPermissions(parentRole, allRoles);

  // Merge permissions (child takes precedence)
  Object.entries(parentPermissions).forEach(([type, actions]) => {
    if (!allPermissions[type]) {
      allPermissions[type] = actions;
    } else {
      // Merge actions, remove duplicates
      const combined = new Set([...allPermissions[type], ...actions]);
      allPermissions[type] = Array.from(combined);
    }
  });

  return allPermissions;
}

/**
 * Check if a role has a specific permission (including inherited)
 */
export function hasPermissionInherited(
  role: Role,
  permissionType: string,
  permissionAction: string,
  allRoles: Role[]
): boolean {
  const allPermissions = getAllPermissions(role, allRoles);
  return allPermissions[permissionType]?.includes(permissionAction) || false;
}

/**
 * Get the full parent chain of a role
 */
export function getParentChain(role: Role, allRoles: Role[]): Role[] {
  const chain: Role[] = [];
  let current = role;

  while (current.parent_role) {
    const parent = allRoles.find(r => r.id === current.parent_role?.id);
    if (!parent) break;

    chain.unshift(parent);
    current = parent;

    // Prevent infinite loops
    if (chain.length > 10) break;
  }

  return chain;
}

/**
 * Get hierarchy level of a role (0 = root)
 */
export function getHierarchyLevel(role: Role, allRoles: Role[]): number {
  if (!role.parent_role) return 0;

  const parent = allRoles.find(r => r.id === role.parent_role?.id);
  if (!parent) return 0;

  return getHierarchyLevel(parent, allRoles) + 1;
}

/**
 * Check if a role can be assigned as parent of another role
 */
export function canBeParentOf(parentRole: Role, childRole: Role, allRoles: Role[]): boolean {
  if (parentRole.id === childRole.id) return false;

  // Check if child is in parent's ancestry
  const parentChain = getParentChain(parentRole, allRoles);
  return !parentChain.some(role => role.id === childRole.id);
}

/**
 * Get all descendant roles of a role
 */
export function getDescendants(role: Role, allRoles: Role[]): Role[] {
  const descendants: Role[] = [];

  allRoles.forEach(r => {
    if (r.parent_role?.id === role.id) {
      descendants.push(r);
      descendants.push(...getDescendants(r, allRoles));
    }
  });

  return descendants;
}

/**
 * Get role statistics
 */
export function getRoleStatistics(roles: Role[]) {
  const stats = {
    total: roles.length,
    active: roles.filter(r => r.is_active).length,
    inactive: roles.filter(r => !r.is_active).length,
    system: roles.filter(r => r.is_system_role).length,
    byCategory: {} as Record<string, number>,
    withInheritance: roles.filter(r => r.inherit_permissions).length,
    maxDepth: 0,
    averagePermissions: 0
  };

  // Category breakdown
  roles.forEach(role => {
    stats.byCategory[role.role_category] = (stats.byCategory[role.role_category] || 0) + 1;
  });

  // Max depth
  roles.forEach(role => {
    const level = getHierarchyLevel(role, roles);
    stats.maxDepth = Math.max(stats.maxDepth, level);
  });

  // Average permissions
  const totalPermissions = roles.reduce((sum, role) =>
    sum + Object.keys(role.permissions || {}).length, 0
  );
  stats.averagePermissions = roles.length > 0 ? totalPermissions / roles.length : 0;

  return stats;
}

/**
 * Validate role hierarchy for circular references
 */
export function validateHierarchy(roles: Role[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  roles.forEach(role => {
    if (role.parent_role) {
      const parent = roles.find(r => r.id === role.parent_role?.id);
      if (!parent) {
        errors.push(`Role "${role.name}" has invalid parent reference`);
        return;
      }

      // Check for circular reference
      const chain = getParentChain(role, roles);
      if (chain.some(r => r.id === role.id)) {
        errors.push(`Circular reference detected in role "${role.name}" hierarchy`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}
