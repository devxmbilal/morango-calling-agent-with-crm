export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim() === '') {
    throw new Error('JWT_SECRET environment variable is missing.');
  }
  return secret;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function allowDefaultAdminSeed(): boolean {
  if (!isProduction()) return true;
  return process.env.ALLOW_DEFAULT_ADMIN === 'true';
}

export function getDefaultAdminPassword(): string | null {
  if (process.env.DEFAULT_ADMIN_PASSWORD) {
    return process.env.DEFAULT_ADMIN_PASSWORD;
  }
  if (!isProduction()) {
    return 'admin123';
  }
  return null;
}
