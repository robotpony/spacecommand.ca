import { User } from '../User';
import { UserProfile, UniversePlayer } from '../types';

describe('User', () => {
  let user: User;
  const userId = 'test-user-id';
  const email = 'test@example.com';
  const username = 'testuser';
  const passwordHash = 'hashed-password';

  beforeEach(() => {
    user = new User(userId, email, username, passwordHash);
  });

  describe('constructor', () => {
    it('should create a user with correct properties', () => {
      expect(user.id).toBe(userId);
      expect(user.email).toBe(email.toLowerCase());
      expect(user.username).toBe(username);
      expect(user.passwordHash).toBe(passwordHash);
      expect(user.emailVerified).toBe(false);
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should normalize email to lowercase', () => {
      const upperCaseEmail = 'TEST@EXAMPLE.COM';
      const userWithUpperEmail = new User(userId, upperCaseEmail, username, passwordHash);
      
      expect(userWithUpperEmail.email).toBe(upperCaseEmail.toLowerCase());
    });
  });

  describe('create', () => {
    it('should create a user with generated ID', () => {
      const createdUser = User.create(email, username, passwordHash);
      
      expect(createdUser.id).toBeDefined();
      expect(createdUser.id).not.toBe(userId); // Should be different from our test ID
      expect(createdUser.email).toBe(email.toLowerCase());
      expect(createdUser.username).toBe(username);
      expect(createdUser.passwordHash).toBe(passwordHash);
      expect(createdUser.emailVerified).toBe(false);
    });
  });

  describe('verifyEmail', () => {
    it('should mark email as verified', () => {
      expect(user.emailVerified).toBe(false);
      expect(user.emailVerifiedAt).toBeUndefined();
      
      user.verifyEmail();
      
      expect(user.emailVerified).toBe(true);
      expect(user.emailVerifiedAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('updatePassword', () => {
    it('should update password hash', () => {
      const newPasswordHash = 'new-hashed-password';
      const oldUpdatedAt = user.updatedAt;
      
      user.updatePassword(newPasswordHash);
      
      expect(user.passwordHash).toBe(newPasswordHash);
      expect(user.updatedAt.getTime()).toBeGreaterThan(oldUpdatedAt.getTime());
    });
  });

  describe('updateProfile', () => {
    it('should update profile information', () => {
      const profileUpdates: Partial<UserProfile> = {
        displayName: 'Test Commander',
        bio: 'Space explorer extraordinaire',
        favoriteFaction: 'terran_federation'
      };
      
      user.updateProfile(profileUpdates);
      
      expect(user.profile).toEqual(expect.objectContaining(profileUpdates));
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should merge with existing profile data', () => {
      user.updateProfile({ displayName: 'First Name' });
      user.updateProfile({ bio: 'Some bio' });
      
      expect(user.profile).toEqual(expect.objectContaining({
        displayName: 'First Name',
        bio: 'Some bio'
      }));
    });
  });

  describe('canJoinUniverse', () => {
    it('should allow joining when no universes exist', () => {
      const canJoin = user.canJoinUniverse(3);
      
      expect(canJoin).toBe(true);
    });

    it('should allow joining when under limit', () => {
      user.universes = [
        { universeId: 'u1', userId: userId, playerId: 'p1', joinedAt: new Date(), lastPlayed: new Date(), isActive: true },
        { universeId: 'u2', userId: userId, playerId: 'p2', joinedAt: new Date(), lastPlayed: new Date(), isActive: true }
      ];
      
      const canJoin = user.canJoinUniverse(3);
      
      expect(canJoin).toBe(true);
    });

    it('should prevent joining when at limit', () => {
      user.universes = [
        { universeId: 'u1', userId: userId, playerId: 'p1', joinedAt: new Date(), lastPlayed: new Date(), isActive: true },
        { universeId: 'u2', userId: userId, playerId: 'p2', joinedAt: new Date(), lastPlayed: new Date(), isActive: true },
        { universeId: 'u3', userId: userId, playerId: 'p3', joinedAt: new Date(), lastPlayed: new Date(), isActive: true }
      ];
      
      const canJoin = user.canJoinUniverse(3);
      
      expect(canJoin).toBe(false);
    });

    it('should not count inactive universes', () => {
      user.universes = [
        { universeId: 'u1', userId: userId, playerId: 'p1', joinedAt: new Date(), lastPlayed: new Date(), isActive: true },
        { universeId: 'u2', userId: userId, playerId: 'p2', joinedAt: new Date(), lastPlayed: new Date(), isActive: false },
        { universeId: 'u3', userId: userId, playerId: 'p3', joinedAt: new Date(), lastPlayed: new Date(), isActive: false }
      ];
      
      const canJoin = user.canJoinUniverse(3);
      
      expect(canJoin).toBe(true);
    });
  });

  describe('getActiveUniverseCount', () => {
    it('should return 0 when no universes', () => {
      const count = user.getActiveUniverseCount();
      
      expect(count).toBe(0);
    });

    it('should count only active universes', () => {
      user.universes = [
        { universeId: 'u1', userId: userId, playerId: 'p1', joinedAt: new Date(), lastPlayed: new Date(), isActive: true },
        { universeId: 'u2', userId: userId, playerId: 'p2', joinedAt: new Date(), lastPlayed: new Date(), isActive: false },
        { universeId: 'u3', userId: userId, playerId: 'p3', joinedAt: new Date(), lastPlayed: new Date(), isActive: true }
      ];
      
      const count = user.getActiveUniverseCount();
      
      expect(count).toBe(2);
    });
  });

  describe('addUniverse', () => {
    it('should add a universe to the user', () => {
      const universePlayer: UniversePlayer = {
        universeId: 'u1',
        userId: userId,
        playerId: 'p1',
        joinedAt: new Date(),
        lastPlayed: new Date(),
        isActive: true
      };
      
      user.addUniverse(universePlayer);
      
      expect(user.universes).toHaveLength(1);
      expect(user.universes![0]).toEqual(universePlayer);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should initialize universes array if not exists', () => {
      expect(user.universes).toBeUndefined();
      
      const universePlayer: UniversePlayer = {
        universeId: 'u1',
        userId: userId,
        playerId: 'p1',
        joinedAt: new Date(),
        lastPlayed: new Date(),
        isActive: true
      };
      
      user.addUniverse(universePlayer);
      
      expect(user.universes).toHaveLength(1);
    });
  });

  describe('leaveUniverse', () => {
    beforeEach(() => {
      user.universes = [
        { universeId: 'u1', userId: userId, playerId: 'p1', joinedAt: new Date(), lastPlayed: new Date(), isActive: true },
        { universeId: 'u2', userId: userId, playerId: 'p2', joinedAt: new Date(), lastPlayed: new Date(), isActive: true }
      ];
    });

    it('should mark universe as inactive', () => {
      user.leaveUniverse('u1');
      
      const universe = user.universes!.find(u => u.universeId === 'u1');
      expect(universe!.isActive).toBe(false);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should not affect other universes', () => {
      user.leaveUniverse('u1');
      
      const universe2 = user.universes!.find(u => u.universeId === 'u2');
      expect(universe2!.isActive).toBe(true);
    });

    it('should handle non-existent universe gracefully', () => {
      const oldUpdatedAt = user.updatedAt;
      
      user.leaveUniverse('non-existent');
      
      expect(user.updatedAt).toEqual(oldUpdatedAt);
    });

    it('should handle empty universes array', () => {
      user.universes = [];
      
      expect(() => user.leaveUniverse('u1')).not.toThrow();
    });
  });

  describe('toJSON', () => {
    it('should return user data without sensitive fields', () => {
      user.verifyEmail();
      user.updateProfile({ displayName: 'Test User' });
      
      const json = user.toJSON();
      
      expect(json).toEqual(expect.objectContaining({
        id: userId,
        email: email.toLowerCase(),
        username: username,
        emailVerified: true,
        emailVerifiedAt: expect.any(Date),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        profile: expect.objectContaining({
          displayName: 'Test User'
        })
      }));
      
      expect(json).not.toHaveProperty('passwordHash');
    });

    it('should include universes data if present', () => {
      const universePlayer: UniversePlayer = {
        universeId: 'u1',
        userId: userId,
        playerId: 'p1',
        joinedAt: new Date(),
        lastPlayed: new Date(),
        isActive: true
      };
      
      user.addUniverse(universePlayer);
      
      const json = user.toJSON() as any;
      
      expect(json.universes).toHaveLength(1);
      expect(json.universes[0]).toEqual(expect.objectContaining({
        universeId: 'u1',
        playerId: 'p1',
        isActive: true
      }));
    });
  });

  describe('fromDatabase', () => {
    it('should create user from database row', () => {
      const dbRow = {
        id: 'db-user-id',
        email: 'db@example.com',
        username: 'dbuser',
        password_hash: 'db-hash',
        email_verified: true,
        email_verified_at: new Date(),
        created_at: new Date(),
        updated_at: new Date(),
        profile: {
          display_name: 'DB User',
          bio: 'From database',
          avatar_url: 'https://example.com/avatar.png',
          total_play_time: 1200,
          favorite_faction: 'terran_federation',
          achievements: [{ id: 'first_login', name: 'First Login', description: 'Logged in for the first time', unlockedAt: new Date() }]
        }
      };
      
      const userFromDb = User.fromDatabase(dbRow);
      
      expect(userFromDb.id).toBe('db-user-id');
      expect(userFromDb.email).toBe('db@example.com');
      expect(userFromDb.username).toBe('dbuser');
      expect(userFromDb.passwordHash).toBe('db-hash');
      expect(userFromDb.emailVerified).toBe(true);
      expect(userFromDb.emailVerifiedAt).toBeInstanceOf(Date);
      expect(userFromDb.profile).toEqual(expect.objectContaining({
        displayName: 'DB User',
        bio: 'From database',
        avatarUrl: 'https://example.com/avatar.png',
        totalPlayTime: 1200,
        favoriteFaction: 'terran_federation',
        achievements: expect.arrayContaining([
          expect.objectContaining({
            id: 'first_login',
            name: 'First Login'
          })
        ])
      }));
    });
  });
});