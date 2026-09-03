import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Copy, Download, FileText, Lightbulb, ListChecks, Sparkles } from 'lucide-react';
import SummaryBlocks from '@/components/summary-blocks';
import { parseSummaryMarkdown } from '@/lib/summary-format';
import { SERVICES, ServiceKey } from '@/lib/prompts';
import type { SummaryResponse } from '@/lib/summary-types';

interface SummaryResultsProps {
  results: SummaryResponse;
  selectedServices: ServiceKey[];
  onServiceToggle: (service: ServiceKey) => void;
  onCopy: () => void;
  onDownload: () => void;
  copied: boolean;
  exporting: boolean;
}

export default function SummaryResults({
  results,
  selectedServices,
  onServiceToggle,
  onCopy,
  onDownload,
  copied,
  exporting,
}: SummaryResultsProps) {
  const mainPoints = useMemo(() => parseSummaryMarkdown(results.main_points), [results.main_points]);
  const recommendations = useMemo(() => parseSummaryMarkdown(results.recommendations), [results.recommendations]);

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
              ? 'The AI has pre-selected the services this meeting covered. Adjust the selection if needed before copying or downloading.'
              : 'Select the service or services this meeting covered.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            {SERVICES.map((service) => {
              const isSelected = selectedServices.includes(service.key);
              const assessment = results.services?.[service.key];
              return (
                <label
                  key={service.key}
                  className={`flex cursor-pointer flex-col gap-2 rounded-lg border p-3 text-sm transition-colors ${
                    isSelected
                      ? 'border-indigo-400 bg-indigo-50 text-indigo-950'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-200 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onServiceToggle(service.key)}
                      className="mt-0.5 h-4 w-4 flex-shrink-0 accent-indigo-600"
                    />
                    <span className="font-medium leading-5">{service.label}</span>
                  </span>
                  {assessment && (
                    <span className="flex items-start gap-1.5 pl-7 text-xs leading-5 text-gray-600">
                      <Sparkles className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 ${assessment.covered ? 'text-indigo-500' : 'text-gray-400'}`} />
                      <span>
                        <span className="font-medium text-gray-700">{assessment.covered ? 'Suggested: yes.' : 'Suggested: no.'}</span>{' '}
                        {assessment.reason}
                      </span>
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>

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
