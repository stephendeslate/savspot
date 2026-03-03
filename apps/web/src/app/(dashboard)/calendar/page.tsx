'use client';

import { Calendar as CalendarIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="week">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="day">
          <Card>
            <CardHeader>
              <CardTitle>Day View</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <CalendarIcon className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <h3 className="text-lg font-medium">Day view coming soon</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your daily schedule will be displayed here.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="week">
          <Card>
            <CardHeader>
              <CardTitle>Week View</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <CalendarIcon className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <h3 className="text-lg font-medium">Week view coming soon</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your weekly schedule will be displayed here.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="month">
          <Card>
            <CardHeader>
              <CardTitle>Month View</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <CalendarIcon className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <h3 className="text-lg font-medium">Month view coming soon</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your monthly schedule will be displayed here.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
