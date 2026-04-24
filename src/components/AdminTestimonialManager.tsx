// AdminTestimonialManager — verbatim port from Lovable web.
// Source: offerhound-repo/src/components/AdminTestimonialManager.tsx
//
// Web-only APIs replaced with RN equivalents:
//   • lucide-react            → lucide-react-native
//   • <div>/<span>/<p>        → View / Text
//   • CSV download (Blob/URL) → expo-file-system + expo-sharing
//   • confirm()               → Alert.alert (native confirm)
//   • Tabs/Card/Badge/etc.    → RN ui primitives in @/components/ui/*
// All business logic (stats, filters, handlers, CSV shape) preserved verbatim.

import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, StyleSheet } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { format } from 'date-fns';
import { Star, Check, X, Trash2, Download, MessageSquare } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import { Switch } from '@/components/ui/Switch';
import { Label } from '@/components/ui/Label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { useAdminTestimonials } from '@/hooks/useTestimonials';
import { useToast } from '@/hooks/use-toast';
import { colors, typography, spacing, radius } from '@/lib/theme';

export function AdminTestimonialManager() {
  const { allTestimonials, isLoading, updateTestimonial, deleteTestimonial } = useAdminTestimonials();
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [tab, setTab] = useState<'pending' | 'approved' | 'featured' | 'all'>('pending');

  const pendingTestimonials = allTestimonials?.filter((t) => !t.is_approved) || [];
  const approvedTestimonials = allTestimonials?.filter((t) => t.is_approved) || [];
  const featuredTestimonials = allTestimonials?.filter((t) => t.is_featured) || [];

  const stats = {
    total: allTestimonials?.length || 0,
    pending: pendingTestimonials.length,
    approved: approvedTestimonials.length,
    featured: featuredTestimonials.length,
    avgRating: allTestimonials?.length
      ? (allTestimonials.reduce((sum, t) => sum + t.rating, 0) / allTestimonials.length).toFixed(1)
      : '0.0',
  };

  const handleApprove = (id: string) => {
    updateTestimonial.mutate({ id, updates: { is_approved: true } });
  };

  const handleReject = (id: string) => {
    updateTestimonial.mutate({ id, updates: { is_approved: false } });
  };

  const handleToggleFeatured = (id: string, currentState: boolean) => {
    updateTestimonial.mutate({ id, updates: { is_featured: !currentState } });
  };

  const handleDelete = (id: string) => {
    // Native equivalent of web confirm()
    Alert.alert(
      'Delete testimonial',
      'Are you sure you want to delete this testimonial?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteTestimonial.mutate(id) },
      ]
    );
  };

  const handleSaveNotes = (id: string) => {
    updateTestimonial.mutate({ id, updates: { admin_notes: adminNotes } });
    setSelectedId(null);
    setAdminNotes('');
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
    if (!allTestimonials?.length) return;

    const headers = ['Name', 'Email', 'Role', 'Rating', 'Testimonial', 'Approved', 'Featured', 'Date'];
    const rows = allTestimonials.map((t) => [
      t.user_name,
      t.user_email,
      t.user_role,
      t.rating.toString(),
      `"${t.testimonial_text.replace(/"/g, '""')}"`,
      t.is_approved ? 'Yes' : 'No',
      t.is_featured ? 'Yes' : 'No',
      format(new Date(t.created_at), 'yyyy-MM-dd'),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    writeAndShareFile(`testimonials-${format(new Date(), 'yyyy-MM-dd')}.csv`, csv, 'text/csv');
  };

  const renderStars = (rating: number) => (
    <View style={s.starsRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={16}
          color={star <= rating ? '#facc15' : colors.mutedForeground}
          fill={star <= rating ? '#facc15' : 'transparent'}
        />
      ))}
    </View>
  );

  const renderTestimonialCard = (testimonial: any) => (
    <Card key={testimonial.id} style={s.cardMb}>
      <CardContent style={s.cardPt}>
        <View style={s.rowBetween}>
          <View style={s.cardLeft}>
            <View style={s.nameRow}>
              <Text style={s.nameText}>{testimonial.user_name}</Text>
              <Badge variant="outline">{testimonial.user_role}</Badge>
              {renderStars(testimonial.rating)}
            </View>
            <Text style={s.mutedSm}>{testimonial.user_email}</Text>
            <Text style={s.bodySm}>{testimonial.testimonial_text}</Text>
            <Text style={s.mutedXs}>
              {format(new Date(testimonial.created_at), "MMM d, yyyy 'at' h:mm a")}
            </Text>
            {testimonial.admin_notes ? (
              <View style={s.notesBox}>
                <Text style={s.notesText}>
                  <Text style={s.notesStrong}>Admin Notes: </Text>
                  {testimonial.admin_notes}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={s.cardRight}>
            {!testimonial.is_approved && (
              <Button
                size="sm"
                variant="default"
                onPress={() => handleApprove(testimonial.id)}
                leftIcon={<Check size={16} color={colors.primaryForeground} />}
              >
                Approve
              </Button>
            )}
            {testimonial.is_approved && (
              <Button
                size="sm"
                variant="outline"
                onPress={() => handleReject(testimonial.id)}
                leftIcon={<X size={16} color={colors.foreground} />}
              >
                Unapprove
              </Button>
            )}
            <View style={s.featuredRow}>
              <Switch
                value={testimonial.is_featured}
                onValueChange={() => handleToggleFeatured(testimonial.id, testimonial.is_featured)}
              />
              <Label style={s.xsLabel}>Featured</Label>
            </View>
            <Button
              size="sm"
              variant="ghost"
              onPress={() => {
                setSelectedId(testimonial.id);
                setAdminNotes(testimonial.admin_notes || '');
              }}
              leftIcon={<MessageSquare size={16} color={colors.foreground} />}
            />
            <Button
              size="sm"
              variant="ghost"
              onPress={() => handleDelete(testimonial.id)}
              leftIcon={<Trash2 size={16} color={colors.destructive} />}
            />
          </View>
        </View>

        {selectedId === testimonial.id && (
          <View style={s.notesEditBox}>
            <Label>Admin Notes</Label>
            <Textarea
              value={adminNotes}
              onChangeText={setAdminNotes}
              placeholder="Add internal notes about this testimonial..."
              rows={2}
            />
            <View style={s.notesEditBtnRow}>
              <Button size="sm" onPress={() => handleSaveNotes(testimonial.id)}>
                Save Notes
              </Button>
              <Button size="sm" variant="ghost" onPress={() => setSelectedId(null)}>
                Cancel
              </Button>
            </View>
          </View>
        )}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <View style={s.loadingBox}>
        <Text style={s.mutedSm}>Loading testimonials...</Text>
      </View>
    );
  }

  const renderTabContent = (list: any[], empty: string) =>
    list.length === 0 ? (
      <Card>
        <CardContent style={s.emptyCard}>
          <Text style={s.mutedSm}>{empty}</Text>
        </CardContent>
      </Card>
    ) : (
      <View>{list.map(renderTestimonialCard)}</View>
    );

  return (
    <ScrollView contentContainerStyle={s.container}>
      {/* Stats Cards */}
      <View style={s.statsGrid}>
        <Card style={s.statCard}>
          <CardContent style={s.statContent}>
            <Text style={s.statBig}>{stats.total}</Text>
            <Text style={s.statLabel}>Total</Text>
          </CardContent>
        </Card>
        <Card style={s.statCard}>
          <CardContent style={s.statContent}>
            <Text style={[s.statBig, { color: '#eab308' }]}>{stats.pending}</Text>
            <Text style={s.statLabel}>Pending</Text>
          </CardContent>
        </Card>
        <Card style={s.statCard}>
          <CardContent style={s.statContent}>
            <Text style={[s.statBig, { color: '#22c55e' }]}>{stats.approved}</Text>
            <Text style={s.statLabel}>Approved</Text>
          </CardContent>
        </Card>
        <Card style={s.statCard}>
          <CardContent style={s.statContent}>
            <Text style={[s.statBig, { color: colors.primary }]}>{stats.featured}</Text>
            <Text style={s.statLabel}>Featured</Text>
          </CardContent>
        </Card>
        <Card style={s.statCard}>
          <CardContent style={s.statContent}>
            <View style={s.avgRow}>
              <Text style={s.statBig}>{stats.avgRating}</Text>
              <Star size={20} color="#facc15" fill="#facc15" />
            </View>
            <Text style={s.statLabel}>Avg Rating</Text>
          </CardContent>
        </Card>
      </View>

      {/* Export Button */}
      <View style={s.exportRow}>
        <Button
          onPress={exportToCSV}
          disabled={!allTestimonials?.length}
          leftIcon={<Download size={16} color={colors.primaryForeground} />}
        >
          Export CSV
        </Button>
      </View>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="pending">Pending ({pendingTestimonials.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approvedTestimonials.length})</TabsTrigger>
          <TabsTrigger value="featured">Featured ({featuredTestimonials.length})</TabsTrigger>
          <TabsTrigger value="all">All ({allTestimonials?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" style={s.tabContent}>
          {renderTabContent(pendingTestimonials, 'No pending testimonials')}
        </TabsContent>

        <TabsContent value="approved" style={s.tabContent}>
          {renderTabContent(approvedTestimonials, 'No approved testimonials')}
        </TabsContent>

        <TabsContent value="featured" style={s.tabContent}>
          {renderTabContent(featuredTestimonials, 'No featured testimonials')}
        </TabsContent>

        <TabsContent value="all" style={s.tabContent}>
          {renderTabContent(allTestimonials || [], 'No testimonials yet')}
        </TabsContent>
      </Tabs>
    </ScrollView>
  );
}

export default AdminTestimonialManager;

const s = StyleSheet.create({
  container: { padding: spacing.md, gap: spacing.lg },

  // Stats grid (web: grid-cols-2 md:grid-cols-5)
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: { flexGrow: 1, flexBasis: '30%', minWidth: 120 },
  statContent: { paddingTop: spacing.md, alignItems: 'center' },
  statBig: {
    fontFamily: typography.fontFamily.bodyBold,
    fontSize: typography.fontSize['2xl'],
    color: colors.foreground,
  },
  statLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  avgRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  exportRow: { flexDirection: 'row', justifyContent: 'flex-end' },

  tabContent: { marginTop: spacing.md },

  // Testimonial card
  cardMb: { marginBottom: spacing.md },
  cardPt: { paddingTop: spacing.md },
  rowBetween: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  cardLeft: { flex: 1, gap: spacing.sm },
  cardRight: { gap: spacing.sm, alignItems: 'flex-start' },

  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  nameText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  starsRow: { flexDirection: 'row', gap: 2 },

  mutedSm: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  bodySm: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  mutedXs: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  notesBox: {
    backgroundColor: colors.muted,
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  notesText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.foreground,
  },
  notesStrong: { fontFamily: typography.fontFamily.bodyBold },

  featuredRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  xsLabel: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
  },

  notesEditBox: {
    marginTop: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  notesEditBtnRow: { flexDirection: 'row', gap: spacing.sm },

  loadingBox: { padding: spacing.lg, alignItems: 'center' },
  emptyCard: { paddingVertical: spacing.xl, alignItems: 'center' },
});
