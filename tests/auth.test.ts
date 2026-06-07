// tests/auth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma and bcrypt before importing service
vi.mock('../src/config/database', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashed_password'),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('../src/config/env', () => ({
  env: {
    JWT_SECRET: 'test-secret-key-at-least-32-characters-long-for-testing',
    JWT_EXPIRES_IN: '7d',
    NODE_ENV: 'test',
    PORT: 3000,
    DATABASE_URL: 'file:./test.db',
    LLM_PROVIDER: 'groq',
    CANDIDATE_NAME: 'Test',
    CANDIDATE_EMAIL: 'test@test.com',
    REPOSITORY_URL: 'https://github.com/test',
    DEPLOYED_URL: 'http://localhost:3000',
  },
}));

import prisma from '../src/config/database';
import { registerUser, loginUser } from '../src/modules/auth/auth.service';
import { AppError } from '../src/middleware/errorHandler.middleware';

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerUser', () => {
    it('should register a new user and return token', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);
      (prisma.user.create as any).mockResolvedValue({
        id: 'user-1',
        email: 'alice@example.com',
        name: 'Alice',
        createdAt: new Date(),
      });

      const result = await registerUser({
        email: 'alice@example.com',
        password: 'SecurePass1',
        name: 'Alice',
      });

      expect(result.token).toBeDefined();
      expect(result.user.email).toBe('alice@example.com');
    });

    it('should throw CONFLICT if email already exists', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({ id: 'existing' });

      await expect(
        registerUser({ email: 'alice@example.com', password: 'SecurePass1' }),
      ).rejects.toMatchObject({ code: 'CONFLICT', statusCode: 409 });
    });
  });

  describe('loginUser', () => {
    it('should return token on valid credentials', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user-1',
        email: 'alice@example.com',
        name: 'Alice',
        passwordHash: 'hashed_password',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await loginUser({
        email: 'alice@example.com',
        password: 'SecurePass1',
      });

      expect(result.token).toBeDefined();
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('should throw UNAUTHORIZED if user not found', async () => {
      (prisma.user.findUnique as any).mockResolvedValue(null);

      await expect(
        loginUser({ email: 'notexist@example.com', password: 'SecurePass1' }),
      ).rejects.toMatchObject({ code: 'UNAUTHORIZED', statusCode: 401 });
    });
  });
});
