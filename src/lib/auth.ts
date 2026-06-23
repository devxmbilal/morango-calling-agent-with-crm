import bcrypt from 'bcryptjs';
import prisma from './prisma';
import { isServerDbConfigured } from './db-server';
import { allowDefaultAdminSeed, getDefaultAdminPassword } from './env';
import fs from 'fs';
import path from 'path';

export interface User {
  id: string;
  username: string;
  name?: string;
  password_hash: string;
  salt: string;
  created_at: string;
}

const MOCK_USERS_FILE = path.join(process.cwd(), 'src/lib/mock_users.json');
const BCRYPT_ROUNDS = 12;

function isBcryptHash(hash: string): boolean {
  return hash.startsWith('$2');
}

async function legacyHashPassword(password: string, salt: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generateSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

async function verifyPassword(password: string, user: User): Promise<boolean> {
  if (isBcryptHash(user.password_hash)) {
    return bcrypt.compare(password, user.password_hash);
  }
  const hashed = await legacyHashPassword(password, user.salt);
  return hashed === user.password_hash;
}

async function upgradeLegacyPassword(userId: string, password: string): Promise<void> {
  const password_hash = await hashPassword(password);
  if (isServerDbConfigured) {
    await prisma.user.update({
      where: { id: userId },
      data: { password_hash, salt: 'bcrypt' },
    });
    return;
  }

  const users = readMockUsers();
  const index = users.findIndex(u => u.id === userId);
  if (index !== -1) {
    users[index].password_hash = password_hash;
    users[index].salt = 'bcrypt';
    writeMockUsers(users);
  }
}

function readMockUsers(): User[] {
  try {
    if (!fs.existsSync(MOCK_USERS_FILE)) {
      fs.writeFileSync(MOCK_USERS_FILE, JSON.stringify([]));
      return [];
    }
    return JSON.parse(fs.readFileSync(MOCK_USERS_FILE, 'utf-8'));
  } catch (err) {
    console.error('Error reading mock users:', err);
    return [];
  }
}

function writeMockUsers(users: User[]) {
  try {
    fs.writeFileSync(MOCK_USERS_FILE, JSON.stringify(users, null, 2));
  } catch (err) {
    console.error('Error writing mock users:', err);
  }
}

export const authService = {
  async verifyUser(username: string, password: string): Promise<User | null> {
    await this.initializeDefaultUser();

    if (isServerDbConfigured) {
      try {
        const user = await prisma.user.findUnique({
          where: { username: username.trim().toLowerCase() },
        });

        if (!user) return null;

        const valid = await verifyPassword(password, user as any as User);
        if (!valid) return null;

        if (!isBcryptHash(user.password_hash)) {
          await upgradeLegacyPassword(user.id, password);
        }

        return {
          ...user,
          created_at: user.created_at.toISOString(),
        } as any as User;
      } catch (err) {
        console.error('Prisma auth error, falling back to mock users:', err);
      }
    }

    const users = readMockUsers();
    const user = users.find(u => u.username === username.trim().toLowerCase());
    if (!user) return null;

    const valid = await verifyPassword(password, user);
    if (!valid) return null;

    if (!isBcryptHash(user.password_hash)) {
      await upgradeLegacyPassword(user.id, password);
    }

    return user;
  },

  async getUserById(id: string): Promise<User | null> {
    if (isServerDbConfigured) {
      try {
        const user = await prisma.user.findUnique({
          where: { id },
        });
        if (!user) return null;
        return {
          ...user,
          created_at: user.created_at.toISOString(),
        } as any as User;
      } catch (err) {
        console.error('Prisma get user by id error:', err);
      }
    }

    return readMockUsers().find(u => u.id === id) || null;
  },

  async createUser(username: string, password: string, name?: string): Promise<User> {
    const trimmedUsername = username.trim().toLowerCase();
    const password_hash = await hashPassword(password);

    if (isServerDbConfigured) {
      const data = await prisma.user.create({
        data: {
          username: trimmedUsername,
          password_hash,
          salt: 'bcrypt',
          name: name || null,
        },
      });
      return {
        ...data,
        created_at: data.created_at.toISOString(),
      } as any as User;
    }

    const users = readMockUsers();
    if (users.some(u => u.username === trimmedUsername)) {
      throw new Error('User already exists');
    }

    const newUser: User = {
      id: `user-${Math.random().toString(36).substr(2, 9)}`,
      username: trimmedUsername,
      name: name || undefined,
      password_hash,
      salt: 'bcrypt',
      created_at: new Date().toISOString(),
    };

    users.push(newUser);
    writeMockUsers(users);
    return newUser;
  },

  async updateUser(
    id: string,
    updates: { username?: string; password?: string; name?: string }
  ): Promise<User> {
    if (isServerDbConfigured) {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name || null;
      if (updates.username !== undefined) dbUpdates.username = updates.username.trim().toLowerCase();
      if (updates.password !== undefined && updates.password.trim() !== '') {
        dbUpdates.password_hash = await hashPassword(updates.password);
        dbUpdates.salt = 'bcrypt';
      }

      const data = await prisma.user.update({
        where: { id },
        data: dbUpdates,
      });

      return {
        ...data,
        created_at: data.created_at.toISOString(),
      } as any as User;
    }

    const users = readMockUsers();
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex === -1) throw new Error('User not found');

    const user = users[userIndex];
    if (updates.name !== undefined) user.name = updates.name;
    if (updates.username !== undefined) {
      const newUsername = updates.username.trim().toLowerCase();
      if (newUsername !== user.username && users.some(u => u.username === newUsername)) {
        throw new Error('Username already exists');
      }
      user.username = newUsername;
    }
    if (updates.password !== undefined && updates.password.trim() !== '') {
      user.password_hash = await hashPassword(updates.password);
      user.salt = 'bcrypt';
    }

    users[userIndex] = user;
    writeMockUsers(users);
    return user;
  },

  async deleteUser(id: string): Promise<boolean> {
    if (isServerDbConfigured) {
      await prisma.user.delete({
        where: { id },
      });
      return true;
    }

    const users = readMockUsers();
    const filtered = users.filter(u => u.id !== id);
    if (users.length === filtered.length) return false;
    writeMockUsers(filtered);
    return true;
  },

  async listUsers(): Promise<Omit<User, 'password_hash' | 'salt'>[]> {
    await this.initializeDefaultUser();

    if (isServerDbConfigured) {
      const data = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          name: true,
          created_at: true,
        },
        orderBy: {
          created_at: 'asc',
        },
      });
      return data.map((u) => ({
        id: u.id,
        username: u.username,
        name: u.name || undefined,
        created_at: u.created_at.toISOString(),
      }));
    }

    return readMockUsers().map(({ id, username, name, created_at }) => ({
      id,
      username,
      name,
      created_at,
    }));
  },

  async initializeDefaultUser() {
    if (!allowDefaultAdminSeed()) return;

    const defaultPassword = getDefaultAdminPassword();
    if (!defaultPassword) return;

    if (isServerDbConfigured) {
      try {
        const count = await prisma.user.count();
        if (count !== 0) return;

        console.log('Seeding default database admin user...');
        await this.createUser('admin', defaultPassword, 'Administrator');
      } catch (err) {
        console.error('Error auto-seeding db admin:', err);
      }
      return;
    }

    const users = readMockUsers();
    if (users.length === 0) {
      console.log('Seeding default mock admin user...');
      const password_hash = await hashPassword(defaultPassword);
      writeMockUsers([{
        id: 'user-admin',
        username: 'admin',
        name: 'Administrator',
        password_hash,
        salt: 'bcrypt',
        created_at: new Date().toISOString(),
      }]);
    }
  },
};
