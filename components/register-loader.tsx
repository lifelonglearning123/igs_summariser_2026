'use client';

import React, { useCallback } from 'react';
import { Trash2, Upload, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  clearStoredRegister,
  describeRegister,
  storeRegister,
  type LoadedRegister,
} from '@/lib/register-storage';

interface RegisterLoaderProps {
  register: LoadedRegister | null;
  onChange: (register: LoadedRegister | null) => void;
  onError: (message: string) => void;
  title?: string;
}

export default function RegisterLoader({ register, onChange, onError, title }: RegisterLoaderProps) {
  const handleFile = useCallback(
    async (file: File) => {
      try {
        const loaded = describeRegister(JSON.parse(await file.text()), file.name);
        storeRegister(loaded);
        onChange(loaded);
      } catch (error) {
        onError(error instanceof Error ? error.message : 'That file could not be read as JSON.');
      }
    },
    [onChange, onError]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {title ?? 'Your client register'}
        </CardTitle>
        <CardDescription>
          A JSON file of the clients you look after. Kept in this browser only, never sent anywhere except to score a
          match.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {register ? (
          <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-3">
            <span className="text-sm font-medium text-green-800">
              {register.name} - {register.count} client{register.count === 1 ? '' : 's'}
            </span>
            <button
              onClick={() => {
                clearStoredRegister();
                onChange(null);
              }}
              className="inline-flex items-center gap-1 text-sm font-medium text-green-700 hover:text-green-900"
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </button>
          </div>
        ) : (
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-6 text-sm text-gray-600 hover:border-gray-400 hover:bg-gray-50">
            <Upload className="h-5 w-5" />
            Choose a register JSON file
            <input
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
                event.target.value = '';
              }}
            />
          </label>
        )}
        <p className="text-xs text-gray-500">
          There is a starter file at <code className="rounded bg-gray-100 px-1">samples/client-register.sample.json</code>{' '}
          to copy the shape from.
        </p>
      </CardContent>
    </Card>
  );
}
