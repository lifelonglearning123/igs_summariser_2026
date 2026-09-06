import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  Check,
  ClipboardCheck,
  Copy,
  Download,
  FileText,
  Lightbulb,
  ListChecks,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import SummaryBlocks from '@/components/summary-blocks';
import { formatGeneratedAt, parseSummaryMarkdown } from '@/lib/summary-format';
import { SERVICES, SERVICE_SHORT_LABELS, ServiceKey } from '@/lib/prompts';
import type { ServiceWriteUps, SummaryResponse } from '@/lib/summary-types';

interface SummaryResultsProps {
  results: SummaryResponse;
  selectedServices: ServiceKey[];
  onServiceToggle: (service: ServiceKey) => void;
  writeUps: ServiceWriteUps;
  onGenerateWriteUp: (service: ServiceKey) => void;
  onCopyWriteUp: (service: ServiceKey) => void;
  copiedWriteUp: ServiceKey | null;
  onCopy: () => void;
  onDownload: () => void;
  copied: boolean;
  exporting: boolean;
}

export default function SummaryResults({
  results,
  selectedServices,
  onServiceToggle,
  writeUps,
  onGenerateWriteUp,
  onCopyWriteUp,
  copiedWriteUp,
  onCopy,
  onDownload,
  copied,
  exporting,
}: SummaryResultsProps) {
  const mainPoints = useMemo(() => parseSummaryMarkdown(results.main_points), [results.main_points]);
  const recommendations = useMemo(() => parseSummaryMarkdown(results.recommendations), [results.recommendations]);

  // Keep the write-up panels in the same order as the service checkboxes.
  const writeUpPanels = SERVICES.filter((service) => writeUps[service.key]);

  return (
    <div className="space-y-6">
      {results.warnings?.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {results.warnings.map((warning, index) => (
            <p key={index}>{warning}</p>
          ))}
        </div>
      )}

      {/* Main Discussion Points */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Main Discussion Points
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SummaryBlocks blocks={mainPoints} />
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-600" />
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SummaryBlocks blocks={recommendations} />
        </CardContent>
      </Card>

      {/* Services covered */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-indigo-600" />
            Services covered
          </CardTitle>
          <CardDescription>
            {results.services
              ? 'The AI has pre-selected the services this meeting covered. Adjust the selection if needed, then write up any service you need to record in Salesforce.'
              : 'Select the service or services this meeting covered, then write up any service you need to record in Salesforce.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            {SERVICES.map((service) => {
              const isSelected = selectedServices.includes(service.key);
              const assessment = results.services?.[service.key];
              const writeUp = writeUps[service.key];
              const isGenerating = writeUp?.status === 'loading';

              return (
                <div
                  key={service.key}
                  className={`flex h-full flex-col gap-2 rounded-lg border p-3 text-sm transition-colors ${
                    isSelected ? 'border-indigo-400 bg-indigo-50 text-indigo-950' : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onServiceToggle(service.key)}
                      className="mt-0.5 h-4 w-4 flex-shrink-0 accent-indigo-600"
                    />
                    <span className="font-medium leading-5">{service.label}</span>
                  </label>

                  {assessment && (
                    <span className="flex items-start gap-1.5 pl-7 text-xs leading-5 text-gray-600">
                      <Sparkles
                        className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 ${
                          assessment.covered ? 'text-indigo-500' : 'text-gray-400'
                        }`}
                      />
                      <span>
                        <span className="font-medium text-gray-700">
                          {assessment.covered ? 'Suggested: yes.' : 'Suggested: no.'}
                        </span>{' '}
                        {assessment.reason}
                      </span>
                    </span>
                  )}

                  <div className="mt-auto pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onGenerateWriteUp(service.key)}
                      disabled={isGenerating}
                      className="w-full gap-1.5 text-xs"
                    >
                      {isGenerating ? (
                        <>
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                          Writing up...
                        </>
                      ) : writeUp?.status === 'ready' ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5" />
                          Regenerate write-up
                        </>
                      ) : (
                        <>
                          <ClipboardCheck className="h-3.5 w-3.5" />
                          Write up for Salesforce
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Salesforce write-ups */}
      {writeUpPanels.map((service) => {
        const writeUp = writeUps[service.key]!;
        return (
          <Card key={service.key}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-emerald-600" />
                {SERVICE_SHORT_LABELS[service.key]} write-up
              </CardTitle>
              <CardDescription>
                {writeUp.status === 'ready'
                  ? `Ready to paste into Salesforce. Generated ${formatGeneratedAt(
                      writeUp.generatedAt
                    )} — check it before saving.`
                  : writeUp.status === 'loading'
                    ? 'Reading the transcript again for the detail this service needs...'
                    : 'The write-up could not be generated.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {writeUp.status === 'loading' && (
                <div className="space-y-2" aria-live="polite">
                  <div className="h-3 w-3/4 animate-pulse rounded bg-gray-200" />
                  <div className="h-3 w-full animate-pulse rounded bg-gray-200" />
                  <div className="h-3 w-5/6 animate-pulse rounded bg-gray-200" />
                </div>
              )}

              {writeUp.status === 'error' && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{writeUp.message}</span>
                </div>
              )}

              {writeUp.status === 'ready' && (
                <>
                  {writeUp.warnings.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      {writeUp.warnings.map((warning, index) => (
                        <p key={index}>{warning}</p>
                      ))}
                    </div>
                  )}
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <SummaryBlocks blocks={parseSummaryMarkdown(writeUp.text)} />
                  </div>
                </>
              )}

              {writeUp.status !== 'loading' && (
                <div className="flex flex-col gap-3 sm:flex-row">
                  {writeUp.status === 'ready' && (
                    <Button variant="outline" onClick={() => onCopyWriteUp(service.key)} className="flex-1 gap-2">
                      {copiedWriteUp === service.key ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      {copiedWriteUp === service.key ? 'Copied to clipboard' : 'Copy write-up'}
                    </Button>
                  )}
                  <Button variant="ghost" onClick={() => onGenerateWriteUp(service.key)} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    {writeUp.status === 'error' ? 'Try again' : 'Regenerate'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button variant="outline" onClick={onCopy} className="flex-1 gap-2">
          {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copied to clipboard' : 'Copy summary'}
        </Button>
        <Button onClick={onDownload} disabled={exporting} className="flex-1 gap-2 bg-green-600 hover:bg-green-700 focus:ring-green-500">
          <Download className="h-4 w-4" />
          {exporting ? 'Preparing document...' : 'Download as Word document'}
        </Button>
      </div>
    </div>
  );
}
