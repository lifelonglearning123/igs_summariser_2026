import React from 'react';
import { LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/logo';

interface DashboardHeaderProps {
  user: any;
  onLogout: () => void;
}

export default function DashboardHeader({ user, onLogout }: DashboardHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo className="w-10 h-10" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">IGS Summariser</h1>
            <p className="text-xs text-gray-500">Business Coach Transcript Analysis</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <User className="w-4 h-4" />
              {user?.email}
            </p>
          </div>
          <Button
            onClick={onLogout}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
