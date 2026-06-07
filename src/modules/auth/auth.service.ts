// src/modules/auth/auth.service.ts
import bcrypt from 'bcryptjs';
import prisma from '../../config/database';
import { signToken } from '../../utils/jwt';
import { AppError } from '../../middleware/errorHandler.middleware';
import { RegisterInput, LoginInput } from './auth.schema';

export async function registerUser(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError('CONFLICT', 'A user with this email already exists', 409);
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash,
    },
    select: { id: true, email: true, name: true, createdAt: true },
  });

  const token = signToken({ userId: user.id, email: user.email });
  return { user, token };
}

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw new AppError('UNAUTHORIZED', 'Invalid email or password', 401);
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw new AppError('UNAUTHORIZED', 'Invalid email or password', 401);
  }

  const token = signToken({ userId: user.id, email: user.email });
  const { passwordHash: _, ...safeUser } = user;
  return { user: safeUser, token };
}
