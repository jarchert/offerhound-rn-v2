import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { FlashList } from '@shopify/flash-list';
import Svg, { G, Path, Rect, Line, Text as SvgText, Circle } from 'react-native-svg';
import { format } from 'date-fns';
import {
  Bug, Palette, Zap, Lightbulb, FileText, HelpCircle,
  Download, RefreshCw, Sparkles, Copy, Check, Eye,
  MessageSquare, Users, TrendingUp, Clock, Mail, Send,
} from 'lucide-react-native';

import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/Dialog';
import { Textarea } from '@/components/ui/Textarea';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { colors, typography, spacing, radius } from '@/lib/theme';

interface BetaFeedback {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  category: string;
  title: string;
  description: string;
  page_url: string | null;
  browser_info: string | null;
  priority: string;
  status: string;
  admin_notes: string | null;
  ai_correction_prompt: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

interface BetaInvitation {
  id: string;
  email: string;
  used: boolean;
  used_at: string | null;
  expires_at: string;
  notes: string | null;
  created_at: string;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  bug: { label: 'Bug Report', icon: <Bug size={16} color="#ef4444" />, color: '#ef4444' },
  ui_ux: { label: 'UI/UX', icon: <Palette size={16} color="#8b5cf6" />, color: '#8b5cf6' },
  performance: { label: 'Performance', icon: <Zap size={16} color="#f59e0b" />, color: '#f59e0b' },
  feature_request: { label: 'Feature Request', icon: <Lightbulb size={16} color="#10b981" />, color: '#10b981' },
  content: { label: 'Content', icon: <FileText size={16} color="#3b82f6" />, color: '#3b82f6' },
  other: { label: 'Other', icon: <HelpCircle size={16} color="#6b7280" />, color: '#6b7280' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new: { label: 'New', color: '#3b82f6' },
  reviewed: { label: 'Reviewed', color: '#8b5cf6' },
  in_progress: { label: 'In Progress', color: '#eab308' },
  resolved: { label: 'Resolved', color: '#22c55e' },
  wont_fix: { label: "Won't Fix", color: '#6b7280' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: 'Low', color: '#22c55e' },
  medium: { label: 'Medium', color: '#eab308' },
  high: { label: 'High', color: '#f97316' },
  critical: { label: 'Critical', color: '#ef4444' },
};

export const AdminBetaFeedbackDashboard = () => {
  const { toast } = useToast();
  const [feedback, setFeedback] = useState<BetaFeedback[]>([]);
  const [invitations, setInvitations] = useState<BetaInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState<BetaFeedback | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteNotes, setInviteNotes] = useState('');
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [adminNotesInput, setAdminNotesInput] = useState<string>('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('feedback');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [feedbackRes, invitationsRes] = await Promise.all([
        supabase.from('beta_feedback').select('*').order('created_at', { ascending: false }),
        supabase.from('beta_invitations').select('*').order('created_at', { ascending: false }),
      ]);

      if (feedbackRes.error) throw feedbackRes.error;
      if (invitationsRes.error) throw invitationsRes.error;

      setFeedback((feedbackRes.data as BetaFeedback[]) || []);
      setInvitations((invitationsRes.data as BetaInvitation[]) || []);
    } catch (err: any) {
      console.error('Error fetching beta data:', err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredFeedback = useMemo(() => {
    return feedback.filter((f) => {
      if (filterCategory !== 'all' && f.category !== filterCategory) return false;
      if (filterStatus !== 'all' && f.status !== filterStatus) return false;
      if (filterPriority !== 'all' && f.priority !== filterPriority) return false;
      return true;
    });
  }, [feedback, filterCategory, filterStatus, filterPriority]);

  const stats = useMemo(() => {
    const byCategory = Object.keys(CATEGORY_CONFIG).map((cat) => ({
      name: CATEGORY_CONFIG[cat].label,
      value: feedback.filter((f) => f.category === cat).length,
      color: CATEGORY_CONFIG[cat].color,
    }));

    const byStatus = Object.keys(STATUS_CONFIG).map((status) => ({
      name: STATUS_CONFIG[status].label,
      value: feedback.filter((f) => f.status === status).length,
    }));

    const uniqueTesters = new Set(feedback.map((f) => f.user_id)).size;
    const activeBetaTesters = invitations.filter((i) => i.used).length;
    const pendingInvitations = invitations.filter(
      (i) => !i.used && new Date(i.expires_at) > new Date()
    ).length;

    return { byCategory, byStatus, uniqueTesters, activeBetaTesters, pendingInvitations };
  }, [feedback, invitations]);

  const handleSendInvite = async () => {
    if (!inviteEmail) return;
    setIsSendingInvite(true);
    try {
      const response = await supabase.functions.invoke('send-beta-invitation', {
        body: { email: inviteEmail, notes: inviteNotes },
      });

      if (response.error) throw response.error;

      toast({ title: 'Invitation sent!', description: `Beta invitation sent to ${inviteEmail}` });
      setIsInviteOpen(false);
      setInviteEmail('');
      setInviteNotes('');
      fetchData();
    } catch (err: any) {
      console.error('Error sending invitation:', err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleGeneratePrompt = async (feedbackId: string) => {
    setIsGeneratingPrompt(true);
    try {
      const response = await supabase.functions.invoke('generate-feedback-prompt', {
        body: { feedbackId },
      });

      if (response.error) throw response.error;

      toast({ title: 'Correction prompt generated!', description: 'AI has analyzed the feedback.' });
      fetchData();

      if (selectedFeedback?.id === feedbackId) {
        setSelectedFeedback({
          ...selectedFeedback,
          ai_correction_prompt: response.data.correctionPrompt,
        });
      }
    } catch (err: any) {
      console.error('Error generating prompt:', err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const handleUpdateStatus = async (feedbackId: string, newStatus: string, adminNotes?: string) => {
    try {
      const updates: any = { status: newStatus };
      if (newStatus === 'resolved') {
        updates.resolved_at = new Date().toISOString();
      }
      if (adminNotes !== undefined) {
        updates.admin_notes = adminNotes;
      }

      const { error } = await supabase
        .from('beta_feedback')
        .update(updates)
        .eq('id', feedbackId);

      if (error) throw error;

      const notificationType = newStatus === 'resolved' ? 'resolved' : 'status_update';
      try {
        await supabase.functions.invoke('send-feedback-notification', {
          body: { feedbackId, notificationType, adminMessage: adminNotes },
        });
      } catch (notifError) {
        console.error('Error sending notification:', notifError);
      }

      toast({ title: 'Status updated', description: 'User has been notified' });
      fetchData();
    } catch (err: any) {
      console.error('Error updating status:', err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const writeAndShareFile = async (filename: string, content: string, mimeType: string) => {
    try {
      const dir = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory;
      const uri = `${dir}${filename}`;
      await (FileSystem as any).writeAsStringAsync(uri, content);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType, dialogTitle: filename });
      } else {
        toast({ title: 'Saved', description: uri });
      }
    } catch (e: any) {
      toast({ title: 'Export failed', description: e.message, variant: 'destructive' });
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Category', 'Priority', 'Status', 'Title', 'Description', 'User', 'Page URL'];
    const rows = filteredFeedback.map((f) => [
      format(new Date(f.created_at), 'yyyy-MM-dd HH:mm'),
      CATEGORY_CONFIG[f.category]?.label || f.category,
      f.priority,
      f.status,
      f.title,
      f.description.replace(/"/g, '""'),
      f.user_email,
      f.page_url || '',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    writeAndShareFile(`beta-feedback-${format(new Date(), 'yyyy-MM-dd')}.csv`, csvContent, 'text/csv');
  };

  const exportToPDF = () => {
    // jsPDF is web-only; export a plain-text report instead and share it.
    const lines: string[] = [];
    lines.push('OfferHound™ Beta Feedback Report');
    lines.push(`Generated: ${format(new Date(), 'PPpp')}`);
    lines.push(`Total Feedback: ${filteredFeedback.length}`);
    lines.push('');
    filteredFeedback.slice(0, 20).forEach((f, index) => {
      lines.push(`${index + 1}. [${f.category.toUpperCase()}] ${f.title}`);
      lines.push(`   Status: ${f.status} | Priority: ${f.priority} | By: ${f.user_email}`);
      lines.push('');
    });
    writeAndShareFile(
      `beta-feedback-${format(new Date(), 'yyyy-MM-dd')}.txt`,
      lines.join('\n'),
      'text/plain'
    );
  };


  const renderFeedbackItem = (f: BetaFeedback) => (
    <Card key={f.id} style={styles.feedbackCard}>
      <CardContent style={{ padding: spacing.md }}>
        <View style={styles.feedbackRow}>
          <View style={styles.feedbackMain}>
            <View
              style={[
                styles.catIcon,
                { backgroundColor: colors.muted },
              ]}
            >
              {CATEGORY_CONFIG[f.category]?.icon}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.titleRow}>
                <Text style={styles.feedbackTitle} numberOfLines={1}>
                  {f.title}
                </Text>
                <Badge variant="secondary" style={{ backgroundColor: PRIORITY_CONFIG[f.priority]?.color }}>
                  {f.priority}
                </Badge>
                <Badge variant="outline" style={{ backgroundColor: STATUS_CONFIG[f.status]?.color }}>
                  {STATUS_CONFIG[f.status]?.label}
                </Badge>
              </View>
              <Text style={styles.feedbackDesc} numberOfLines={2}>
                {f.description}
              </Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>{f.user_name || f.user_email}</Text>
                <Text style={styles.metaText}>
                  {format(new Date(f.created_at), 'MMM d, yyyy h:mm a')}
                </Text>
                {f.page_url ? (
                  <Text style={[styles.metaText, { maxWidth: 200 }]} numberOfLines={1}>
                    {f.page_url}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
          <View style={styles.actions}>
            <Button
              variant="outline"
              size="sm"
              onPress={() => {
                setSelectedFeedback(f);
                setAdminNotesInput(f.admin_notes || '');
                setIsDetailOpen(true);
              }}
            >
              <Eye size={16} color={colors.foreground} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onPress={() => handleGeneratePrompt(f.id)}
              disabled={isGeneratingPrompt}
            >
              <Sparkles size={16} color={colors.foreground} />
            </Button>
          </View>
        </View>
      </CardContent>
    </Card>
  );

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.h2}>Beta Testing Dashboard</Text>
          <Text style={styles.muted}>Manage beta testers and review feedback</Text>
        </View>
        <View style={styles.headerActions}>
          <Button variant="outline" onPress={fetchData} disabled={isLoading}>
            <RefreshCw size={16} color={colors.foreground} />
            <Text style={styles.btnText}>Refresh</Text>
          </Button>
          <Button onPress={() => setIsInviteOpen(true)}>
            <Mail size={16} color={colors.primaryForeground} />
            <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Invite Tester</Text>
          </Button>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsGrid}>
        <StatCard
          icon={<MessageSquare size={24} color={colors.primary} />}
          tint={`${colors.primary}1A`}
          value={feedback.length}
          label="Total Feedback"
        />
        <StatCard
          icon={<Users size={24} color="#22c55e" />}
          tint="rgba(34,197,94,0.1)"
          value={stats.activeBetaTesters}
          label="Active Testers"
        />
        <StatCard
          icon={<Clock size={24} color="#eab308" />}
          tint="rgba(234,179,8,0.1)"
          value={stats.pendingInvitations}
          label="Pending Invites"
        />
        <StatCard
          icon={<TrendingUp size={24} color="#3b82f6" />}
          tint="rgba(59,130,246,0.1)"
          value={feedback.filter((f) => f.status === 'resolved').length}
          label="Resolved"
        />
      </View>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="feedback">Feedback ({feedback.length})</TabsTrigger>
          <TabsTrigger value="invitations">Invitations ({invitations.length})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Feedback Tab */}
        <TabsContent value="feedback">
          <View style={styles.filtersRow}>
            <View style={{ minWidth: 160 }}>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </View>
            <View style={{ minWidth: 160 }}>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </View>
            <View style={{ minWidth: 160 }}>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginLeft: 'auto' }}>
              <Button variant="outline" size="sm" onPress={exportToCSV}>
                <Download size={16} color={colors.foreground} />
                <Text style={styles.btnText}>CSV</Text>
              </Button>
              <Button variant="outline" size="sm" onPress={exportToPDF}>
                <Download size={16} color={colors.foreground} />
                <Text style={styles.btnText}>PDF</Text>
              </Button>
            </View>
          </View>

          {isLoading ? (
            <View style={{ paddingVertical: 48, alignItems: 'center' }}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : filteredFeedback.length === 0 ? (
            <Card>
              <CardContent style={{ paddingVertical: 48, alignItems: 'center' }}>
                <Text style={styles.muted}>No feedback matches your filters.</Text>
              </CardContent>
            </Card>
          ) : (
            <View style={{ height: Math.min(filteredFeedback.length * 140, 720) }}>
              <FlashList
                data={filteredFeedback}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => renderFeedbackItem(item)}
              />
            </View>
          )}
        </TabsContent>

        {/* Invitations Tab */}
        <TabsContent value="invitations">
          <View style={{ gap: spacing.md }}>
            {invitations.map((inv) => (
              <Card key={inv.id}>
                <CardContent style={styles.invRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.invEmail}>{inv.email}</Text>
                    <Text style={styles.muted}>
                      {inv.used
                        ? `Accepted ${inv.used_at ? format(new Date(inv.used_at), 'MMM d, yyyy') : ''}`
                        : `Expires ${format(new Date(inv.expires_at), 'MMM d, yyyy')}`}
                    </Text>
                    {inv.notes ? <Text style={styles.smallMuted}>{inv.notes}</Text> : null}
                  </View>
                  <Badge variant={inv.used ? 'default' : 'secondary'}>
                    {inv.used ? 'Accepted' : 'Pending'}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </View>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <View style={styles.chartsGrid}>
            <Card>
              <CardHeader>
                <CardTitle>Feedback by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <PieChartSvg data={stats.byCategory.filter((c) => c.value > 0)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Feedback by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChartSvg data={stats.byStatus} />
              </CardContent>
            </Card>
          </View>
        </TabsContent>
      </Tabs>


      {/* Feedback Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent style={{ maxWidth: 640 }}>
          {selectedFeedback && (
            <View>
              <DialogHeader>
                <DialogTitle>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    {CATEGORY_CONFIG[selectedFeedback.category]?.icon}
                    <Text style={styles.dialogTitleText}>{selectedFeedback.title}</Text>
                  </View>
                </DialogTitle>
                <DialogDescription>
                  {`Submitted by ${selectedFeedback.user_name || selectedFeedback.user_email} on ${format(
                    new Date(selectedFeedback.created_at),
                    'PPpp'
                  )}`}
                </DialogDescription>
              </DialogHeader>

              <View style={{ gap: spacing.md, marginTop: spacing.md }}>
                <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
                  <Badge style={{ backgroundColor: PRIORITY_CONFIG[selectedFeedback.priority]?.color }}>
                    {selectedFeedback.priority}
                  </Badge>
                  <View style={{ minWidth: 160 }}>
                    <Select
                      value={selectedFeedback.status}
                      onValueChange={(v) => handleUpdateStatus(selectedFeedback.id, v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </View>
                </View>

                <View>
                  <Label>Description</Label>
                  <View style={styles.descBox}>
                    <Text style={styles.descText}>{selectedFeedback.description}</Text>
                  </View>
                </View>

                {selectedFeedback.page_url ? (
                  <View>
                    <Label>Page URL</Label>
                    <Text style={styles.muted}>{selectedFeedback.page_url}</Text>
                  </View>
                ) : null}

                {selectedFeedback.browser_info ? (
                  <View>
                    <Label>Browser Info</Label>
                    <Text style={styles.smallMuted}>{selectedFeedback.browser_info}</Text>
                  </View>
                ) : null}

                {/* Admin Notes */}
                <View style={styles.sectionDivider}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
                    <MessageSquare size={16} color={colors.primary} />
                    <Label>Admin Response (sent to user)</Label>
                  </View>
                  <Textarea
                    placeholder="Enter a response or notes for the user. This will be sent in notification emails."
                    value={adminNotesInput || selectedFeedback.admin_notes || ''}
                    onChangeText={(t: string) => setAdminNotesInput(t)}
                    numberOfLines={3}
                    style={{ marginBottom: spacing.sm }}
                  />
                  <Button
                    size="sm"
                    onPress={async () => {
                      setIsSavingNotes(true);
                      await handleUpdateStatus(selectedFeedback.id, selectedFeedback.status, adminNotesInput);
                      setSelectedFeedback({ ...selectedFeedback, admin_notes: adminNotesInput });
                      setIsSavingNotes(false);
                    }}
                    disabled={isSavingNotes}
                  >
                    <Text style={[styles.btnText, { color: colors.primaryForeground }]}>
                      {isSavingNotes ? 'Saving...' : 'Save & Notify User'}
                    </Text>
                  </Button>
                </View>

                {/* AI Correction Prompt */}
                <View style={styles.sectionDivider}>
                  <View style={styles.aiHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                      <Sparkles size={16} color={colors.primary} />
                      <Label>AI Correction Prompt</Label>
                    </View>
                    <Button
                      size="sm"
                      variant="outline"
                      onPress={() => handleGeneratePrompt(selectedFeedback.id)}
                      disabled={isGeneratingPrompt}
                    >
                      <Text style={styles.btnText}>{isGeneratingPrompt ? 'Generating...' : 'Generate'}</Text>
                    </Button>
                  </View>
                  {selectedFeedback.ai_correction_prompt ? (
                    <View style={{ position: 'relative' }}>
                      <View style={styles.codeBox}>
                        <Text style={styles.codeText}>{selectedFeedback.ai_correction_prompt}</Text>
                      </View>
                      <Pressable
                        style={styles.copyBtn}
                        onPress={() =>
                          copyToClipboard(selectedFeedback.ai_correction_prompt!, selectedFeedback.id)
                        }
                      >
                        {copiedId === selectedFeedback.id ? (
                          <Check size={16} color="#22c55e" />
                        ) : (
                          <Copy size={16} color={colors.mutedForeground} />
                        )}
                      </Pressable>
                    </View>
                  ) : (
                    <Text style={styles.italicMuted}>
                      Click "Generate" to create an AI-powered correction prompt for this feedback.
                    </Text>
                  )}
                </View>
              </View>
            </View>
          )}
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Beta Tester</DialogTitle>
            <DialogDescription>
              Send an email invitation to a new beta tester. They'll get free full access to the platform.
            </DialogDescription>
          </DialogHeader>
          <View style={{ gap: spacing.md, marginTop: spacing.md }}>
            <View>
              <Label>Email Address *</Label>
              <Input
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="tester@example.com"
                value={inviteEmail}
                onChangeText={setInviteEmail}
              />
            </View>
            <View>
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Any notes about this tester..."
                value={inviteNotes}
                onChangeText={setInviteNotes}
                numberOfLines={3}
              />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm }}>
              <Button variant="outline" onPress={() => setIsInviteOpen(false)}>
                <Text style={styles.btnText}>Cancel</Text>
              </Button>
              <Button onPress={handleSendInvite} disabled={!inviteEmail || isSendingInvite}>
                {isSendingInvite ? (
                  <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Sending...</Text>
                ) : (
                  <>
                    <Send size={16} color={colors.primaryForeground} />
                    <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Send Invitation</Text>
                  </>
                )}
              </Button>
            </View>
          </View>
        </DialogContent>
      </Dialog>
    </ScrollView>
  );
};

export default AdminBetaFeedbackDashboard;


// ---------- Helpers ----------

const StatCard: React.FC<{ icon: React.ReactNode; tint: string; value: number; label: string }> = ({
  icon, tint, value, label,
}) => (
  <Card style={styles.statCard}>
    <CardContent style={{ paddingTop: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View style={[styles.statIcon, { backgroundColor: tint }]}>{icon}</View>
        <View>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.muted}>{label}</Text>
        </View>
      </View>
    </CardContent>
  </Card>
);

// Minimal SVG pie chart (recharts replacement)
const PieChartSvg: React.FC<{ data: { name: string; value: number; color: string }[] }> = ({ data }) => {
  const size = 240;
  const cx = size / 2;
  const cy = size / 2;
  const r = 90;
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let cumulative = 0;

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <G>
          {data.map((d, i) => {
            const startAngle = (cumulative / total) * Math.PI * 2;
            cumulative += d.value;
            const endAngle = (cumulative / total) * Math.PI * 2;
            const x1 = cx + r * Math.sin(startAngle);
            const y1 = cy - r * Math.cos(startAngle);
            const x2 = cx + r * Math.sin(endAngle);
            const y2 = cy - r * Math.cos(endAngle);
            const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
            const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
            return <Path key={i} d={path} fill={d.color} />;
          })}
        </G>
      </Svg>
      <View style={styles.legend}>
        {data.map((d) => (
          <View key={d.name} style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: d.color }]} />
            <Text style={styles.legendText}>{d.name} ({d.value})</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// Minimal SVG bar chart
const BarChartSvg: React.FC<{ data: { name: string; value: number }[] }> = ({ data }) => {
  const width = 320;
  const height = 240;
  const padding = { top: 20, right: 10, bottom: 50, left: 30 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const max = Math.max(1, ...data.map((d) => d.value));
  const barW = chartW / Math.max(data.length, 1) * 0.7;
  const gap = chartW / Math.max(data.length, 1) * 0.3;

  return (
    <Svg width={width} height={height}>
      {/* Y axis */}
      <Line x1={padding.left} y1={padding.top} x2={padding.left} y2={padding.top + chartH} stroke={colors.border} />
      {/* X axis */}
      <Line x1={padding.left} y1={padding.top + chartH} x2={padding.left + chartW} y2={padding.top + chartH} stroke={colors.border} />

      {data.map((d, i) => {
        const h = (d.value / max) * chartH;
        const x = padding.left + (barW + gap) * i + gap / 2;
        const y = padding.top + chartH - h;
        return (
          <G key={d.name}>
            <Rect x={x} y={y} width={barW} height={h} fill={colors.primary} />
            <SvgText
              x={x + barW / 2}
              y={padding.top + chartH + 14}
              fill={colors.mutedForeground}
              fontSize="9"
              textAnchor="middle"
            >
              {d.name}
            </SvgText>
            <SvgText
              x={x + barW / 2}
              y={y - 4}
              fill={colors.foreground}
              fontSize="10"
              textAnchor="middle"
            >
              {d.value}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
};

// ---------- Styles ----------

const styles = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.lg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  h2: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.xl, color: colors.foreground },
  muted: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  smallMuted: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground, marginTop: 2 },
  italicMuted: { fontFamily: typography.fontFamily.body, fontStyle: 'italic', fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  btnText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground, marginLeft: 6 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  statCard: { flexGrow: 1, flexBasis: 160, minWidth: 160 },
  statIcon: { padding: spacing.sm, borderRadius: 999 },
  statValue: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.xl, color: colors.foreground },

  filtersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, alignItems: 'center', marginBottom: spacing.md },

  feedbackCard: { marginBottom: spacing.sm },
  feedbackRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  feedbackMain: { flex: 1, flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  catIcon: { padding: spacing.sm, borderRadius: 999 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs, marginBottom: 4 },
  feedbackTitle: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.base, color: colors.foreground, flexShrink: 1 },
  feedbackDesc: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.xs },
  metaText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground },
  actions: { flexDirection: 'row', gap: spacing.sm },

  invRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md },
  invEmail: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.base, color: colors.foreground },

  chartsGrid: { gap: spacing.lg },

  dialogTitleText: { fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.lg, color: colors.foreground },
  descBox: { marginTop: 4, padding: spacing.md, backgroundColor: colors.muted, borderRadius: radius.md },
  descText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.foreground },
  sectionDivider: { borderTopWidth: 1, borderColor: colors.border, paddingTop: spacing.md },
  aiHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  codeBox: { padding: spacing.md, backgroundColor: colors.muted, borderRadius: radius.md },
  codeText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.foreground },
  copyBtn: { position: 'absolute', top: 8, right: 8, padding: 4 },

  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendSwatch: { width: 12, height: 12, borderRadius: 2 },
  legendText: { fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.foreground },
});
