import crypto from 'crypto';

import connectDB from '@/lib/mongodb';
import AdminUser from '@/models/AdminUser';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('base64');
  const hash = crypto.scryptSync(password, salt, 64).toString('base64');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password: string, passwordHash: string): boolean {
  const [algorithm, salt, hash] = passwordHash.split('$');
  if (algorithm !== 'scrypt' || !salt || !hash) {
    return false;
  }

  const expected = Buffer.from(hash, 'base64');
  const derived = crypto.scryptSync(password, salt, expected.length);

  if (expected.length !== derived.length) {
    return false;
  }

  return crypto.timingSafeEqual(expected, derived);
}

export async function ensureDefaultAdminUser(): Promise<void> {
  const defaultEmail = process.env.ADMIN_DEFAULT_EMAIL;
  const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD;

  if (!defaultEmail || !defaultPassword) {
    throw new Error(
      'Faltan ADMIN_DEFAULT_EMAIL y ADMIN_DEFAULT_PASSWORD para inicializar el usuario administrador'
    );
  }

  await connectDB();

  const email = normalizeEmail(defaultEmail);
  const existing = await AdminUser.findOne({ email }).select('_id').lean();

  if (!existing) {
    await AdminUser.create({
      email,
      passwordHash: hashPassword(defaultPassword),
    });
  }
}

export async function validateAdminCredentials(email: string, password: string): Promise<boolean> {
  await connectDB();

  const admin = await AdminUser.findOne({ email: normalizeEmail(email) })
    .select('passwordHash')
    .exec();

  if (!admin) {
    return false;
  }

  return verifyPassword(password, admin.passwordHash);
}
