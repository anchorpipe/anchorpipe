import { describe, it, expect } from 'vitest';
import { createAbilityForRole, RepoRole, can, requirePermission } from './rbac';

describe('RBAC', () => {
  describe('createAbilityForRole', () => {
    it('should create ability with no permissions for null role', () => {
      const ability = createAbilityForRole(null);
      expect(ability.can('read', 'repo')).toBe(false);
      expect(ability.can('write', 'repo')).toBe(false);
      expect(ability.can('admin', 'role')).toBe(false);
    });

    it('should create ability with admin permissions for admin role', () => {
      const ability = createAbilityForRole(RepoRole.ADMIN);
      expect(ability.can('read', 'repo')).toBe(true);
      expect(ability.can('write', 'repo')).toBe(true);
      expect(ability.can('manage', 'repo')).toBe(true);
      expect(ability.can('admin', 'role')).toBe(true);
      expect(ability.can('admin', 'config')).toBe(true);
    });

    it('should create ability with member permissions for member role', () => {
      const ability = createAbilityForRole(RepoRole.MEMBER);
      expect(ability.can('read', 'repo')).toBe(true);
      expect(ability.can('write', 'repo')).toBe(true);
      expect(ability.can('manage', 'repo')).toBe(false); // Members don't have manage permission
      expect(ability.can('admin', 'role')).toBe(false);
    });

    it('should create ability with read-only permissions for read_only role', () => {
      const ability = createAbilityForRole(RepoRole.READ_ONLY);
      expect(ability.can('read', 'repo')).toBe(true);
      expect(ability.can('write', 'repo')).toBe(false);
      expect(ability.can('manage', 'repo')).toBe(false);
      expect(ability.can('admin', 'role')).toBe(false);
    });
  });

  describe('can', () => {
    it('should check permissions correctly', () => {
      const adminAbility = createAbilityForRole(RepoRole.ADMIN);
      expect(can(adminAbility, 'read', 'repo')).toBe(true);
      expect(can(adminAbility, 'admin', 'role')).toBe(true);

      const memberAbility = createAbilityForRole(RepoRole.MEMBER);
      expect(can(memberAbility, 'read', 'repo')).toBe(true);
      expect(can(memberAbility, 'admin', 'role')).toBe(false);
    });
  });

  describe('requirePermission', () => {
    it('should not throw for allowed permissions', () => {
      const ability = createAbilityForRole(RepoRole.ADMIN);
      expect(() => requirePermission(ability, 'read', 'repo')).not.toThrow();
      expect(() => requirePermission(ability, 'admin', 'role')).not.toThrow();
    });

    it('should throw for denied permissions', () => {
      const ability = createAbilityForRole(RepoRole.READ_ONLY);
      expect(() => requirePermission(ability, 'write', 'repo')).toThrow();
      expect(() => requirePermission(ability, 'admin', 'role')).toThrow();
    });
  });
});
