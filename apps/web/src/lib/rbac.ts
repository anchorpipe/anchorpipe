import { AbilityBuilder, PureAbility } from '@casl/ability';

// Role definitions
export enum RepoRole {
  ADMIN = 'admin',
  MEMBER = 'member',
  READ_ONLY = 'read_only',
}

// Permission actions
export type PermissionAction = 'read' | 'write' | 'manage' | 'admin';

// Permission subjects
export type PermissionSubject = 'repo' | 'test_case' | 'test_run' | 'config' | 'role' | 'audit';

export type AppAbility = PureAbility<[PermissionAction, PermissionSubject]>;

// Define permissions for each role
function defineAbilitiesFor(role: RepoRole | null) {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(PureAbility);

  if (!role) {
    // No role = no permissions
    return build();
  }

  switch (role) {
    case RepoRole.ADMIN:
      // Admins can do everything
      can('read', ['repo', 'test_case', 'test_run', 'config', 'role', 'audit']);
      can('write', ['repo', 'test_case', 'test_run', 'config']);
      can('manage', ['repo', 'test_case', 'test_run', 'config']);
      can('admin', ['role', 'config']);
      break;

    case RepoRole.MEMBER:
      // Members can read and write, but not manage roles
      can('read', ['repo', 'test_case', 'test_run', 'config']);
      can('write', ['repo', 'test_case', 'test_run', 'config']);
      cannot('admin', ['role']);
      break;

    case RepoRole.READ_ONLY:
      // Read-only users can only read
      can('read', ['repo', 'test_case', 'test_run', 'config']);
      // Explicitly deny write, manage, and admin actions
      cannot('write', ['repo', 'test_case', 'test_run', 'config']);
      cannot('manage', ['repo', 'test_case', 'test_run', 'config']);
      cannot('admin', ['role', 'config']);
      // Ensure read is allowed (CASL requires explicit can() after cannot())
      can('read', ['repo', 'test_case', 'test_run', 'config']);
      break;
  }

  return build();
}

/**
 * Create an ability instance for a user's role in a repository
 */
export function createAbilityForRole(role: RepoRole | null): AppAbility {
  return defineAbilitiesFor(role);
}

/**
 * Check if a user has permission to perform an action
 */
export function can(
  ability: AppAbility,
  action: PermissionAction,
  subject: PermissionSubject
): boolean {
  return ability.can(action, subject);
}

/**
 * Require permission or throw error
 */
export function requirePermission(
  ability: AppAbility,
  action: PermissionAction,
  subject: PermissionSubject
): void {
  if (!ability.can(action, subject)) {
    throw new Error(`Permission denied: cannot ${action} ${subject}`);
  }
}
