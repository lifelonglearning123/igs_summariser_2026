import { NextRequest, NextResponse } from 'next/server';
import { verifyEmailDomain } from '../utils/auth-db';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { detail: 'Email is required' },
        { status: 400 }
      );
    }

    const user = verifyEmailDomain(email);
    if (!user) {
      return NextResponse.json(
        { detail: 'Unable to sign in with those details' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user_id: user.id,
      email: user.email,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    );
  }
}
