'use client';

import { useState } from 'react';
import { Users, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function ClientsPage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Clients</h2>
        <p className="text-sm text-muted-foreground">
          View and manage your client list
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search clients..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Clients</CardTitle>
          <CardDescription>
            Clients will appear here once bookings start coming in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-lg font-medium">No clients yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Clients will appear here once bookings start coming in. When
              someone books a service, their information will be automatically
              added to your client list.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
