'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/logo';

interface DashboardHeaderProps {
  user: any;
  onLogout: () => void;
}

const NAV_LINKS = [
  { href: '/dashboard', label: 'Summariser' },
  { href: '/inbox', label: 'Inbox' },
  { href: '/opportunities', label: 'Single email' },
];

export default function DashboardHeader({ user, onLogout }: DashboardHeaderProps) {
  const pathname = usePathname();

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <Logo className="w-10 h-10" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">IGS Summariser</h1>
              <p className="text-xs text-gray-500">Business Coach Transcript Analysis</p>
            </div>
          </div>

          <nav className="hidden items-center gap-1 sm:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
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
