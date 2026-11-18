/**
 * InfluencerScheduleQueue — RN port of Lovable web component.
 * Source: offerhound-repo/src/components/influencer/InfluencerScheduleQueue.tsx
 *
 * Translations applied:
 *  - <Card>/<CardHeader>/<CardTitle>/<CardDescription>/<CardContent> → RN ui primitives
 *  - <Badge variant="destructive"|"outline"|"secondary"> → RN ui Badge
 *  - shadcn <Button size="icon" variant="ghost"> → RN ui Button (size="icon")
 *  - lucide-react → lucide-react-native
 *  - sonner toast → '@/components/ui/toast' wrapper
 *  - <p>/<div> → <View>/<Text>
 *  - Tailwind grid md:grid-cols-2 → vertical stack on mobile (single column)
 *  - line-clamp-2 → numberOfLines={2}
 *  - hooks (useScheduledPosts/useDeleteScheduledPost) preserved verbatim
 *  - date-fns format/isPast preserved (works in RN)
 */
import React from 'react';
import { Alert, View, Text, StyleSheet } from 'react-native';
import { format, isPast } from 'date-fns';
import { Calendar, Clock, Trash2, FileText } from 'lucide-react-native';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/toast';
import { useScheduledPosts, useDeleteScheduledPost } from '@/hooks/useInfluencerHootsuite';
import { colors, typography, spacing, radius } from '@/lib/theme';

export function InfluencerScheduleQueue({ influencerId, onEdit }: { influencerId: string; onEdit?:(post:any)=>void }) {
  const { data: posts = [], isLoading: contentLoading, isError: contentFailed, refetch: retryContent } = useScheduledPosts(influencerId);
  const remove = useDeleteScheduledPost();

  const scheduled = (posts as any[]).filter((p: any) => p.post_status === 'scheduled');
  const failed = (posts as any[]).filter((p:any)=>p.post_status === 'failed');
  const drafts = (posts as any[]).filter((p: any) => p.post_status === 'draft');

  const confirmedRemove = async (id: string) => {
    try {
      await remove.mutateAsync({ id, influencerId });
      toast.success('Removed');
    } catch (error:any) {toast.error(error.message || 'Removal was not confirmed.');}
  };

  const handleRemove = (id:string) => Alert.alert('Remove this queued post?','This removes the saved post from your queue.',[{text:'Cancel',style:'cancel'},{text:'Remove',style:'destructive',onPress:()=>void confirmedRemove(id)}]);

  if (contentFailed) return <Button onPress={() => void retryContent()}>Could not load creator content. Retry</Button>;
  if (contentLoading) return <Text>Loading creator content…</Text>;

  return (
    <View style={s.stack}>
      {failed.length ? <Card><CardHeader><CardTitle>Didn't publish ({failed.length})</CardTitle></CardHeader><CardContent>{failed.map((p:any)=><View key={p.id}><Text>{p.title}</Text><Text>Publication was not confirmed.</Text>{onEdit?<Button onPress={()=>onEdit(p)}>Edit failed post</Button>:null}<Button variant="outline" disabled={remove.isPending} onPress={()=>handleRemove(p.id)}>Remove failed post</Button></View>)}</CardContent></Card> : null}
      <Card>
        <CardHeader>
          <CardTitle>
            <View style={s.titleRow}>
              <Clock size={20} color={colors.primary} />
              <Text style={s.titleText}>Scheduled ({scheduled.length})</Text>
            </View>
          </CardTitle>
          <CardDescription>Queued posts waiting to publish.</CardDescription>
        </CardHeader>
        <CardContent>
          <View style={s.list}>
            {scheduled.length === 0 ? (
              <Text style={s.empty}>Nothing scheduled.</Text>
            ) : (
              scheduled.map((p: any) => {
                const overdue = !!p.scheduled_for && isPast(new Date(p.scheduled_for));
                return (
                  <View key={p.id} style={s.row}>
                    <View style={s.rowMain}>
                      <Text style={s.itemTitle} numberOfLines={1}>
                        {p.title}
                      </Text>
                      <Text style={s.itemDesc} numberOfLines={2}>
                        {p.description}
                      </Text>
                      <View style={s.badgeRow}>
                        {p.scheduled_for && (
                          <Badge variant={overdue ? 'destructive' : 'outline'}>
                            <View style={s.badgeInner}>
                              <Calendar size={12} color={colors.foreground} />
                              <Text style={s.badgeText}>
                                {format(new Date(p.scheduled_for), 'MMM d, h:mm a')}
                              </Text>
                            </View>
                          </Badge>
                        )}
                        {(p.syndication_targets || []).includes('webhook') && (
                          <Badge variant="secondary">
                            <Text style={s.badgeText}>Auto-syndicate</Text>
                          </Badge>
                        )}
                      </View>
                      {overdue && (
                        <Text style={s.overdueText}>
                          Past schedule time — publication has not been confirmed.
                        </Text>
                      )}
                    </View>
                    {onEdit ? <Button size="sm" variant="outline" onPress={()=>onEdit(p)}>Edit</Button> : null}
                    <Button size="icon" variant="ghost" disabled={remove.isPending} onPress={() => void handleRemove(p.id)}>
                      <Trash2 size={16} color={colors.foreground} />
                    </Button>
                  </View>
                );
              })
            )}
          </View>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <View style={s.titleRow}>
              <FileText size={20} color={colors.primary} />
              <Text style={s.titleText}>Drafts ({drafts.length})</Text>
            </View>
          </CardTitle>
          <CardDescription>Saved but not scheduled. Edit and publish anytime.</CardDescription>
        </CardHeader>
        <CardContent>
          <View style={s.list}>
            {drafts.length === 0 ? (
              <Text style={s.empty}>No drafts.</Text>
            ) : (
              drafts.map((p: any) => (
                <View key={p.id} style={s.row}>
                  <View style={s.rowMain}>
                    <Text style={s.itemTitle} numberOfLines={1}>
                      {p.title}
                    </Text>
                    <Text style={s.itemDesc} numberOfLines={2}>
                      {p.description}
                    </Text>
                  </View>
                  {onEdit ? <Button size="sm" variant="outline" onPress={()=>onEdit(p)}>Edit</Button> : null}
                    <Button size="icon" variant="ghost" disabled={remove.isPending} onPress={() => void handleRemove(p.id)}>
                    <Trash2 size={16} color={colors.foreground} />
                  </Button>
                </View>
              ))
            )}
          </View>
        </CardContent>
      </Card>
    </View>
  );
}

export default InfluencerScheduleQueue;

const s = StyleSheet.create({
  stack: { gap: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.foreground,
    fontSize: typography.fontSize.lg,
  },
  list: { gap: spacing.sm },
  empty: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    paddingVertical: spacing.md,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm + 4,
    padding: spacing.sm + 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'flex-start',
  },
  rowMain: { flex: 1, minWidth: 0 },
  itemTitle: {
    fontFamily: typography.fontFamily.bodyMedium,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  itemDesc: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  badgeInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  badgeText: {
    fontFamily: typography.fontFamily.body,
    fontSize: 10,
    color: colors.foreground,
  },
  overdueText: {
    fontFamily: typography.fontFamily.body,
    fontSize: 10,
    color: colors.destructive,
    marginTop: 4,
  },
});
