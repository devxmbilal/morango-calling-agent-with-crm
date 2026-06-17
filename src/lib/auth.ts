import { supabase, isSupabaseConfigured } from './supabase';
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

// Helper to generate salt
export function generateSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper to hash password with SHA-256
export async function hashPassword(password: string, salt: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Read mock users from file
function readMockUsers(): User[] {
  try {
    if (!fs.existsSync(MOCK_USERS_FILE)) {
      // Initialize with empty list
      fs.writeFileSync(MOCK_USERS_FILE, JSON.stringify([]));
      return [];
    }
    const data = fs.readFileSync(MOCK_USERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading mock users:', err);
    return [];
  }
}

// Write mock users to file
function writeMockUsers(users: User[]) {
  try {
    fs.writeFileSync(MOCK_USERS_FILE, JSON.stringify(users, null, 2));
  } catch (err) {
    console.error('Error writing mock users:', err);
  }
}

// Authentication Service
export const authService = {
  // Hash & check user login
  async verifyUser(username: string, password: string): Promise<User | null> {
    await this.initializeDefaultUser();

    if (isSupabaseConfigured) {
      try {
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('username', username.trim().toLowerCase())
          .maybeSingle();

        if (error || !user) return null;

        const hashed = await hashPassword(password, user.salt);
        if (hashed === user.password_hash) {
          return user as User;
        }
        return null;
      } catch (err) {
        console.error('Supabase auth error, falling back to mock users:', err);
      }
    }

    // Fallback to local mock file
    const users = readMockUsers();
    const user = users.find(u => u.username === username.trim().toLowerCase());
    if (!user) return null;

    const hashed = await hashPassword(password, user.salt);
    if (hashed === user.password_hash) {
      return user;
    }
    return null;
  },

  // Lookup user by ID
  async getUserById(id: string): Promise<User | null> {
    if (isSupabaseConfigured) {
      try {
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (error || !user) return null;
        return user as User;
      } catch (err) {
        console.error('Supabase get user by id error:', err);
      }
    }

    const users = readMockUsers();
    return users.find(u => u.id === id) || null;
  },

  // Create new user (used in Settings)
  async createUser(username: string, password: string, name?: string): Promise<User> {
    const trimmedUsername = username.trim().toLowerCase();
    const salt = generateSalt();
    const password_hash = await hashPassword(password, salt);

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('users')
        .insert([{
          username: trimmedUsername,
          password_hash,
          salt,
          name: name || null
        }])
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as User;
    }

    // Fallback to mock file
    const users = readMockUsers();
    if (users.some(u => u.username === trimmedUsername)) {
      throw new Error('User already exists');
    }

    const newUser: User = {
      id: `user-${Math.random().toString(36).substr(2, 9)}`,
      username: trimmedUsername,
      name: name || undefined,
      password_hash,
      salt,
      created_at: new Date().toISOString()
    };

    users.push(newUser);
    writeMockUsers(users);
    return newUser;
  },

  // Update existing user (username, password, display name)
  async updateUser(id: string, updates: { username?: string; password?: string; name?: string }): Promise<User> {
    if (isSupabaseConfigured) {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name || null;
      if (updates.username !== undefined) dbUpdates.username = updates.username.trim().toLowerCase();
      if (updates.password !== undefined && updates.password.trim() !== '') {
        const salt = generateSalt();
        dbUpdates.salt = salt;
        dbUpdates.password_hash = await hashPassword(updates.password, salt);
      }

      const { data, error } = await supabase
        .from('users')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as User;
    }

    // Fallback to mock file
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
      const salt = generateSalt();
      user.salt = salt;
      user.password_hash = await hashPassword(updates.password, salt);
    }

    users[userIndex] = user;
    writeMockUsers(users);
    return user;
  },

  // Delete user by ID
  async deleteUser(id: string): Promise<boolean> {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);
      if (error) throw new Error(error.message);
      return true;
    }

    const users = readMockUsers();
    const filtered = users.filter(u => u.id !== id);
    if (users.length === filtered.length) {
      return false;
    }
    writeMockUsers(filtered);
    return true;
  },

  // List all users (excluding sensitive details like salt/hash)
  async listUsers(): Promise<Omit<User, 'password_hash' | 'salt'>[]> {
    await this.initializeDefaultUser();

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, name, created_at')
        .order('created_at', { ascending: true });

      if (!error && data) {
        return data;
      }
    }

    // Fallback to mock file
    const users = readMockUsers();
    return users.map(({ id, username, name, created_at }) => ({ id, username, name, created_at }));
  },

  // Auto-seed default user admin / admin123
  async initializeDefaultUser() {
    if (isSupabaseConfigured) {
      try {
        const { count, error } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true });

        if (error) return; // Table might not exist yet, schema must be run first

        if (count === 0) {
          console.log('Seeding default database admin user...');
          await this.createUser('admin', 'admin123', 'Administrator');
        }
      } catch (err) {
        console.error('Error auto-seeding db admin:', err);
      }
      return;
    }

    // Local file initialization
    const users = readMockUsers();
    if (users.length === 0) {
      console.log('Seeding default mock admin user...');
      const salt = generateSalt();
      const password_hash = await hashPassword('admin123', salt);
      const defaultAdmin: User = {
        id: 'user-admin',
        username: 'admin',
        name: 'Administrator',
        password_hash,
        salt,
        created_at: new Date().toISOString()
      };
      writeMockUsers([defaultAdmin]);
    }
  }
};
