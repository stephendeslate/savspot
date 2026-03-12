'use client';

import { useCallback } from 'react';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  ShoppingBag,
  X,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { apiClient } from '@/lib/api-client';
import { useTenant } from '@/hooks/use-tenant';

// ---------- Types ----------

interface DemandInsight {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: string;
  data: Record<string, unknown>;
  createdAt: string;
}

interface Benchmark {
  metric: string;
  value: number;
  industryAverage: number;
  percentile: number;
}

interface UpsellRecommendation {
  id: string;
  clientId: string;
  clientName: string;
  recommendedService: string;
  confidence: number;
  reason: string;
}

interface AtRiskClient {
  clientId: string;
  clientName: string;
  riskScore: number;
  lastVisit: string;
  totalBookings: number;
  suggestedAction: string;
}

// ---------- Helpers ----------

function getPriorityColor(priority: string): string {
  switch (priority.toUpperCase()) {
    case 'HIGH':
      return 'bg-red-100 text-red-800';
    case 'MEDIUM':
      return 'bg-yellow-100 text-yellow-800';
    case 'LOW':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getRiskColor(score: number): string {
  if (score >= 0.7) return 'bg-red-100 text-red-800';
  if (score >= 0.4) return 'bg-yellow-100 text-yellow-800';
  return 'bg-green-100 text-green-800';
}

function getRiskLabel(score: number): string {
  if (score >= 0.7) return 'High';
  if (score >= 0.4) return 'Medium';
  return 'Low';
}

// ---------- Component ----------

export default function InsightsPage() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  // Independent data fetches for each section
  const {
    data: insights,
    isLoading: insightsLoading,
    error: insightsError,
  } = useQuery({
    queryKey: ['insights-demand', tenantId],
    queryFn: () =>
      apiClient.get<DemandInsight[]>(
        `/api/tenants/${tenantId}/ai/insights/demand`,
      ),
    enabled: !!tenantId,
  });

  const {
    data: benchmarks,
    isLoading: benchmarksLoading,
    error: benchmarksError,
  } = useQuery({
    queryKey: ['insights-benchmarks', tenantId],
    queryFn: () =>
      apiClient.get<Benchmark[]>(
        `/api/tenants/${tenantId}/ai/insights/benchmarks`,
      ),
    enabled: !!tenantId,
  });

  const {
    data: upsells,
    isLoading: upsellsLoading,
    error: upsellsError,
  } = useQuery({
    queryKey: ['insights-upsells', tenantId],
    queryFn: () =>
      apiClient.get<UpsellRecommendation[]>(
        `/api/tenants/${tenantId}/recommendations/upsell`,
      ),
    enabled: !!tenantId,
  });

  const {
    data: atRiskClients,
    isLoading: atRiskLoading,
    error: atRiskError,
  } = useQuery({
    queryKey: ['insights-at-risk', tenantId],
    queryFn: () =>
      apiClient.get<AtRiskClient[]>(
        `/api/tenants/${tenantId}/churn-risk/at-risk`,
      ),
    enabled: !!tenantId,
  });

  const dismissMutation = useMutation({
    mutationFn: (insightId: string) =>
      apiClient.post(
        `/api/tenants/${tenantId}/ai/insights/${insightId}/dismiss`,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['insights-demand', tenantId],
      });
    },
  });

  const handleDismiss = useCallback(
    (insightId: string) => {
      dismissMutation.mutate(insightId);
    },
    [dismissMutation],
  );

  const formatError = (err: Error | null): string | null => {
    if (!err) return null;
    return err instanceof Error ? err.message : 'Failed to load data';
  };

  // ---------- Section renderers ----------

  const renderSectionError = (err: Error | null, label: string) => {
    const message = formatError(err);
    if (!message) return null;
    return (
      <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
        Failed to load {label}: {message}
      </div>
    );
  };

  const renderInsightsSection = () => {
    if (insightsLoading) {
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="mt-2 h-3 w-full" />
                <Skeleton className="mt-1 h-3 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (insightsError) {
      return renderSectionError(insightsError, 'demand insights');
    }

    if (!insights || insights.length === 0) {
      return (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Lightbulb className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">No insights yet</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                AI-powered demand insights will appear here as your business
                collects more booking data.
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {insights.map((insight) => (
          <Card key={insight.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={getPriorityColor(insight.priority)}
                    >
                      {insight.priority}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {insight.type}
                    </Badge>
                  </div>
                  <h4 className="mt-2 font-medium">{insight.title}</h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {insight.description}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {format(new Date(insight.createdAt), 'MMM d, yyyy')}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDismiss(insight.id)}
                  disabled={dismissMutation.isPending}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderBenchmarksSection = () => {
    if (benchmarksLoading) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      );
    }

    if (benchmarksError) {
      return renderSectionError(benchmarksError, 'benchmarks');
    }

    if (!benchmarks || benchmarks.length === 0) {
      return (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <BarChart3 className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">No benchmarks available</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Industry benchmarks will be available once enough data has been
                collected.
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {benchmarks.map((benchmark) => (
          <Card key={benchmark.metric}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{benchmark.metric}</p>
                  <p className="text-sm text-muted-foreground">
                    Your value: {benchmark.value.toFixed(1)} | Industry avg:{' '}
                    {benchmark.industryAverage.toFixed(1)}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    benchmark.percentile >= 75
                      ? 'bg-green-100 text-green-800'
                      : benchmark.percentile >= 50
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                  }
                >
                  {benchmark.percentile}th percentile
                </Badge>
              </div>
              <div className="mt-3">
                <Progress value={benchmark.percentile} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderUpsellSection = () => {
    if (upsellsLoading) {
      return (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      );
    }

    if (upsellsError) {
      return renderSectionError(upsellsError, 'upsell recommendations');
    }

    if (!upsells || upsells.length === 0) {
      return (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ShoppingBag className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">No upsell opportunities</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Upsell recommendations will appear here based on client booking
                patterns.
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Recommended Service</TableHead>
                <TableHead className="hidden sm:table-cell">Confidence</TableHead>
                <TableHead className="hidden md:table-cell">Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upsells.map((rec) => (
                <TableRow key={rec.id}>
                  <TableCell className="font-medium">{rec.clientName}</TableCell>
                  <TableCell>{rec.recommendedService}</TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge
                      variant="outline"
                      className={
                        rec.confidence >= 0.8
                          ? 'bg-green-100 text-green-800'
                          : rec.confidence >= 0.5
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                      }
                    >
                      {Math.round(rec.confidence * 100)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden max-w-[200px] truncate md:table-cell">
                    {rec.reason}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  const renderAtRiskSection = () => {
    if (atRiskLoading) {
      return (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      );
    }

    if (atRiskError) {
      return renderSectionError(atRiskError, 'at-risk clients');
    }

    if (!atRiskClients || atRiskClients.length === 0) {
      return (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">No at-risk clients</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Clients with high churn risk will be flagged here so you can
                take action.
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Risk Score</TableHead>
                <TableHead className="hidden sm:table-cell">Last Visit</TableHead>
                <TableHead className="hidden md:table-cell">Total Bookings</TableHead>
                <TableHead className="hidden lg:table-cell">Suggested Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {atRiskClients.map((client) => (
                <TableRow key={client.clientId}>
                  <TableCell className="font-medium">{client.clientName}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getRiskColor(client.riskScore)}
                    >
                      {getRiskLabel(client.riskScore)} ({Math.round(client.riskScore * 100)}%)
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap sm:table-cell">
                    {format(new Date(client.lastVisit), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {client.totalBookings}
                  </TableCell>
                  <TableCell className="hidden max-w-[200px] truncate lg:table-cell">
                    {client.suggestedAction}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  // ---------- Render ----------

  return (
    <div className="min-w-0 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">Insights</h2>
        <p className="text-sm text-muted-foreground">
          AI-powered insights and recommendations for your business
        </p>
      </div>

      {/* Tab sections */}
      <Tabs defaultValue="demand">
        <TabsList>
          <TabsTrigger value="demand">
            <Lightbulb className="mr-2 h-4 w-4" />
            Demand Insights
          </TabsTrigger>
          <TabsTrigger value="benchmarks">
            <TrendingUp className="mr-2 h-4 w-4" />
            Benchmarks
          </TabsTrigger>
          <TabsTrigger value="upsell">
            <ShoppingBag className="mr-2 h-4 w-4" />
            Upsell
          </TabsTrigger>
          <TabsTrigger value="at-risk">
            <AlertTriangle className="mr-2 h-4 w-4" />
            At-Risk Clients
          </TabsTrigger>
        </TabsList>

        <TabsContent value="demand" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Demand Insights</CardTitle>
            </CardHeader>
            <CardContent>{renderInsightsSection()}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="benchmarks" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Industry Benchmarks</CardTitle>
            </CardHeader>
            <CardContent>{renderBenchmarksSection()}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upsell" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upsell Opportunities</CardTitle>
            </CardHeader>
            <CardContent>{renderUpsellSection()}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="at-risk" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">At-Risk Clients</CardTitle>
            </CardHeader>
            <CardContent>{renderAtRiskSection()}</CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
