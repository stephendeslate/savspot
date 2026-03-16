'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import {
  MessageSquare,
  Search,
  Send,
  Plus,
} from 'lucide-react';
import { Button, Badge, Card, CardContent, Input, Label, Skeleton, ScrollArea, Textarea, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@savspot/ui';
import { apiClient } from '@/lib/api-client';
import { useTenant } from '@/hooks/use-tenant';
import { queryKeys } from '@/hooks/use-api';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';

// ---------- Types ----------

interface MessageThread {
  id: string;
  subject: string;
  clientId: string | null;
  clientName: string | null;
  lastMessageAt: string;
  unreadCount: number;
  status: string;
  messages?: Message[];
}

interface Message {
  id: string;
  body: string;
  senderType: 'STAFF' | 'CLIENT' | 'SYSTEM';
  senderName: string | null;
  createdAt: string;
}

interface ThreadsResponse {
  data: MessageThread[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface ThreadDetailResponse {
  id: string;
  subject: string;
  clientId: string | null;
  clientName: string | null;
  lastMessageAt: string;
  unreadCount: number;
  status: string;
  messages: Message[];
}

// ---------- Component ----------

export default function MessagesPage() {
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [newThreadOpen, setNewThreadOpen] = useState(false);
  const [newThreadSubject, setNewThreadSubject] = useState('');
  const [newThreadClientName, setNewThreadClientName] = useState('');
  const [newThreadBody, setNewThreadBody] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebounce(search, 300);

  const { data: threadsRes, isLoading: threadsLoading, error: threadsError } = useQuery({
    queryKey: queryKeys.messageThreads(tenantId!, debouncedSearch),
    queryFn: () => {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      const qs = params.toString();
      return apiClient.getRaw<ThreadsResponse>(
        `/api/tenants/${tenantId}/messages/threads${qs ? `?${qs}` : ''}`,
      );
    },
    enabled: !!tenantId,
  });

  const threads = useMemo(() => threadsRes?.data ?? [], [threadsRes?.data]);
  const error = threadsError
    ? (threadsError instanceof Error ? threadsError.message : 'Failed to load threads')
    : null;

  const { data: selectedThread, isLoading: threadLoading } = useQuery({
    queryKey: queryKeys.messageThread(tenantId!, selectedThreadId!),
    queryFn: () =>
      apiClient.get<ThreadDetailResponse>(
        `/api/tenants/${tenantId}/messages/threads/${selectedThreadId}`,
      ),
    enabled: !!tenantId && !!selectedThreadId,
  });

  const threadsKey = queryKeys.messageThreads(tenantId!, debouncedSearch);
  const markReadMutation = useMutation({
    mutationFn: (threadId: string) =>
      apiClient.patch(
        `/api/tenants/${tenantId}/messages/threads/${threadId}/read`,
      ),
    onMutate: async (threadId) => {
      await queryClient.cancelQueries({ queryKey: threadsKey });
      const previous = queryClient.getQueryData<ThreadsResponse>(threadsKey);
      queryClient.setQueryData<ThreadsResponse>(threadsKey, (old) =>
        old
          ? {
              ...old,
              data: old.data.map((t) =>
                t.id === threadId ? { ...t, unreadCount: 0 } : t,
              ),
            }
          : old,
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(threadsKey, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['message-threads', tenantId] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: (body: string) =>
      apiClient.post(
        `/api/tenants/${tenantId}/messages/threads/${selectedThreadId}/messages`,
        { body },
      ),
    onMutate: async (body) => {
      const threadKey = queryKeys.messageThread(tenantId!, selectedThreadId!);
      await queryClient.cancelQueries({ queryKey: threadKey });
      const previous = queryClient.getQueryData<ThreadDetailResponse>(threadKey);
      const optimisticMessage: Message = {
        id: `optimistic-${Date.now()}`,
        body,
        senderType: 'STAFF',
        senderName: null,
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData<ThreadDetailResponse>(threadKey, (old) =>
        old
          ? { ...old, messages: [...(old.messages ?? []), optimisticMessage] }
          : old,
      );
      setNewMessage('');
      return { previous, threadKey };
    },
    onError: (_err, body, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.threadKey, context.previous);
        setNewMessage(body);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.messageThread(tenantId!, selectedThreadId!),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.messageThreads(tenantId!) });
    },
  });

  const createThreadMutation = useMutation({
    mutationFn: (data: { subject: string; clientName: string; body: string }) =>
      apiClient.post<MessageThread>(
        `/api/tenants/${tenantId}/messages/threads`,
        data,
      ),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: threadsKey });
      const previous = queryClient.getQueryData<ThreadsResponse>(threadsKey);
      const optimisticThread: MessageThread = {
        id: `optimistic-${Date.now()}`,
        subject: data.subject,
        clientId: null,
        clientName: data.clientName || null,
        lastMessageAt: new Date().toISOString(),
        unreadCount: 0,
        status: 'OPEN',
      };
      queryClient.setQueryData<ThreadsResponse>(threadsKey, (old) =>
        old
          ? { ...old, data: [optimisticThread, ...old.data], meta: { ...old.meta, total: old.meta.total + 1 } }
          : old,
      );
      setNewThreadOpen(false);
      setNewThreadSubject('');
      setNewThreadClientName('');
      setNewThreadBody('');
      return { previous };
    },
    onSuccess: (thread) => {
      setSelectedThreadId(thread.id);
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(threadsKey, context.previous);
      }
      setNewThreadOpen(true);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['message-threads', tenantId] });
    },
  });

  useEffect(() => {
    if (selectedThreadId) {
      markReadMutation.mutate(selectedThreadId);
    }
    // Only trigger on thread selection change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedThreadId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedThread?.messages]);

  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim() || !selectedThreadId) return;
    sendMessageMutation.mutate(newMessage.trim());
  }, [newMessage, selectedThreadId, sendMessageMutation]);

  const handleCreateThread = useCallback(() => {
    if (!newThreadSubject.trim() || !newThreadBody.trim()) return;
    createThreadMutation.mutate({
      subject: newThreadSubject.trim(),
      clientName: newThreadClientName.trim(),
      body: newThreadBody.trim(),
    });
  }, [newThreadSubject, newThreadClientName, newThreadBody, createThreadMutation]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage],
  );

  // ---------- Loading ----------

  if (threadsLoading && threads.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-24" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid h-[600px] grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardContent className="pt-6">
              <Skeleton className="h-full w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ---------- Render ----------

  return (
    <div className="min-w-0 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Messages</h2>
          <p className="text-sm text-muted-foreground">
            Communicate with your clients
          </p>
        </div>
        <Button onClick={() => setNewThreadOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Thread
        </Button>
      </div>

      {error && (
        <div role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Two-panel layout */}
      <div className="grid h-[600px] grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left panel: Thread list */}
        <Card className="flex flex-col lg:col-span-1">
          <div className="border-b p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search threads..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            {threads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <h3 className="text-base font-medium">No threads yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Start a conversation with a client.
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {threads.map((thread) => (
                  <button
                    key={thread.id}
                    type="button"
                    className={cn(
                      'w-full px-4 py-3 text-left transition-colors hover:bg-accent/50',
                      selectedThreadId === thread.id && 'bg-accent',
                    )}
                    onClick={() => setSelectedThreadId(thread.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className={cn(
                          'truncate text-sm',
                          thread.unreadCount > 0 ? 'font-semibold' : 'font-medium',
                        )}>
                          {thread.subject}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {thread.clientName ?? 'Unknown client'}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(thread.lastMessageAt), 'MMM d')}
                        </span>
                        {thread.unreadCount > 0 && (
                          <Badge className="h-5 min-w-[20px] justify-center px-1 text-xs">
                            {thread.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>

        {/* Right panel: Thread detail */}
        <Card className="flex flex-col lg:col-span-2">
          {selectedThreadId ? (
            <>
              {/* Thread header */}
              <div className="border-b p-4">
                <h3 className="font-medium">
                  {selectedThread?.subject ?? 'Loading...'}
                </h3>
                {selectedThread?.clientName && (
                  <p className="text-sm text-muted-foreground">
                    {selectedThread.clientName}
                  </p>
                )}
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {threadLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-3/4" />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedThread?.messages?.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          'flex',
                          message.senderType === 'STAFF'
                            ? 'justify-end'
                            : 'justify-start',
                        )}
                      >
                        <div
                          className={cn(
                            'max-w-[75%] rounded-lg px-4 py-2',
                            message.senderType === 'STAFF'
                              ? 'bg-primary text-primary-foreground'
                              : message.senderType === 'SYSTEM'
                                ? 'bg-muted text-muted-foreground text-center text-xs italic'
                                : 'bg-accent',
                          )}
                        >
                          {message.senderName && message.senderType !== 'STAFF' && (
                            <p className="mb-1 text-xs font-medium">
                              {message.senderName}
                            </p>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{message.body}</p>
                          <p
                            className={cn(
                              'mt-1 text-xs',
                              message.senderType === 'STAFF'
                                ? 'text-primary-foreground/70'
                                : 'text-muted-foreground',
                            )}
                          >
                            {format(new Date(message.createdAt), 'h:mm a')}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Send message input */}
              <div className="border-t p-4">
                <div className="flex items-end gap-2">
                  <Textarea
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="min-h-[40px] resize-none"
                    rows={1}
                  />
                  <Button
                    size="sm"
                    aria-label="Send message"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sendMessageMutation.isPending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-medium">Select a conversation</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Choose a thread from the list to view messages, or start a new
                conversation.
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* New Thread Dialog */}
      <Dialog open={newThreadOpen} onOpenChange={setNewThreadOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Conversation</DialogTitle>
            <DialogDescription>
              Start a new message thread with a client.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-thread-client">Client Name</Label>
              <Input
                id="new-thread-client"
                placeholder="Enter client name..."
                value={newThreadClientName}
                onChange={(e) => setNewThreadClientName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-thread-subject">Subject</Label>
              <Input
                id="new-thread-subject"
                placeholder="Enter subject..."
                value={newThreadSubject}
                onChange={(e) => setNewThreadSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-thread-body">Message</Label>
              <Textarea
                id="new-thread-body"
                placeholder="Write your message..."
                value={newThreadBody}
                onChange={(e) => setNewThreadBody(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNewThreadOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateThread}
              disabled={
                !newThreadSubject.trim() ||
                !newThreadBody.trim() ||
                createThreadMutation.isPending
              }
            >
              {createThreadMutation.isPending ? 'Creating...' : 'Create Thread'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
