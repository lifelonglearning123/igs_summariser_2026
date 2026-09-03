/**
 * Simple in-memory user database
 * In production, use a real database (PostgreSQL, etc.)
 */

interface User {
  id: string;
  email: string;
}

const ALLOWED_EMAIL_PATTERN = /^[^@\s]+@exemplas\.com$/i;

/**
 * Find user by email
 */
export function findUser(email: string): User | undefined {
  const normalizedEmail = email.trim().toLowerCase();
  if (!ALLOWED_EMAIL_PATTERN.test(normalizedEmail)) {
    return undefined;
  }

  return {
    id: `user_${normalizedEmail}`,
    email: normalizedEmail,
  };
}

/**
 * Verify that the email belongs to the approved domain.
 */
export function verifyEmailDomain(email: string): User | null {
  return findUser(email) || null;
}

/**
 * Add new user (for future registration feature)
 */
export function addUser(email: string): User {
  const user: User = {
    id: `user_${Date.now()}`,
    email: email.toLowerCase(),
  };
  return user;
}
