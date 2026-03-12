import { Card, CardContent, CardHeader, Skeleton } from '@savspot/ui';

export default function ServicesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-6 w-28" />
          <Skeleton className="mt-2 h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-28" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
