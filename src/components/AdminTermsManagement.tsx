// Ported verbatim from Lovable src/components/AdminTermsManagement.tsx
// Web → RN mapping:
//   - Tailwind classes → StyleSheet using @/lib/theme tokens
//   - shadcn/ui imports → @/components/ui/*
//   - lucide-react → lucide-react-native
//   - <AlertDialog> → <Dialog> from @/components/ui/Dialog (AlertDialog not ported yet;
//     Dialog provides equivalent modal confirm UX)
//   - window.location.origin → not available in RN; passed as '' to edge function.
//   - Nested map-scoped dialogs → per-version open state keyed by version id.
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import {
  useTermsVersions,
  useCreateTermsVersion,
  useActivateTermsVersion,
  useDeleteTermsVersion,
  TermsVersion,
} from '@/hooks/useTermsAcceptance';
import { supabase } from '@/integrations/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Plus,
  CheckCircle,
  Trash2,
  AlertTriangle,
  FileText,
} from 'lucide-react-native';
import { format } from 'date-fns';
import { colors, typography, spacing, radius } from '@/lib/theme';

export function AdminTermsManagement() {
  const { data: versions, isLoading } = useTermsVersions();
  const createVersion = useCreateTermsVersion();
  const activateVersion = useActivateTermsVersion();
  const deleteVersion = useDeleteTermsVersion();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [sendingNotifications, setSendingNotifications] = useState(false);
  const [newVersion, setNewVersion] = useState({ version: '', title: '', description: '' });

  // Per-version dialog open state (replaces web's nested AlertDialog scoping).
  const [activateOpenId, setActivateOpenId] = useState<string | null>(null);
  const [deleteOpenId, setDeleteOpenId] = useState<string | null>(null);

  const handleCreateVersion = async () => {
    if (!newVersion.version || !newVersion.title) {
      toast({ title: 'Error', description: 'Version and title are required', variant: 'destructive' });
      return;
    }

    try {
      await createVersion.mutateAsync(newVersion);
      toast({ title: 'Success', description: 'New terms version created' });
      setDialogOpen(false);
      setNewVersion({ version: '', title: '', description: '' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create version',
        variant: 'destructive',
      });
    }
  };

  const handleActivateVersion = async (versionId: string, version: TermsVersion) => {
    try {
      await activateVersion.mutateAsync(versionId);
      toast({
        title: 'Terms Version Activated',
        description: `Version ${version.version} is now active. All users will need to re-accept the terms.`,
      });

      // Send email notifications in the background
      sendNotificationEmails(version);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to activate version',
        variant: 'destructive',
      });
    }
  };

  const sendNotificationEmails = async (version: TermsVersion) => {
    setSendingNotifications(true);
    try {
      const { data, error } = await supabase.functions.invoke('notify-terms-update', {
        body: {
          version: version.version,
          title: version.title,
          description: version.description,
          // window.location.origin is not available in RN; send empty string.
          appUrl: '',
        },
      });

      if (error) {
        console.error('Error sending notifications:', error);
        toast({
          title: 'Notification Warning',
          description: 'Terms activated but some email notifications may have failed.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Notifications Sent',
          description: `Email notifications sent to ${(data as any)?.sent ?? 0} users.`,
        });
      }
    } catch (error: any) {
      console.error('Error invoking notification function:', error);
      toast({
        title: 'Notification Warning',
        description: 'Terms activated but email notifications failed to send.',
        variant: 'destructive',
      });
    } finally {
      setSendingNotifications(false);
    }
  };

  const handleDeleteVersion = async (versionId: string) => {
    try {
      await deleteVersion.mutateAsync(versionId);
      toast({ title: 'Success', description: 'Terms version deleted' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete version',
        variant: 'destructive',
      });
    }
  };

  // Reference to avoid unused-var tsc error while preserving parity with web state.
  void sendingNotifications;

  if (isLoading) {
    return (
      <View style={s.loadingWrap}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <Card>
      <CardHeader>
        <View style={s.headerRow}>
          <View style={s.headerLeft}>
            <CardTitle>
              <View style={s.titleInline}>
                <FileText size={20} color={colors.foreground} />
                <Text style={s.titleText}>Terms of Use Management</Text>
              </View>
            </CardTitle>
            <CardDescription>
              Manage terms versions and require re-acceptance from users
            </CardDescription>
          </View>
          <Button onPress={() => setDialogOpen(true)} style={s.newBtn}>
            <View style={s.btnInline}>
              <Plus size={16} color={colors.primaryForeground} />
              <Text style={s.btnText}>New Version</Text>
            </View>
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Terms Version</DialogTitle>
                <DialogDescription>
                  Create a new version of the Terms of Use. You can activate it later to require all users to re-accept.
                </DialogDescription>
              </DialogHeader>
              <View style={s.formBody}>
                <View style={s.field}>
                  <Label>Version Number *</Label>
                  <Input
                    placeholder="e.g., 2.0"
                    value={newVersion.version}
                    onChangeText={(t) => setNewVersion({ ...newVersion, version: t })}
                  />
                </View>
                <View style={s.field}>
                  <Label>Title *</Label>
                  <Input
                    placeholder="e.g., Terms of Use Update - January 2025"
                    value={newVersion.title}
                    onChangeText={(t) => setNewVersion({ ...newVersion, title: t })}
                  />
                </View>
                <View style={s.field}>
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Brief description of changes in this version..."
                    value={newVersion.description}
                    onChangeText={(t) => setNewVersion({ ...newVersion, description: t })}
                    rows={3}
                  />
                </View>
              </View>
              <DialogFooter>
                <Button variant="outline" onPress={() => setDialogOpen(false)}>
                  <Text style={s.btnOutlineText}>Cancel</Text>
                </Button>
                <Button onPress={handleCreateVersion} disabled={createVersion.isPending}>
                  <View style={s.btnInline}>
                    {createVersion.isPending && (
                      <ActivityIndicator size="small" color={colors.primaryForeground} />
                    )}
                    <Text style={s.btnText}>Create Version</Text>
                  </View>
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </View>
      </CardHeader>
      <CardContent>
        <View style={s.list}>
          {versions?.length === 0 ? (
            <Text style={s.empty}>No terms versions found</Text>
          ) : (
            versions?.map((version) => (
              <View
                key={version.id}
                style={[s.row, version.is_active ? s.rowActive : s.rowInactive]}
              >
                <View style={s.rowInner}>
                  <View style={s.rowLeft}>
                    <View style={s.versionHeader}>
                      <Text style={s.versionName}>Version {version.version}</Text>
                      {version.is_active && (
                        <Badge>
                          <View style={s.badgeInline}>
                            <CheckCircle size={12} color={colors.primaryForeground} />
                            <Text style={s.badgeText}>Active</Text>
                          </View>
                        </Badge>
                      )}
                    </View>
                    <Text style={s.versionTitle}>{version.title}</Text>
                    {version.description ? (
                      <Text style={s.versionDesc}>{version.description}</Text>
                    ) : null}
                    <Text style={s.versionMeta}>
                      Created: {format(new Date(version.created_at), 'PPp')}
                      {version.activated_at
                        ? ` • Activated: ${format(new Date(version.activated_at), 'PPp')}`
                        : ''}
                    </Text>
                  </View>
                  {!version.is_active && (
                    <View style={s.rowActions}>
                      <Button
                        variant="outline"
                        size="sm"
                        onPress={() => setActivateOpenId(version.id)}
                      >
                        <Text style={s.btnOutlineText}>Activate</Text>
                      </Button>
                      <Dialog
                        open={activateOpenId === version.id}
                        onOpenChange={(v) => !v && setActivateOpenId(null)}
                      >
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>
                              <View style={s.titleInline}>
                                <AlertTriangle size={20} color={colors.warning} />
                                <Text style={s.titleText}>
                                  Activate Terms Version {version.version}?
                                </Text>
                              </View>
                            </DialogTitle>
                            <DialogDescription>
                              This will require all users to re-accept the terms before they can continue using the platform. This action affects every registered user.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button variant="outline" onPress={() => setActivateOpenId(null)}>
                              <Text style={s.btnOutlineText}>Cancel</Text>
                            </Button>
                            <Button
                              onPress={() => {
                                setActivateOpenId(null);
                                handleActivateVersion(version.id, version);
                              }}
                            >
                              <View style={s.btnInline}>
                                {activateVersion.isPending && (
                                  <ActivityIndicator size="small" color={colors.primaryForeground} />
                                )}
                                <Text style={s.btnText}>Activate Version</Text>
                              </View>
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>

                      <Pressable
                        onPress={() => setDeleteOpenId(version.id)}
                        style={s.trashBtn}
                        hitSlop={8}
                      >
                        <Trash2 size={16} color={colors.destructive} />
                      </Pressable>
                      <Dialog
                        open={deleteOpenId === version.id}
                        onOpenChange={(v) => !v && setDeleteOpenId(null)}
                      >
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Delete Version {version.version}?</DialogTitle>
                            <DialogDescription>
                              This will permanently delete this terms version. This action cannot be undone.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button variant="outline" onPress={() => setDeleteOpenId(null)}>
                              <Text style={s.btnOutlineText}>Cancel</Text>
                            </Button>
                            <Button
                              variant="destructive"
                              onPress={() => {
                                setDeleteOpenId(null);
                                handleDeleteVersion(version.id);
                              }}
                            >
                              <Text style={s.btnText}>Delete</Text>
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </CardContent>
    </Card>
  );
}

export default AdminTermsManagement;

const s = StyleSheet.create({
  loadingWrap: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  headerRow: { flexDirection: 'column', gap: spacing.md },
  headerLeft: { flex: 1, gap: spacing.xs },
  titleInline: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.foreground,
    fontSize: typography.fontSize.lg,
  },
  btnInline: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  btnText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.primaryForeground,
    fontSize: typography.fontSize.sm,
  },
  btnOutlineText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.foreground,
    fontSize: typography.fontSize.sm,
  },
  newBtn: { alignSelf: 'flex-start' },
  formBody: { gap: spacing.md, paddingVertical: spacing.md },
  field: { gap: spacing.xs },
  list: { gap: spacing.md },
  empty: {
    color: colors.mutedForeground,
    textAlign: 'center',
    paddingVertical: spacing.xl,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
  },
  row: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  rowActive: { borderColor: colors.primary, backgroundColor: 'rgba(231,175,8,0.05)' },
  rowInactive: { borderColor: colors.border },
  rowInner: { flexDirection: 'column', gap: spacing.sm },
  rowLeft: { flex: 1, gap: 4 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  versionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  versionName: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.foreground,
    fontSize: typography.fontSize.base,
  },
  versionTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.foreground,
    fontSize: typography.fontSize.sm,
  },
  versionDesc: {
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
    fontSize: typography.fontSize.sm,
  },
  versionMeta: {
    fontFamily: typography.fontFamily.body,
    color: colors.mutedForeground,
    fontSize: typography.fontSize.xs,
  },
  badgeInline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  badgeText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.primaryForeground,
    fontSize: typography.fontSize.xs,
  },
  trashBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
});
