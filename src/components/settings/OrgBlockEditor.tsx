// OrgBlockEditor — RN port of Lovable web src/components/settings/OrgBlockEditor.tsx (203 LOC).
// Universal organization editor for non-athlete roles. Persists to role-specific
// profile tables; share cards read from these fields.
//   - coach_profiles (is_club_coach false) → College Coach
//   - coach_profiles (is_club_coach true)  → Club Coach
//   - high_school_coach_profiles           → HS Coach
//   - scout_profiles (no organization_id)  → Independent Scout
//   - scout_profiles (+scout_organizations) → Agency
//
// Web→RN translation:
//   - shadcn Card/Input/Label/Button → local ui primitives
//   - useToast → Alert.alert
//   - lucide-react → lucide-react-native
import React, { useEffect, useState } from 'react';
import { View, Text, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2 } from 'lucide-react-native';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCoachProfile } from '@/hooks/useCoachProfile';
import { useScoutProfile } from '@/hooks/useScoutProfile';
import { useHSCoachProfile } from '@/hooks/useHSCoachProfile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { colors, spacing } from '@/lib/theme';

type Surface = 'coach' | 'club_coach' | 'hs_coach' | 'scout' | 'agency';

export function OrgBlockEditor() {
  const { user } = useAuth();
  const { data: coach } = useCoachProfile();
  const { data: scout } = useScoutProfile();
  const { data: hs } = useHSCoachProfile();
  const queryClient = useQueryClient();

  const { data: scoutOrg } = useQuery({
    queryKey: ['org-block-scout-org', (scout as any)?.organization_id],
    queryFn: async () => {
      const orgId = (scout as any)?.organization_id;
      if (!orgId) return null;
      const { data } = await supabase
        .from('scout_organizations' as any)
        .select('id, name, website_url')
        .eq('id', orgId)
        .maybeSingle();
      return data;
    },
    enabled: !!(scout as any)?.organization_id,
  });

  const surface: Surface | null = hs
    ? 'hs_coach'
    : coach
      ? ((coach as any).is_club_coach ? 'club_coach' : 'coach')
      : scout
        ? ((scout as any).organization_id ? 'agency' : 'scout')
        : null;

  const [orgName, setOrgName] = useState('');
  const [orgRole, setOrgRole] = useState('');
  const [orgWebsite, setOrgWebsite] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!surface) return;
    if (surface === 'hs_coach' && hs) {
      setOrgName((hs as any).school_name || '');
      setOrgRole((hs as any).org_role_title || (hs as any).title || '');
      setOrgWebsite((hs as any).org_website || (hs as any).website || '');
    } else if ((surface === 'coach' || surface === 'club_coach') && coach) {
      setOrgName((coach as any).org_name || (coach as any).school || '');
      setOrgRole((coach as any).org_role_title || (coach as any).title || '');
      setOrgWebsite((coach as any).org_website || '');
    } else if (surface === 'scout' && scout) {
      setOrgName((scout as any).org_name || (scout as any).company || '');
      setOrgRole((scout as any).org_role_title || (scout as any).title || '');
      setOrgWebsite((scout as any).org_website || '');
    } else if (surface === 'agency' && scout) {
      setOrgName((scoutOrg as any)?.name || (scout as any).company || '');
      setOrgRole((scout as any).org_role_title || (scout as any).title || '');
      setOrgWebsite((scoutOrg as any)?.website_url || (scout as any).org_website || '');
    }
  }, [surface, coach, scout, hs, scoutOrg]);

  if (!user || !surface) return null;

  const surfaceLabels: Record<Surface, { title: string; orgLabel: string; description: string }> = {
    coach: {
      title: 'Organization (College Program)',
      orgLabel: 'School / Program',
      description: 'Shown on your share card and public profile.',
    },
    club_coach: {
      title: 'Organization (Club / Travel Team)',
      orgLabel: 'Club Name',
      description: 'Appears on your share card and team listing.',
    },
    hs_coach: {
      title: 'Organization (High School Program)',
      orgLabel: 'School Name',
      description: 'Shown on your share card and roster pages.',
    },
    scout: {
      title: 'Organization (Independent Scout)',
      orgLabel: 'Company / Brand',
      description: 'Optional — appears on your share card.',
    },
    agency: {
      title: 'Organization (Agency)',
      orgLabel: 'Agency Name',
      description: 'Shown on your share card and across the agency dashboard.',
    },
  };
  const meta = surfaceLabels[surface];

  const handleSave = async () => {
    setSaving(true);
    try {
      if (surface === 'hs_coach' && hs) {
        const { error } = await supabase
          .from('high_school_coach_profiles' as any)
          .update({
            school_name: orgName.trim(),
            org_role_title: orgRole.trim() || null,
            org_website: orgWebsite.trim() || null,
          })
          .eq('user_id', user.id);
        if (error) throw error;
      } else if ((surface === 'coach' || surface === 'club_coach') && coach) {
        const { error } = await supabase
          .from('coach_profiles' as any)
          .update({
            org_name: orgName.trim() || null,
            org_role_title: orgRole.trim() || null,
            org_website: orgWebsite.trim() || null,
          })
          .eq('user_id', user.id);
        if (error) throw error;
      } else if ((surface === 'scout' || surface === 'agency') && scout) {
        const { error } = await supabase
          .from('scout_profiles' as any)
          .update({
            org_name: orgName.trim() || null,
            org_role_title: orgRole.trim() || null,
            org_website: orgWebsite.trim() || null,
          })
          .eq('user_id', user.id);
        if (error) throw error;
        if (surface === 'agency' && (scoutOrg as any)?.id) {
          await supabase
            .from('scout_organizations' as any)
            .update({ name: orgName.trim(), website_url: orgWebsite.trim() || null })
            .eq('id', (scoutOrg as any).id);
        }
      }
      Alert.alert('Organization updated', 'Your share card now reflects these details.');
      queryClient.invalidateQueries();
    } catch (e: any) {
      Alert.alert('Could not save', e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <View style={s.titleRow}>
          <Building2 size={20} color={colors.primary} />
          <CardTitle>{meta.title}</CardTitle>
        </View>
        <CardDescription>{meta.description}</CardDescription>
      </CardHeader>
      <CardContent style={s.body}>
        <View style={s.field}>
          <Label>{meta.orgLabel}</Label>
          <Input value={orgName} onChangeText={setOrgName} placeholder={meta.orgLabel} />
        </View>
        <View style={s.field}>
          <Label>Your Role / Title</Label>
          <Input
            value={orgRole}
            onChangeText={setOrgRole}
            placeholder="e.g. Head Coach, Director, Lead Scout"
          />
        </View>
        <View style={s.field}>
          <Label>Website</Label>
          <Input
            value={orgWebsite}
            onChangeText={setOrgWebsite}
            placeholder="https://example.com"
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>
        <Button onPress={handleSave} disabled={saving}>
          {saving ? (
            <View style={s.savingRow}>
              <ActivityIndicator size="small" color={colors.primaryForeground} />
              <Text style={{ color: colors.primaryForeground, marginLeft: 8 }}>Saving…</Text>
            </View>
          ) : (
            'Save Organization'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

export default OrgBlockEditor;

const s = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  body: { gap: spacing.md },
  field: { gap: spacing.xs },
  savingRow: { flexDirection: 'row', alignItems: 'center' },
});
