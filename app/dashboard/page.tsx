'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { processSummary } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, Sparkles, Upload } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DashboardHeader from '@/components/dashboard-header';
import SummaryResults from '@/components/summary-results';
import ParameterControls, { DEFAULT_PARAMETERS, GenerationParameters } from '@/components/parameter-controls';
import PromptEditor, { DEFAULT_PROMPTS, SummaryPrompts } from '@/components/prompt-editor';
import FileUploadZone from '@/components/file-upload-zone';
import { SERVICES, ServiceKey } from '@/lib/prompts';
import type { SummaryResponse } from '@/lib/summary-types';
import { parseSummaryMarkdown, summaryToHtml, summaryToPlainText, SummaryDocumentInput } from '@/lib/summary-format';
import { buildSummaryDocx, summaryFileName } from '@/lib/export-docx';

const PROMPTS_STORAGE_KEY = 'igs-summariser.prompts.v1';

function loadStoredPrompts(): SummaryPrompts | null {
  try {
    const raw = window.localStorage.getItem(PROMPTS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.mainPoints === 'string' && typeof parsed?.recommendations === 'string') {
      return parsed;
    }
  } catch {
    // Ignore corrupt or unavailable storage.
  }
  return null;
}

export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<SummaryResponse | null>(null);
  const [selectedServices, setSelectedServices] = useState<ServiceKey[]>([]);
  const [parameters, setParameters] = useState<GenerationParameters>(DEFAULT_PARAMETERS);
  const [prompts, setPrompts] = useState<SummaryPrompts>(DEFAULT_PROMPTS);
  const [promptsLoaded, setPromptsLoaded] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user, router]);

  // Restore any prompt edits saved in this browser.
  useEffect(() => {
    const stored = loadStoredPrompts();
    if (stored) setPrompts(stored);
    setPromptsLoaded(true);
  }, []);

  useEffect(() => {
    if (!promptsLoaded) return;
    try {
      const isDefault =
        prompts.mainPoints === DEFAULT_PROMPTS.mainPoints && prompts.recommendations === DEFAULT_PROMPTS.recommendations;
      if (isDefault) {
        window.localStorage.removeItem(PROMPTS_STORAGE_KEY);
      } else {
        window.localStorage.setItem(PROMPTS_STORAGE_KEY, JSON.stringify(prompts));
      }
    } catch {
      // Storage unavailable; edits simply won't persist.
    }
  }, [prompts, promptsLoaded]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setError('');
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleProcess = async () => {
    if (!selectedFile && !transcript.trim()) {
      setError('Please upload a file or paste transcript content');
      return;
    }

    setLoading(true);
    setError('');
    setCopied(false);

    try {
      const formData = new FormData();
      if (selectedFile) {
        formData.append('file', selectedFile);
      } else {
        formData.append('transcript', transcript);
      }
      formData.append('temperature', String(parameters.temperature));
      formData.append('top_p', String(parameters.topP));
      formData.append('frequency_penalty', String(parameters.frequencyPenalty));
      formData.append('presence_penalty', String(parameters.presencePenalty));
      formData.append('main_points_prompt', prompts.mainPoints);
      formData.append('recommendations_prompt', prompts.recommendations);

      const data: SummaryResponse = await processSummary(formData);
      setResults(data);
      setSelectedServices(SERVICES.filter((service) => data.services?.[service.key]?.covered).map((service) => service.key));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to process summary. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleServiceToggle = (service: ServiceKey) => {
    setSelectedServices((current) =>
      current.includes(service) ? current.filter((item) => item !== service) : [...current, service]
    );
  };

  const documentInput = useMemo<SummaryDocumentInput | null>(() => {
    if (!results) return null;
    return {
      generatedAt: new Date(),
      mainPoints: parseSummaryMarkdown(results.main_points),
      recommendations: parseSummaryMarkdown(results.recommendations),
      services: SERVICES.map((service) => ({ label: service.label, selected: selectedServices.includes(service.key) })),
    };
  }, [results, selectedServices]);

  const handleCopy = useCallback(async () => {
    if (!documentInput) return;
    const text = summaryToPlainText(documentInput);
    const html = summaryToHtml(documentInput);

    // Rich copy (keeps headings and bullets when pasted into Word or email),
    // then plain text, then the legacy execCommand path for older browsers.
    const attempts: Array<() => Promise<void>> = [
      async () => {
        if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) throw new Error('unsupported');
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': new Blob([text], { type: 'text/plain' }),
            'text/html': new Blob([html], { type: 'text/html' }),
          }),
        ]);
      },
      async () => {
        if (!navigator.clipboard?.writeText) throw new Error('unsupported');
        await navigator.clipboard.writeText(text);
      },
      async () => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand('copy');
        textarea.remove();
        if (!ok) throw new Error('execCommand failed');
      },
    ];

    for (const attempt of attempts) {
      try {
        await attempt();
        setError('');
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2500);
        return;
      } catch {
        // Try the next method.
      }
    }
    setError('Could not copy to the clipboard. Please select the text and copy it manually.');
  }, [documentInput]);

  const handleDownload = useCallback(async () => {
    if (!documentInput) return;
    setExporting(true);
    try {
      const blob = await buildSummaryDocx(documentInput);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = summaryFileName(new Date());
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('Word export failed:', err);
      setError('Could not create the Word document. Please try again.');
    } finally {
      setExporting(false);
    }
  }, [documentInput]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <DashboardHeader user={user} onLogout={handleLogout} />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">Welcome back, {user?.email}</h1>
          <p className="text-gray-600">Turn a coaching transcript into a meeting summary, recommendations and actions.</p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Input and results */}
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload or Paste Transcript
                </CardTitle>
                <CardDescription>Supported formats: .txt, .docx. Or paste transcript text below.</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="upload" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="upload">Upload File</TabsTrigger>
                    <TabsTrigger value="paste">Paste Text</TabsTrigger>
                  </TabsList>

                  <TabsContent value="upload" className="space-y-4">
                    <FileUploadZone onFileSelect={handleFileSelect} onFileError={setError} />
                    {selectedFile && (
                      <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-3">
                        <span className="text-sm font-medium text-green-700">{selectedFile.name}</span>
                        <button onClick={() => setSelectedFile(null)} className="font-medium text-green-600 hover:text-green-700">
                          Change
                        </button>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="paste" className="space-y-4">
                    <Textarea
                      placeholder="Paste your transcript here..."
                      value={transcript}
                      onChange={(event) => setTranscript(event.target.value)}
                      className="min-h-64"
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {results && (
              <SummaryResults
                results={results}
                selectedServices={selectedServices}
                onServiceToggle={handleServiceToggle}
                onCopy={handleCopy}
                onDownload={handleDownload}
                copied={copied}
                exporting={exporting}
              />
            )}
          </div>

          {/* Controls */}
          <div className="space-y-6">
            <Button
              onClick={handleProcess}
              disabled={loading}
              size="lg"
              className="h-12 w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-base hover:from-blue-700 hover:to-indigo-700"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Generating summary...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Generate Summary
                </span>
              )}
            </Button>
            {loading && <p className="-mt-3 text-center text-xs text-gray-500">This usually takes 20 to 40 seconds.</p>}

            <PromptEditor prompts={prompts} onChange={setPrompts} disabled={loading} />

            <ParameterControls values={parameters} onChange={setParameters} disabled={loading} />
          </div>
        </div>
      </main>
    </div>
  );
}
