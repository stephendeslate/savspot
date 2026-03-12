'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, RefreshCw, Send } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, TabsContent, TabsList, TabsTrigger, Textarea } from '@savspot/ui';
import { apiClient } from '@/lib/api-client';
import { ROUTES } from '@/lib/constants';
import { useTenant } from '@/hooks/use-tenant';

// ---------- Types ----------

interface Template {
  id: string;
  name: string;
  channel: 'EMAIL' | 'SMS' | 'PUSH';
  subject: string | null;
  body: string;
  active: boolean;
  createdAt: string;
}

interface DeliveryLog {
  id: string;
  channel: 'EMAIL' | 'SMS' | 'PUSH';
  recipientEmail: string | null;
  recipientPhone: string | null;
  subject: string | null;
  status: 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED';
  errorMessage: string | null;
  sentAt: string;
}

interface ComposeForm {
  channel: 'EMAIL' | 'SMS' | 'PUSH';
  recipientId: string;
  templateId: string;
  subject: string;
  body: string;
}

// ---------- Helpers ----------

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getChannelBadge(channel: 'EMAIL' | 'SMS' | 'PUSH') {
  switch (channel) {
    case 'EMAIL':
      return <Badge className="bg-blue-100 text-blue-800">Email</Badge>;
    case 'SMS':
      return <Badge className="bg-green-100 text-green-800">SMS</Badge>;
    case 'PUSH':
      return <Badge className="bg-purple-100 text-purple-800">Push</Badge>;
  }
}

function getStatusBadge(status: 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED') {
  switch (status) {
    case 'SENT':
      return <Badge className="bg-blue-100 text-blue-800">Sent</Badge>;
    case 'DELIVERED':
      return <Badge className="bg-green-100 text-green-800">Delivered</Badge>;
    case 'FAILED':
      return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
    case 'BOUNCED':
      return <Badge className="bg-yellow-100 text-yellow-800">Bounced</Badge>;
  }
}

const EMPTY_FORM: ComposeForm = {
  channel: 'EMAIL',
  recipientId: '',
  templateId: '',
  subject: '',
  body: '',
};

// ---------- Component ----------

export default function CommunicationsSettingsPage() {
  const router = useRouter();
  const { tenantId } = useTenant();

  const [templates, setTemplates] = useState<Template[]>([]);
  const [deliveryLogs, setDeliveryLogs] = useState<DeliveryLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Compose state
  const [composeForm, setComposeForm] = useState<ComposeForm>(EMPTY_FORM);
  const [isSending, setIsSending] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);

  // Delivery log refresh
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTemplates = useCallback(async () => {
    if (!tenantId) return;

    try {
      const data = await apiClient.get<Template[]>(
        `/api/tenants/${tenantId}/communications/templates`,
      );
      if (Array.isArray(data)) {
        setTemplates(data);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load templates',
      );
    }
  }, [tenantId]);

  const fetchDeliveryLogs = useCallback(async () => {
    if (!tenantId) return;

    try {
      const data = await apiClient.get<DeliveryLog[]>(
        `/api/tenants/${tenantId}/communications/log`,
      );
      if (Array.isArray(data)) {
        setDeliveryLogs(data);
      }
    } catch {
      // Silently fail on log refresh
    }
  }, [tenantId]);

  const fetchData = useCallback(async () => {
    if (!tenantId) return;

    try {
      await Promise.all([fetchTemplates(), fetchDeliveryLogs()]);
    } catch {
      // Individual fetchers handle their own errors
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, fetchTemplates, fetchDeliveryLogs]);

  useEffect(() => {
    if (!tenantId) {
      setIsLoading(false);
      return;
    }
    void fetchData();
  }, [tenantId, fetchData]);

  // Auto-refresh delivery logs every 30 seconds
  useEffect(() => {
    if (!tenantId) return;

    refreshIntervalRef.current = setInterval(() => {
      void fetchDeliveryLogs();
    }, 30000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [tenantId, fetchDeliveryLogs]);

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setComposeForm((prev) => ({
        ...prev,
        templateId,
        channel: template.channel,
        subject: template.subject ?? '',
        body: template.body,
      }));
    } else {
      setComposeForm((prev) => ({ ...prev, templateId }));
    }
  };

  const handleSend = async () => {
    if (!tenantId) return;

    setComposeError(null);

    if (!composeForm.recipientId.trim()) {
      setComposeError('Recipient is required');
      return;
    }
    if (!composeForm.body.trim()) {
      setComposeError('Message body is required');
      return;
    }

    setIsSending(true);
    try {
      await apiClient.post(
        `/api/tenants/${tenantId}/communications/compose`,
        {
          channel: composeForm.channel,
          recipientId: composeForm.recipientId.trim(),
          templateId: composeForm.templateId || undefined,
          subject: composeForm.subject.trim() || undefined,
          body: composeForm.body.trim(),
        },
      );
      setSuccess('Message sent successfully.');
      setComposeForm(EMPTY_FORM);
      setTimeout(() => setSuccess(null), 4000);
      void fetchDeliveryLogs();
    } catch (err) {
      setComposeError(
        err instanceof Error ? err.message : 'Failed to send message',
      );
    } finally {
      setIsSending(false);
    }
  };

  // ---------- Loading ----------

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <h3 className="text-lg font-medium">No business found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Please complete onboarding to set up your business.
        </p>
      </div>
    );
  }

  // ---------- Render ----------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(ROUTES.SETTINGS)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold">Communications</h2>
          <p className="text-sm text-muted-foreground">
            Manage templates, compose messages, and view delivery history
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="log">Delivery Log</TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Message Templates</CardTitle>
              <CardDescription>
                {templates.length === 0
                  ? 'No templates configured yet.'
                  : `${templates.length} template${templates.length !== 1 ? 's' : ''} available`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {templates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm text-muted-foreground">
                    No communication templates have been set up yet.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">
                          {template.name}
                        </TableCell>
                        <TableCell>
                          {getChannelBadge(template.channel)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {template.subject ?? '-'}
                        </TableCell>
                        <TableCell>
                          {template.active ? (
                            <Badge className="bg-green-100 text-green-800">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(template.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compose Tab */}
        <TabsContent value="compose">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Compose Message</CardTitle>
              <CardDescription>
                Send an ad-hoc message to a client
              </CardDescription>
            </CardHeader>
            <CardContent>
              {composeError && (
                <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {composeError}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="compose-channel">Channel</Label>
                  <Select
                    value={composeForm.channel}
                    onValueChange={(v) =>
                      setComposeForm((prev) => ({
                        ...prev,
                        channel: v as 'EMAIL' | 'SMS' | 'PUSH',
                      }))
                    }
                  >
                    <SelectTrigger id="compose-channel" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMAIL">Email</SelectItem>
                      <SelectItem value="SMS">SMS</SelectItem>
                      <SelectItem value="PUSH">Push</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="compose-recipient">
                    Recipient (Client ID or Email)
                  </Label>
                  <Input
                    id="compose-recipient"
                    value={composeForm.recipientId}
                    onChange={(e) =>
                      setComposeForm((prev) => ({
                        ...prev,
                        recipientId: e.target.value,
                      }))
                    }
                    placeholder="Enter client ID or email address"
                  />
                </div>

                {templates.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="compose-template">
                      Template (optional)
                    </Label>
                    <Select
                      value={composeForm.templateId}
                      onValueChange={handleTemplateSelect}
                    >
                      <SelectTrigger id="compose-template" className="w-full">
                        <SelectValue placeholder="Select a template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {templates
                          .filter((t) => t.active)
                          .map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {composeForm.channel === 'EMAIL' && (
                  <div className="space-y-2">
                    <Label htmlFor="compose-subject">Subject</Label>
                    <Input
                      id="compose-subject"
                      value={composeForm.subject}
                      onChange={(e) =>
                        setComposeForm((prev) => ({
                          ...prev,
                          subject: e.target.value,
                        }))
                      }
                      placeholder="Email subject"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="compose-body">Message Body</Label>
                  <Textarea
                    id="compose-body"
                    value={composeForm.body}
                    onChange={(e) =>
                      setComposeForm((prev) => ({
                        ...prev,
                        body: e.target.value,
                      }))
                    }
                    placeholder="Enter your message..."
                    rows={6}
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSend} disabled={isSending}>
                    {isSending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Message
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Delivery Log Tab */}
        <TabsContent value="log">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Delivery Log</CardTitle>
                  <CardDescription>
                    {deliveryLogs.length === 0
                      ? 'No delivery history yet.'
                      : `${deliveryLogs.length} message${deliveryLogs.length !== 1 ? 's' : ''} logged`}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void fetchDeliveryLogs()}
                >
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {deliveryLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm text-muted-foreground">
                    Delivery logs will appear here after messages are sent.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Channel</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deliveryLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {getChannelBadge(log.channel)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.recipientEmail ?? log.recipientPhone ?? '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {log.subject ?? '-'}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(log.status)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(log.sentAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
