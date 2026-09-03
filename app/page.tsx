'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { loginUser } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, ArrowUpRight, LogIn, Sparkles } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Logo from '@/components/logo';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setUser = useAuthStore((state) => state.setUser);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await loginUser(email);
      setUser({ email, id: response.user_id });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f1ea] p-3 text-[#171717] sm:p-5 lg:p-7">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1440px] overflow-hidden rounded-[2rem] bg-[#fdfcf9] shadow-[0_24px_80px_rgba(18,32,72,0.14)] lg:min-h-[calc(100vh-3.5rem)] lg:grid-cols-[1.08fr_0.92fr]">
        <section className="login-art relative isolate flex min-h-[430px] flex-col justify-between overflow-hidden bg-[#2457ff] p-7 text-white sm:p-10 lg:min-h-0 lg:p-14">
          <div className="absolute inset-0 -z-10 opacity-25" aria-hidden="true">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.34)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.34)_1px,transparent_1px)] bg-[size:56px_56px]" />
            <div className="absolute -right-24 top-24 h-72 w-[34rem] rotate-[-28deg] border-y-[44px] border-white/70" />
            <div className="absolute -bottom-20 -left-20 h-64 w-[34rem] rotate-[24deg] border-y-[30px] border-white/60" />
          </div>

          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white p-2 shadow-lg shadow-blue-950/20">
                <Logo className="h-8 w-8" />
              </div>
              <span className="font-sans text-sm font-semibold tracking-[0.16em] text-white/90">IGS / 01</span>
            </div>
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.28em] text-white/65 sm:block">Transcript intelligence</span>
          </div>

          <div className="relative z-10 max-w-2xl py-14 lg:py-0">
            <p className="mb-6 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.28em] text-white/70">
              <Sparkles className="h-3.5 w-3.5" /> Clear thinking, captured
            </p>
            <h1 className="font-display text-5xl leading-[0.94] tracking-[-0.03em] sm:text-7xl lg:text-[6.7rem]">
              Make sense
              <br />
              of the noise.
            </h1>
            <p className="mt-8 max-w-md text-base leading-7 text-white/78 sm:text-lg">
              Turn coaching conversations into focused action, decisions, and momentum.
            </p>
          </div>

          <div className="relative z-10 flex items-end justify-between border-t border-white/25 pt-5 font-mono text-[10px] uppercase tracking-[0.2em] text-white/65">
            <span>Business coach workspace</span>
            <ArrowUpRight className="h-5 w-5 text-white" />
          </div>
        </section>

        <section className="flex items-center px-7 py-12 sm:px-14 lg:px-20">
          <div className="mx-auto w-full max-w-md animate-rise">
            <div className="mb-12">
              <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.26em] text-[#2457ff]">Member access</p>
              <h2 className="font-display text-5xl leading-none tracking-[-0.03em] sm:text-6xl">Welcome in.</h2>
              <p className="mt-5 max-w-sm text-sm leading-6 text-[#6c6b68]">Enter your email to open your private summarising workspace.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-7">
              {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                <label htmlFor="email" className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-[#6c6b68]">
                  Work email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="h-14 rounded-none border-0 border-b border-[#c9c6bf] bg-transparent px-0 text-base shadow-none transition-colors placeholder:text-[#aaa7a0] focus-visible:border-[#2457ff] focus-visible:ring-0"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="group h-14 w-full justify-between rounded-full bg-[#171717] px-6 text-sm font-semibold text-white transition-all hover:bg-[#2457ff] hover:shadow-[0_10px_24px_rgba(36,87,255,0.22)]"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Opening workspace...
                  </span>
                ) : (
                  <>
                    <span className="flex items-center gap-2"><LogIn className="h-4 w-4" /> Enter workspace</span>
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </>
                )}
              </Button>
            </form>

          </div>
        </section>
      </div>
      <p className="mx-auto mt-4 max-w-[1440px] px-2 font-mono text-[9px] uppercase tracking-[0.2em] text-[#85827c]">© 2024 IGS Summariser / Built for better conversations</p>
    </main>
  );
}
