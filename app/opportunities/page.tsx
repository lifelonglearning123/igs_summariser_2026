'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Mail, Search, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { matchOpportunity, readOpportunity } from '@/lib/api-client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import DashboardHeader from '@/components/dashboard-header';
import RegisterLoader from '@/components/register-loader';
import { loadStoredRegister, type LoadedRegister } from '@/lib/register-storage';
import OpportunityCardView from '@/components/opportunity-card-view';
import CallSheet from '@/components/call-sheet';
import { matchesToPlainText } from '@/lib/opportunity-prompts';
import type { CallSheet as CallSheetData, OpportunityParseResponse } from '@/lib/opportunity-types';

export default function OpportunitiesPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const logout = useAuthStore((state) => state.logout);

  const [email, setEmail] = useState('');
  const [parsed, setParsed] = useState<OpportunityParseResponse | null>(null);
  const [register, setRegister] = useState<LoadedRegister | null>(null);
  const [callSheet, setCallSheet] = useState<CallSheetData | null>(null);
  const [reading, setReading] = useState(false);
  const [matching, setMatching] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (hydrated && !user) router.push('/');
  }, [hydrated, user, router]);

  // Bring back the register this browser was last using, so a coach working
  // through a morning's inbox loads it once rather than once per email.
  useEffect(() => {
    setRegister(loadStoredRegister());
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleRead = async () => {
    if (email.trim().length < 40) {
      setError('Paste the funding email first.');
      return;
    }

    setReading(true);
    setError('');
    setParsed(null);
    setCallSheet(null);

    try {
      const result = (await readOpportunity({ email })) as OpportunityParseResponse;
      setParsed(result);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Could not read this email. Please try again.');
    } finally {
      setReading(false);
    }
  };

  const handleMatch = async () => {
    if (!parsed || !register) return;

    setMatching(true);
    setError('');

    try {
      const result = (await matchOpportunity({
        opportunity: parsed.opportunity,
        register: register.raw,
      })) as CallSheetData;
      setCallSheet(result);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Could not match clients to this opportunity. Please try again.');
    } finally {
      setMatching(false);
    }
  };

  const handleCopy = useCallback(async () => {
    if (!callSheet) return;
    const text = matchesToPlainText(callSheet.opportunity, callSheet.timing, callSheet.matches);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy to the clipboard. Please select the text and copy it manually.');
    }
  }, [callSheet]);

  const canMatch = useMemo(
    () => Boolean(parsed?.opportunity.actionable && register && !matching),
    [parsed, register, matching]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <DashboardHeader user={user} onLogout={handleLogout} />

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">Opportunity matcher</h1>
          <p className="text-gray-600">
            Paste a funding email. The app reads it, works out when you actually have to decide, and tells you which
            clients to contact and why.
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* Step 1: the email */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                1. The email
              </CardTitle>
              <CardDescription>Paste the whole thing, signature and all.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Paste the funding email here..."
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="min-h-48"
              />
              <Button onClick={handleRead} disabled={reading} className="gap-2">
                {reading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Reading...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Read this email
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {parsed && (
            <OpportunityCardView
              opportunity={parsed.opportunity}
              timing={parsed.timing}
              warnings={parsed.warnings}
            />
          )}

          {/* Step 2: the register */}
          <RegisterLoader
            register={register}
            onChange={(next) => {
              setRegister(next);
              setCallSheet(null);
            }}
            onError={setError}
            title="2. Your client register"
          />

          {/* Step 3: the match */}
          {parsed && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  3. Who to contact
                </CardTitle>
                <CardDescription>
                  {parsed.opportunity.actionable
                    ? 'Every client is scored on fit first, and only the shortlist goes to the AI.'
                    : 'This email is not a competition, so there is nothing to match clients against.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleMatch} disabled={!canMatch} className="gap-2">
                  {matching ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Matching clients...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4" />
                      Find clients to contact
                    </>
                  )}
                </Button>
                {!register && parsed.opportunity.actionable && (
                  <p className="mt-2 text-sm text-gray-500">Load a client register above first.</p>
                )}
              </CardContent>
            </Card>
          )}

          {callSheet && <CallSheet callSheet={callSheet} onCopy={handleCopy} copied={copied} />}
        </div>
      </main>
    </div>
  );
}
