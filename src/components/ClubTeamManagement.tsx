import { useState, useRef, useCallback } from "react";
import { View, Text, ScrollView, Pressable, Platform, Alert } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Avatar } from "@/components/ui/Avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/Dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { TeamRosterAthleteCard } from "@/components/club/TeamRosterAthleteCard";
import { ClubTransferRequests } from "@/components/club/ClubTransferRequests";
import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/hooks/use-toast";
import { useLetterCenter } from "@/hooks/useLetterCenter";
import {
  Users, UserPlus, Loader2, Shield, Edit, Copy, Archive, Mail, Upload,
  ChevronRight, ArrowLeft, Plus, CheckCircle2, Link2, Eye, AlertTriangle,
} from "lucide-react-native";
import { colors, typography, spacing } from "@/lib/theme";

interface ClubTeamManagementProps {
  /** Required when used by a Club Coach. Omit when hsCoachProfileId is set. */
  clubProfileId?: string;
  userId: string;
  /** When set, this component is being used by an HS Coach. Team creation
   * will set level='high_school' and hs_coach_profile_id instead of
   * club_coach_id. club_coach_id will be omitted. */
  hsCoachProfileId?: string;
}

const SPORTS = ["football","basketball","baseball","soccer","softball","volleyball","track","swimming","tennis","golf","lacrosse","wrestling","hockey"];
const GENDERS = ["male", "female", "coed"];
const LEVELS = ["recreational", "competitive", "elite", "academy", "select", "travel", "premier"];

type TeamFormData = {
  name: string; sport: string; gender: string; age_group: string;
  graduation_year: string; level: string; season: string; league: string; description: string;
  recruiting_enabled: boolean;
};

const emptyTeamForm: TeamFormData = {
  name: "", sport: "football", gender: "coed", age_group: "",
  graduation_year: "", level: "competitive", season: "", league: "", description: "",
  recruiting_enabled: false,
};

type RosterEntry = {
  athlete_name: string; athlete_email: string; position: string;
  jersey_number: string; school: string; graduation_year: string;
  date_of_birth: string; parent_name: string; parent_email: string; parent_phone: string;
  zorts_registration_url: string;
};

/** Returns age in whole years from a YYYY-MM-DD string, or null if unparseable. */
function computeAge(dob: string): number | null {
  if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

/** True when DOB string represents an athlete under 13. */
function isUnder13(dob: string): boolean {
  const age = computeAge(dob);
  return age !== null && age < 13;
}

const emptyRosterEntry: RosterEntry = {
  athlete_name: "", athlete_email: "", position: "", jersey_number: "",
  school: "", graduation_year: "", date_of_birth: "", parent_name: "", parent_email: "", parent_phone: "",
  zorts_registration_url: "",
};

export function ClubTeamManagement({ clubProfileId, userId, hsCoachProfileId }: ClubTeamManagementProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const csvInputRef = useRef<HTMLInputElement | null>(null);
  const { goToLetterForAthlete } = useLetterCenter();

  // View state
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [showTeamDialog, setShowTeamDialog] = useState(false);
  const [showRosterDialog, setShowRosterDialog] = useState(false);
  const [showStaffDialog, setShowStaffDialog] = useState(false);
  const [showParentInviteDialog, setShowParentInviteDialog] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [teamForm, setTeamForm] = useState<TeamFormData>(emptyTeamForm);
  const [rosterForm, setRosterForm] = useState<RosterEntry>(emptyRosterEntry);
  const [staffForm, setStaffForm] = useState({ name: "", email: "", role: "assistant_coach" });
  const [parentInviteEmail, setParentInviteEmail] = useState("");
  const [selectedRosterId, setSelectedRosterId] = useState<string | null>(null);
  const [rosterTab, setRosterTab] = useState("roster");
  // Minor-Safe: when the coach enters a DOB that makes the athlete under-13,
  // collapse the form to name + DOB + parent email only.
  const rosterDobIsUnder13 = isUnder13(rosterForm.date_of_birth);

  // Fetch teams
  const { data: teams = [], isLoading } = useQuery({
    queryKey: ["club-teams", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .eq("coach_user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch roster for selected team
  const { data: roster = [] } = useQuery({
    queryKey: ["club-roster", selectedTeamId],
    queryFn: async () => {
      if (!selectedTeamId) return [];
      const { data, error } = await supabase
        .from("team_rosters")
        .select("*, player_profiles:athlete_profile_id(profile_image_url, full_name)")
        .eq("team_id", selectedTeamId)
        .neq("status", "removed")
        .order("athlete_name");
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedTeamId,
  });

  // Fetch staff for selected team
  const { data: staff = [] } = useQuery({
    queryKey: ["club-staff", selectedTeamId],
    queryFn: async () => {
      if (!selectedTeamId) return [];
      const { data } = await supabase
        .from("team_staff")
        .select("*")
        .eq("team_id", selectedTeamId)
        .order("created_at");
      return data || [];
    },
    enabled: !!selectedTeamId,
  });

  // Fetch club profile
  const { data: clubProfile } = useQuery({
    queryKey: ["club-profile", clubProfileId],
    queryFn: async () => {
      const { data } = await supabase
        .from("club_coach_profiles")
        .select("*")
        .eq("id", clubProfileId)
        .maybeSingle();
      return data;
    },
  });

  // Roster counts per team
  const teamIds = teams.map((t: any) => t.id);
  const { data: rosterCounts = {} } = useQuery({
    queryKey: ["club-roster-counts", teamIds],
    queryFn: async () => {
      if (teamIds.length === 0) return {};
      const counts: Record<string, number> = {};
      for (const id of teamIds) {
        const { count } = await supabase
          .from("team_rosters")
          .select("*", { count: "exact", head: true })
          .eq("team_id", id)
          .neq("status", "removed");
        counts[id] = count || 0;
      }
      return counts;
    },
    enabled: teamIds.length > 0,
  });

  // ========== MUTATIONS ==========
  const createTeam = useMutation({
    mutationFn: async (form: TeamFormData) => {
      const isHsCoach = !!hsCoachProfileId;
      const { error } = await supabase.from("teams").insert({
        ...(isHsCoach
          ? { hs_coach_profile_id: hsCoachProfileId }
          : { club_coach_id: clubProfileId }),
        coach_user_id: userId,
        name: form.name,
        sport: form.sport || (clubProfile as any)?.sport || "football",
        gender: form.gender || null,
        age_group: form.age_group || null,
        graduation_year: form.graduation_year ? parseInt(form.graduation_year) : null,
        level: isHsCoach ? "high_school" : (form.level || "club"),
        season: form.season || null,
        league: form.league || null,
        description: form.description || null,
        recruiting_enabled: isHsCoach ? false : (form.recruiting_enabled ?? false),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["club-teams"] });
      toast({ title: "Team Created" });
      setShowTeamDialog(false);
      setTeamForm(emptyTeamForm);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateTeam = useMutation({
    mutationFn: async ({ id, form }: { id: string; form: TeamFormData }) => {
      const { error } = await supabase.from("teams").update({
        name: form.name,
        sport: form.sport,
        gender: form.gender || null,
        age_group: form.age_group || null,
        graduation_year: form.graduation_year ? parseInt(form.graduation_year) : null,
        level: form.level || "club",
        season: form.season || null,
        league: form.league || null,
        description: form.description || null,
        recruiting_enabled: form.recruiting_enabled ?? false,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["club-teams"] });
      toast({ title: "Team Updated" });
      setShowTeamDialog(false);
      setEditingTeamId(null);
      setTeamForm(emptyTeamForm);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const archiveTeam = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("teams").update({ status: "archived", is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["club-teams"] });
      toast({ title: "Team Archived" });
      if (selectedTeamId) setSelectedTeamId(null);
    },
  });

  const duplicateTeam = useMutation({
    mutationFn: async (team: any) => {
      const isHsCoach = !!hsCoachProfileId;
      const { error } = await supabase.from("teams").insert({
        ...(isHsCoach
          ? { hs_coach_profile_id: hsCoachProfileId }
          : { club_coach_id: clubProfileId }),
        coach_user_id: userId,
        name: `${team.name} (Copy)`,
        sport: team.sport,
        gender: team.gender,
        age_group: team.age_group,
        level: isHsCoach ? "high_school" : team.level,
        league: team.league,
        description: team.description,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["club-teams"] });
      toast({ title: "Team Duplicated", description: "Roster was not copied. Add athletes to the new team." });
    },
  });

  const addRosterEntry = useMutation({
    mutationFn: async (entry: RosterEntry) => {
      if (!selectedTeamId) throw new Error("No team selected");
      // Minor-Safe: under-13 athletes must be added by a parent.
      // Belt-and-suspenders: the DB trigger also enforces this, but we block
      // here first so the coach sees a clear, actionable error immediately.
      if (isUnder13(entry.date_of_birth)) {
        if (!entry.parent_email) {
          throw new Error(
            "Athletes under 13 cannot be added directly by a coach. " +
            "Please enter the parent's email address — we will invite the parent " +
            "to create the athlete's profile."
          );
        }
        // Allowed: create a minimal invite-only row so the parent invite flow fires.
        // Only name + DOB + parent_email are persisted; all other fields are stripped.
        const { data: inserted, error } = await supabase.from("team_rosters").insert({
          team_id: selectedTeamId,
          athlete_name: entry.athlete_name,
          date_of_birth: entry.date_of_birth,
          parent_email: entry.parent_email,
          parent_name: entry.parent_name || null,
          parent_phone: entry.parent_phone || null,
          status: "parent_pending",
          invite_method: "manual",
        }).select("id").single();
        if (error) throw error;
        try {
          const { error: inviteErr } = await supabase.functions.invoke(
            "invite-club-athlete",
            { body: { rosterId: (inserted as any).id } },
          );
          if (inviteErr) console.warn("Invite send warning:", inviteErr);
        } catch (e) {
          console.warn("Invite send failed (roster row still created):", e);
        }
        return { under13: true };
      }
      const { data: inserted, error } = await supabase.from("team_rosters").insert({
        team_id: selectedTeamId,
        athlete_name: entry.athlete_name,
        athlete_email: entry.athlete_email || null,
        position: entry.position || null,
        jersey_number: entry.jersey_number || null,
        school: entry.school || null,
        graduation_year: entry.graduation_year ? parseInt(entry.graduation_year) : null,
        date_of_birth: entry.date_of_birth || null,
        parent_name: entry.parent_name || null,
        parent_email: entry.parent_email || null,
        parent_phone: entry.parent_phone || null,
        zorts_registration_url: entry.zorts_registration_url || null,
        status: "invited",
        invite_method: "manual",
      }).select("id").single();
      if (error) throw error;

      try {
        const { data: inviteResult, error: inviteErr } = await supabase.functions.invoke(
          "invite-club-athlete",
          { body: { rosterId: (inserted as any).id } },
        );
        if (inviteErr) console.warn("Invite send warning:", inviteErr);
        return inviteResult;
      } catch (e) {
        console.warn("Invite send failed (roster row still created):", e);
        return null;
      }
    },
    onSuccess: (result: any) => {
      if (result?.under13) {
        queryClient.invalidateQueries({ queryKey: ["club-roster", selectedTeamId] });
        queryClient.invalidateQueries({ queryKey: ["club-roster-counts"] });
        toast({
          title: "Parent invite sent",
          description:
            "This athlete is under 13. We have invited the parent to create the profile — " +
            "no athlete data has been stored beyond name, date of birth, and parent contact.",
        });
        setShowRosterDialog(false);
        setRosterForm(emptyRosterEntry);
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["club-roster", selectedTeamId] });
      queryClient.invalidateQueries({ queryKey: ["club-roster-counts"] });
      const sent = result?.results?.filter((r: any) => r.success).length || 0;
      toast({
        title: "Athlete Added",
        description: sent > 0
          ? `Profile created. ${sent} invitation${sent > 1 ? "s" : ""} sent.`
          : "Profile created. Add contact info to send invites.",
      });
      setShowRosterDialog(false);
      setRosterForm(emptyRosterEntry);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const resendInvite = useMutation({
    mutationFn: async (rosterId: string) => {
      const { data, error } = await supabase.functions.invoke("invite-club-athlete", {
        body: { rosterId, resend: true },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (result: any) => {
      const sent = result?.results?.filter((r: any) => r.success).length || 0;
      toast({
        title: sent > 0 ? "Invitation Sent" : "No Invites Sent",
        description: sent > 0
          ? `${sent} invitation${sent > 1 ? "s" : ""} delivered.`
          : "Add an athlete or parent email/phone first.",
        variant: sent > 0 ? "default" : "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ["club-roster", selectedTeamId] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const removeRosterEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("team_rosters").update({ status: "removed", removed_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["club-roster", selectedTeamId] });
      queryClient.invalidateQueries({ queryKey: ["club-roster-counts"] });
      toast({ title: "Athlete Removed" });
    },
  });

  const toggleZorts = useMutation({
    mutationFn: async ({ id, table, completed, url }: { id: string; table: "team_rosters" | "team_staff"; completed?: boolean; url?: string }) => {
      const payload: any = {};
      if (completed !== undefined) payload.zorts_completed = completed;
      if (url !== undefined) payload.zorts_registration_url = url;
      const { error } = await supabase.from(table).update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["club-roster", selectedTeamId] });
      queryClient.invalidateQueries({ queryKey: ["club-staff", selectedTeamId] });
      toast({ title: "Zorts Status Updated" });
    },
  });

  const addStaff = useMutation({
    mutationFn: async (s: { name: string; email: string; role: string }) => {
      if (!selectedTeamId) throw new Error("No team selected");
      const { error } = await supabase.from("team_staff").insert({
        team_id: selectedTeamId,
        name: s.name,
        email: s.email,
        role: s.role,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["club-staff", selectedTeamId] });
      toast({ title: "Staff Member Added" });
      setShowStaffDialog(false);
      setStaffForm({ name: "", email: "", role: "assistant_coach" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const sendParentInvite = useMutation({
    mutationFn: async ({ rosterId, email }: { rosterId: string; email: string }) => {
      const { error } = await supabase.from("team_rosters").update({
        parent_email: email,
        status: "parent_pending",
      }).eq("id", rosterId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["club-roster", selectedTeamId] });
      toast({ title: "Parent Invite Sent", description: "Parent has been notified for approval." });
      setShowParentInviteDialog(false);
      setParentInviteEmail("");
      setSelectedRosterId(null);
    },
  });

  // CSV upload handler (RN via DocumentPicker)
  // Minor-Safe: under-13 rows detected in the CSV are rejected before any DB insert.
  const handleCSVUpload = async () => {
    if (!selectedTeamId) return;
    const result = await DocumentPicker.getDocumentAsync({ type: "text/csv", copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];

    let text = "";
    try {
      const res = await fetch(asset.uri);
      text = await res.text();
    } catch (e: any) {
      toast({ title: "Upload Error", description: e.message, variant: "destructive" });
      return;
    }

    const lines = text.split("\n").filter(l => l.trim());
    if (lines.length < 2) { toast({ title: "Invalid CSV", variant: "destructive" }); return; }

    const headers = lines[0].toLowerCase().split(",").map(h => h.trim());
    const nameIdx = headers.findIndex(h => h.includes("name"));
    const emailIdx = headers.findIndex(h => h.includes("email") && !h.includes("parent"));
    const posIdx = headers.findIndex(h => h.includes("position"));
    const jerseyIdx = headers.findIndex(h => h.includes("jersey") || h.includes("number"));
    const schoolIdx = headers.findIndex(h => h.includes("school"));
    const gradIdx = headers.findIndex(h => h.includes("grad"));
    const parentEmailIdx = headers.findIndex(h => h.includes("parent") && h.includes("email"));
    const parentNameIdx = headers.findIndex(h => h.includes("parent") && h.includes("name"));
    const parentPhoneIdx = headers.findIndex(h => h.includes("parent") && h.includes("phone"));

    if (nameIdx < 0) { toast({ title: "CSV must have a 'name' column", variant: "destructive" }); return; }

    // Minor-Safe: parse DOB column index before mapping rows
    const dobIdx = headers.findIndex(h => h.includes("dob") || (h.includes("date") && h.includes("birth")));

    const allParsed = lines.slice(1).map((line, lineNum) => {
      const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
      const dob = dobIdx >= 0 ? (cols[dobIdx] || "") : "";
      return {
        lineNum: lineNum + 2, // 1-based, +1 for header
        dob,
        under13: isUnder13(dob),
        row: {
          team_id: selectedTeamId!,
          athlete_name: cols[nameIdx] || "",
          athlete_email: emailIdx >= 0 ? cols[emailIdx] || null : null,
          position: posIdx >= 0 ? cols[posIdx] || null : null,
          jersey_number: jerseyIdx >= 0 ? cols[jerseyIdx] || null : null,
          school: schoolIdx >= 0 ? cols[schoolIdx] || null : null,
          graduation_year: gradIdx >= 0 && cols[gradIdx] ? parseInt(cols[gradIdx]) : null,
          date_of_birth: dob || null,
          parent_email: parentEmailIdx >= 0 ? cols[parentEmailIdx] || null : null,
          parent_name: parentNameIdx >= 0 ? cols[parentNameIdx] || null : null,
          parent_phone: parentPhoneIdx >= 0 ? cols[parentPhoneIdx] || null : null,
          status: "invited" as const,
          invite_method: "csv" as const,
        },
      };
    }).filter(r => r.row.athlete_name);

    // Reject under-13 rows: block the entire upload and report which rows need fixing
    const blockedRows = allParsed.filter(r => r.under13);
    if (blockedRows.length > 0) {
      const names = blockedRows
        .map(r => `Row ${r.lineNum}: ${r.row.athlete_name} (DOB ${r.dob})`)
        .join("\n");
      Alert.alert(
        "Under-13 athletes in CSV",
        `${blockedRows.length} row(s) appear to be under 13 and cannot be imported directly by a coach.\n\n${names}\n\nRemove these rows and re-upload, then add each under-13 athlete manually using the 'Add Athlete' button — you will be prompted to invite the parent instead.`,
        [{ text: "OK" }],
      );
      return;
    }

    const rows = allParsed.map(r => r.row);
    if (rows.length === 0) { toast({ title: "No valid rows found", variant: "destructive" }); return; }

    const { error } = await supabase.from("team_rosters").insert(rows);
    if (error) {
      toast({ title: "Upload Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${rows.length} Athletes Imported` });
      queryClient.invalidateQueries({ queryKey: ["club-roster", selectedTeamId] });
      queryClient.invalidateQueries({ queryKey: ["club-roster-counts"] });
    }
  };

  const openEditTeam = (team: any) => {
    setEditingTeamId(team.id);
    setTeamForm({
      name: team.name || "",
      sport: team.sport || "football",
      gender: team.gender || "coed",
      age_group: team.age_group || "",
      graduation_year: team.graduation_year?.toString() || "",
      level: team.level || "competitive",
      season: team.season || "",
      league: team.league || "",
      description: team.description || "",
      recruiting_enabled: !!(team.recruiting_enabled),
    });
    setShowTeamDialog(true);
  };

  const selectedTeam = teams.find((t: any) => t.id === selectedTeamId);
  const activeTeams = teams.filter((t: any) => t.status !== "archived");
  const archivedTeams = teams.filter((t: any) => t.status === "archived");
  const totalAthletes = Object.values(rosterCounts).reduce((a: number, b: any) => a + (b as number), 0);
  const pendingParentCount = roster.filter((r: any) => r.status === "parent_pending").length;

  // ========== TEAM DETAIL VIEW ==========
  if (selectedTeamId && selectedTeam) {
    return (
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.lg }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
          <Button variant="ghost" size="sm" onPress={() => setSelectedTeamId(null)} leftIcon={<ArrowLeft size={16} color={colors.foreground} />}>Back</Button>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.bodySemiBold, color: colors.foreground }}>{(selectedTeam as any).name}</Text>
            <View style={{ flexDirection: "row", gap: spacing.xs, marginTop: 4, flexWrap: "wrap" }}>
              <Badge variant="outline">{(selectedTeam as any).sport}</Badge>
              {(selectedTeam as any).level && <Badge variant="secondary">{(selectedTeam as any).level}</Badge>}
              {(selectedTeam as any).gender && <Badge variant="outline">{(selectedTeam as any).gender}</Badge>}
              {(selectedTeam as any).age_group && <Badge variant="outline">{(selectedTeam as any).age_group}</Badge>}
              {(selectedTeam as any).league && <Badge variant="outline">{(selectedTeam as any).league}</Badge>}
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: spacing.xs }}>
            <Button size="sm" variant="outline" onPress={() => openEditTeam(selectedTeam)} leftIcon={<Edit size={12} color={colors.foreground} />}>Edit</Button>
            <Button size="sm" variant="outline" onPress={() => archiveTeam.mutate((selectedTeam as any).id)} leftIcon={<Archive size={12} color={colors.foreground} />}>Archive</Button>
          </View>
        </View>

        {/* Stats row */}
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <Card style={{ flex: 1 }}><CardContent style={{ paddingVertical: spacing.sm, alignItems: "center" }}><Text style={{ fontSize: typography.fontSize["2xl"], fontFamily: typography.fontFamily.bodySemiBold, color: colors.foreground }}>{roster.length}</Text><Text style={{ fontSize: typography.fontSize.xs, color: colors.mutedForeground }}>Athletes</Text></CardContent></Card>
          <Card style={{ flex: 1 }}><CardContent style={{ paddingVertical: spacing.sm, alignItems: "center" }}><Text style={{ fontSize: typography.fontSize["2xl"], fontFamily: typography.fontFamily.bodySemiBold, color: colors.foreground }}>{staff.length}</Text><Text style={{ fontSize: typography.fontSize.xs, color: colors.mutedForeground }}>Staff</Text></CardContent></Card>
          <Card style={{ flex: 1 }}><CardContent style={{ paddingVertical: spacing.sm, alignItems: "center" }}><Text style={{ fontSize: typography.fontSize["2xl"], fontFamily: typography.fontFamily.bodySemiBold, color: colors.foreground }}>{pendingParentCount}</Text><Text style={{ fontSize: typography.fontSize.xs, color: colors.mutedForeground }}>Parent Pending</Text></CardContent></Card>
        </View>

        {/* recruiting_enabled toggle — club coaches only */}
        {!hsCoachProfileId && (
          <Card>
            <CardContent style={{ paddingVertical: spacing.sm, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Eye size={14} color={colors.primary} />
                  <Text style={{ fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground }}>Visible to HS coaches</Text>
                </View>
                <Text style={{ fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground, marginTop: 2 }}>
                  Athletes on this team can be discovered and claimed by high school coaches.
                </Text>
              </View>
              <Switch
                value={!!(selectedTeam as any).recruiting_enabled}
                onValueChange={async (val: boolean) => {
                  await supabase.from("teams").update({ recruiting_enabled: val }).eq("id", (selectedTeam as any).id);
                  queryClient.invalidateQueries({ queryKey: ["club-teams"] });
                }}
              />
            </CardContent>
          </Card>
        )}

        <Tabs value={rosterTab} onValueChange={setRosterTab}>
          <TabsList>
            <TabsTrigger value="roster">Roster ({roster.length})</TabsTrigger>
            <TabsTrigger value="staff">Staff ({staff.length})</TabsTrigger>
            {!hsCoachProfileId && <TabsTrigger value="transfers">Transfers</TabsTrigger>}
          </TabsList>

          <TabsContent value="roster">
            <View style={{ gap: spacing.md }}>
              <View style={{ flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" }}>
                <Button size="sm" onPress={() => setShowRosterDialog(true)} leftIcon={<UserPlus size={16} color={colors.primaryForeground} />}>Add Athlete</Button>
                <Button size="sm" variant="outline" onPress={handleCSVUpload} leftIcon={<Upload size={16} color={colors.foreground} />}>CSV Upload</Button>
              </View>

              {roster.length === 0 ? (
                <Card><CardContent style={{ paddingVertical: spacing.xl, alignItems: "center" }}>
                  <Users size={48} color={colors.mutedForeground} />
                  <Text style={{ fontFamily: typography.fontFamily.bodySemiBold, color: colors.foreground, marginTop: spacing.sm, marginBottom: spacing.xs }}>Empty Roster</Text>
                  <Text style={{ fontSize: typography.fontSize.sm, color: colors.mutedForeground, marginBottom: spacing.sm, textAlign: "center" }}>Add athletes manually or import via CSV.</Text>
                  <Text style={{ fontSize: typography.fontSize.xs, color: colors.mutedForeground, textAlign: "center" }}>CSV format: name, email, position, jersey_number, school, graduation_year, parent_name, parent_email, parent_phone</Text>
                </CardContent></Card>
              ) : (
                <View style={{ gap: spacing.sm }}>
                  {roster.map((r: any) => (
                    <TeamRosterAthleteCard
                      key={r.id}
                      roster={r}
                      canManage={true}
                      canMessage={true}
                      resendInvitePending={resendInvite.isPending}
                      resendInviteVariables={resendInvite.variables as string | undefined}
                      onResendInvite={(id: string) => resendInvite.mutate(id)}
                      onToggleZortsDone={(id: string) => toggleZorts.mutate({ id, table: "team_rosters", completed: true })}
                      onParentInvite={(id: string, currentEmail: string | null) => {
                        setSelectedRosterId(id);
                        setParentInviteEmail(currentEmail || "");
                        setShowParentInviteDialog(true);
                      }}
                      onRemove={(id: string) => removeRosterEntry.mutate(id)}
                      onSendLetter={(athleteProfileId: string, athleteName: string) => {
                        goToLetterForAthlete(
                          { id: athleteProfileId, full_name: athleteName, email: r.athlete_email, school: r.school },
                          { surface: "club-team-roster" },
                        );
                      }}
                    />
                  ))}
                </View>
              )}
            </View>
          </TabsContent>

          <TabsContent value="transfers">
            <ClubTransferRequests teamId={(selectedTeam as any).id} />
          </TabsContent>

          <TabsContent value="staff">
            <View style={{ gap: spacing.md }}>
              <View>
                <Button size="sm" onPress={() => setShowStaffDialog(true)} leftIcon={<Plus size={16} color={colors.primaryForeground} />}>Add Staff</Button>
              </View>
              {staff.length === 0 ? (
                <Card><CardContent style={{ paddingVertical: spacing.lg, alignItems: "center" }}>
                  <Text style={{ color: colors.mutedForeground, fontSize: typography.fontSize.sm }}>No staff assigned. Add assistant coaches or admins.</Text>
                </CardContent></Card>
              ) : (
                <View style={{ gap: spacing.xs }}>
                  {staff.map((s: any) => (
                    <Card key={s.id}>
                      <CardContent style={{ paddingVertical: spacing.sm, flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                        <Avatar size={36} fallback={s.name?.charAt(0)} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground }}>{s.name}</Text>
                          <Text style={{ fontSize: typography.fontSize.xs, color: colors.mutedForeground }}>{s.email}</Text>
                        </View>
                        <Badge variant="secondary">{s.role?.replace(/_/g, " ")}</Badge>
                        <Badge variant={s.invitation_status === "accepted" ? "default" : "outline"}>{s.invitation_status}</Badge>
                        {s.zorts_completed ? (
                          <Badge variant="default"><CheckCircle2 size={12} color={colors.primaryForeground} /> Zorts</Badge>
                        ) : s.zorts_registration_url ? (
                          <Badge variant="outline"><Link2 size={12} color={colors.foreground} /> Zorts Pending</Badge>
                        ) : null}
                      </CardContent>
                    </Card>
                  ))}
                </View>
              )}
            </View>
          </TabsContent>
        </Tabs>

        {/* Add Roster Dialog */}
        <Dialog open={showRosterDialog} onOpenChange={setShowRosterDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Athlete</DialogTitle>
              <DialogDescription>Manually add an athlete to the roster</DialogDescription>
            </DialogHeader>
            <View style={{ gap: spacing.sm }}>
              {/* Name + DOB always shown */}
              <View><Label>Name *</Label><Input value={rosterForm.athlete_name} onChangeText={(t: string) => setRosterForm(f => ({ ...f, athlete_name: t }))} /></View>
              <View style={{ flex: 1 }}><Label>Date of Birth</Label><Input value={rosterForm.date_of_birth} onChangeText={(t: string) => setRosterForm(f => ({ ...f, date_of_birth: t }))} placeholder="YYYY-MM-DD" /></View>

              {/* Minor-Safe: under-13 banner + collapsed form */}
              {rosterDobIsUnder13 ? (
                <View style={{ backgroundColor: `${colors.destructive}15`, borderWidth: 1, borderColor: colors.destructive, borderRadius: 8, padding: spacing.sm, gap: spacing.xs }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <AlertTriangle size={16} color={colors.destructive} />
                    <Text style={{ fontFamily: typography.fontFamily.bodySemiBold, color: colors.destructive, fontSize: typography.fontSize.sm }}>Under 13 — parent must create this profile</Text>
                  </View>
                  <Text style={{ fontFamily: typography.fontFamily.body, color: colors.mutedForeground, fontSize: typography.fontSize.xs, lineHeight: 18 }}>
                    Athletes under 13 cannot have a profile created directly by a coach. Enter the parent's email and we will invite them to set it up — only the name, date of birth, and parent contact are stored until the parent completes the profile.
                  </Text>
                </View>
              ) : (
                // Full form for 13+ athletes
                <>
                  <View style={{ flexDirection: "row", gap: spacing.sm }}>
                    <View style={{ flex: 1 }}><Label>Email</Label><Input keyboardType="email-address" value={rosterForm.athlete_email} onChangeText={(t: string) => setRosterForm(f => ({ ...f, athlete_email: t }))} /></View>
                    <View style={{ flex: 1 }}><Label>Position</Label><Input value={rosterForm.position} onChangeText={(t: string) => setRosterForm(f => ({ ...f, position: t }))} /></View>
                  </View>
                  <View style={{ flexDirection: "row", gap: spacing.sm }}>
                    <View style={{ flex: 1 }}><Label>Jersey #</Label><Input value={rosterForm.jersey_number} onChangeText={(t: string) => setRosterForm(f => ({ ...f, jersey_number: t }))} /></View>
                    <View style={{ flex: 1 }}><Label>School</Label><Input value={rosterForm.school} onChangeText={(t: string) => setRosterForm(f => ({ ...f, school: t }))} /></View>
                  </View>
                  <View><Label>Grad Year</Label><Input keyboardType="numeric" value={rosterForm.graduation_year} onChangeText={(t: string) => setRosterForm(f => ({ ...f, graduation_year: t }))} placeholder="2027" /></View>
                  <Text style={{ fontFamily: typography.fontFamily.bodySemiBold, color: colors.foreground, marginTop: spacing.xs }}>Zorts Registration</Text>
                  <View><Label>Zorts Registration URL</Label><Input value={rosterForm.zorts_registration_url} onChangeText={(t: string) => setRosterForm(f => ({ ...f, zorts_registration_url: t }))} placeholder="https://zfrhs.com/..." /></View>
                </>
              )}

              {/* Parent/Guardian — always shown (required for under-13, optional for older) */}
              <Text style={{ fontFamily: typography.fontFamily.bodySemiBold, color: colors.foreground, marginTop: spacing.xs }}>
                {rosterDobIsUnder13 ? "Parent/Guardian (required) *" : "Parent/Guardian Info"}
              </Text>
              <View><Label>Parent Name</Label><Input value={rosterForm.parent_name} onChangeText={(t: string) => setRosterForm(f => ({ ...f, parent_name: t }))} /></View>
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                <View style={{ flex: 1 }}><Label>Parent Email {rosterDobIsUnder13 ? "*" : ""}</Label><Input keyboardType="email-address" value={rosterForm.parent_email} onChangeText={(t: string) => setRosterForm(f => ({ ...f, parent_email: t }))} /></View>
                <View style={{ flex: 1 }}><Label>Parent Phone</Label><Input keyboardType="phone-pad" value={rosterForm.parent_phone} onChangeText={(t: string) => setRosterForm(f => ({ ...f, parent_phone: t }))} /></View>
              </View>
            </View>
            <DialogFooter>
              <Button variant="outline" onPress={() => setShowRosterDialog(false)}>Cancel</Button>
              <Button
                onPress={() => addRosterEntry.mutate(rosterForm)}
                disabled={!rosterForm.athlete_name || (rosterDobIsUnder13 && !rosterForm.parent_email) || addRosterEntry.isPending}
                leftIcon={addRosterEntry.isPending ? <Loader2 size={16} color={colors.primaryForeground} /> : <UserPlus size={16} color={colors.primaryForeground} />}
              >
                {rosterDobIsUnder13 ? "Invite Parent" : "Add"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Staff Dialog */}
        <Dialog open={showStaffDialog} onOpenChange={setShowStaffDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Staff Member</DialogTitle></DialogHeader>
            <View style={{ gap: spacing.sm }}>
              <View><Label>Name *</Label><Input value={staffForm.name} onChangeText={(t: string) => setStaffForm(f => ({ ...f, name: t }))} /></View>
              <View><Label>Email *</Label><Input keyboardType="email-address" value={staffForm.email} onChangeText={(t: string) => setStaffForm(f => ({ ...f, email: t }))} /></View>
              <View><Label>Role</Label>
                <Select value={staffForm.role} onValueChange={(v: string) => setStaffForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assistant_coach">Assistant Coach</SelectItem>
                    <SelectItem value="coordinator">Coordinator</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="evaluator">Evaluator</SelectItem>
                  </SelectContent>
                </Select>
              </View>
            </View>
            <DialogFooter>
              <Button variant="outline" onPress={() => setShowStaffDialog(false)}>Cancel</Button>
              <Button onPress={() => addStaff.mutate(staffForm)} disabled={!staffForm.name || !staffForm.email || addStaff.isPending} leftIcon={addStaff.isPending ? <Loader2 size={16} color={colors.primaryForeground} /> : undefined}>Add Staff</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Parent Invite Dialog */}
        <Dialog open={showParentInviteDialog} onOpenChange={setShowParentInviteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Parent/Guardian</DialogTitle>
              <DialogDescription>Send a parent approval request. Athletes under 17 require parent approval before activation.</DialogDescription>
            </DialogHeader>
            <View><Label>Parent Email *</Label><Input keyboardType="email-address" value={parentInviteEmail} onChangeText={setParentInviteEmail} placeholder="parent@email.com" /></View>
            <DialogFooter>
              <Button variant="outline" onPress={() => setShowParentInviteDialog(false)}>Cancel</Button>
              <Button onPress={() => selectedRosterId && sendParentInvite.mutate({ rosterId: selectedRosterId, email: parentInviteEmail })} disabled={!parentInviteEmail || sendParentInvite.isPending} leftIcon={<Mail size={16} color={colors.primaryForeground} />}>Send Invite</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </ScrollView>
    );
  }

  // ========== TEAMS LIST VIEW ==========
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.lg }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
            <Shield size={20} color={colors.primary} />
            <Text style={{ fontSize: typography.fontSize.xl, fontFamily: typography.fontFamily.bodySemiBold, color: colors.foreground }}>Club Team Management</Text>
          </View>
          <Text style={{ fontSize: typography.fontSize.sm, color: colors.mutedForeground }}>Manage teams, rosters, staff, and parent approvals</Text>
        </View>
        <Button onPress={() => { setEditingTeamId(null); setTeamForm({ ...emptyTeamForm, sport: (clubProfile as any)?.sport || "football" }); setShowTeamDialog(true); }} leftIcon={<Plus size={16} color={colors.primaryForeground} />}>New Team</Button>
      </View>

      {/* Club Card */}
      {clubProfile && (
        <Card style={{ borderColor: colors.primary, backgroundColor: colors.muted }}>
          <CardContent style={{ paddingVertical: spacing.md }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
              <Avatar size={56} source={(clubProfile as any).club_logo_url ? { uri: (clubProfile as any).club_logo_url } : null} fallback={(clubProfile as any).club_name?.charAt(0) || "C"} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.lg, color: colors.foreground }}>{(clubProfile as any).club_name}</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: 4 }}>
                  {(clubProfile as any).sport && <Badge variant="outline">{(clubProfile as any).sport}</Badge>}
                  {(clubProfile as any).team_level && <Badge variant="secondary">{(clubProfile as any).team_level}</Badge>}
                  {(clubProfile as any).age_group && <Badge variant="outline">{(clubProfile as any).age_group}</Badge>}
                  {(clubProfile as any).city && (clubProfile as any).state && <Text style={{ fontSize: typography.fontSize.sm, color: colors.mutedForeground }}>{(clubProfile as any).city}, {(clubProfile as any).state}</Text>}
                </View>
                {(clubProfile as any).team_slogan && <Text style={{ fontSize: typography.fontSize.sm, color: colors.mutedForeground, marginTop: 4, fontStyle: "italic" }}>"{(clubProfile as any).team_slogan}"</Text>}
              </View>
            </View>
          </CardContent>
        </Card>
      )}

      {/* Summary stats */}
      <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
        <Card style={{ flex: 1, minWidth: 140 }}><CardContent style={{ paddingVertical: spacing.md, alignItems: "center" }}><Text style={{ fontSize: typography.fontSize["2xl"], fontFamily: typography.fontFamily.bodySemiBold, color: colors.foreground }}>{activeTeams.length}</Text><Text style={{ fontSize: typography.fontSize.xs, color: colors.mutedForeground }}>Active Teams</Text></CardContent></Card>
        <Card style={{ flex: 1, minWidth: 140 }}><CardContent style={{ paddingVertical: spacing.md, alignItems: "center" }}><Text style={{ fontSize: typography.fontSize["2xl"], fontFamily: typography.fontFamily.bodySemiBold, color: colors.foreground }}>{totalAthletes}</Text><Text style={{ fontSize: typography.fontSize.xs, color: colors.mutedForeground }}>Total Athletes</Text></CardContent></Card>
        <Card style={{ flex: 1, minWidth: 140 }}><CardContent style={{ paddingVertical: spacing.md, alignItems: "center" }}><Text style={{ fontSize: typography.fontSize["2xl"], fontFamily: typography.fontFamily.bodySemiBold, color: colors.foreground }}>{archivedTeams.length}</Text><Text style={{ fontSize: typography.fontSize.xs, color: colors.mutedForeground }}>Archived</Text></CardContent></Card>
        <Card style={{ flex: 1, minWidth: 140 }}><CardContent style={{ paddingVertical: spacing.md, alignItems: "center" }}><Text style={{ fontSize: typography.fontSize["2xl"], fontFamily: typography.fontFamily.bodySemiBold, color: colors.foreground }}>—</Text><Text style={{ fontSize: typography.fontSize.xs, color: colors.mutedForeground }}>Pending Invites</Text></CardContent></Card>
      </View>

      {/* Team cards */}
      {isLoading ? (
        <View style={{ alignItems: "center", paddingVertical: spacing.xl }}><Loader2 size={32} color={colors.mutedForeground} /></View>
      ) : activeTeams.length === 0 ? (
        <Card><CardContent style={{ paddingVertical: spacing.xl, alignItems: "center" }}>
          <Users size={48} color={colors.mutedForeground} />
          <Text style={{ fontFamily: typography.fontFamily.bodySemiBold, color: colors.foreground, marginTop: spacing.sm, marginBottom: spacing.xs }}>No Teams Yet</Text>
          <Text style={{ color: colors.mutedForeground, marginBottom: spacing.sm, textAlign: "center" }}>Create your first team to start managing rosters.</Text>
          <Button onPress={() => { setTeamForm({ ...emptyTeamForm, sport: (clubProfile as any)?.sport || "football" }); setShowTeamDialog(true); }} leftIcon={<Plus size={16} color={colors.primaryForeground} />}>Create Team</Button>
        </CardContent></Card>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {activeTeams.map((team: any) => (
            <Pressable key={team.id} onPress={() => setSelectedTeamId(team.id)}>
              <Card>
                <CardHeader style={{ paddingBottom: spacing.xs }}>
                  <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <CardTitle>{team.name}</CardTitle>
                    <ChevronRight size={20} color={colors.mutedForeground} />
                  </View>
                </CardHeader>
                <CardContent style={{ gap: spacing.sm }}>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
                    <Badge variant="outline">{team.sport}</Badge>
                    {team.level && <Badge variant="secondary">{team.level}</Badge>}
                    {team.gender && team.gender !== "coed" && <Badge variant="outline">{team.gender}</Badge>}
                    {team.age_group && <Badge variant="outline">{team.age_group}</Badge>}
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Users size={16} color={colors.mutedForeground} />
                      <Text style={{ fontSize: typography.fontSize.sm, color: colors.foreground }}>{(rosterCounts as any)[team.id] || 0} athletes</Text>
                    </View>
                    {team.league && <Text style={{ fontSize: typography.fontSize.sm, color: colors.mutedForeground }}>{team.league}</Text>}
                  </View>
                  <View style={{ flexDirection: "row", gap: spacing.xs }}>
                    <Button size="sm" variant="outline" onPress={() => openEditTeam(team)} leftIcon={<Edit size={12} color={colors.foreground} />}>Edit</Button>
                    <Button size="sm" variant="outline" onPress={() => duplicateTeam.mutate(team)} leftIcon={<Copy size={12} color={colors.foreground} />}>Duplicate</Button>
                    <Button size="sm" variant="outline" onPress={() => archiveTeam.mutate(team.id)} leftIcon={<Archive size={12} color={colors.foreground} />}>Archive</Button>
                  </View>
                </CardContent>
              </Card>
            </Pressable>
          ))}
        </View>
      )}

      {/* Archived teams */}
      {archivedTeams.length > 0 && (
        <View style={{ gap: spacing.sm }}>
          <Text style={{ fontSize: typography.fontSize.sm, fontFamily: typography.fontFamily.bodySemiBold, color: colors.mutedForeground }}>Archived Teams</Text>
          {archivedTeams.map((team: any) => (
            <Card key={team.id} style={{ opacity: 0.6 }}>
              <CardContent style={{ paddingVertical: spacing.sm, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <View>
                  <Text style={{ fontFamily: typography.fontFamily.bodySemiBold, color: colors.foreground }}>{team.name}</Text>
                  <Text style={{ fontSize: typography.fontSize.xs, color: colors.mutedForeground }}>{team.sport} · {(rosterCounts as any)[team.id] || 0} athletes</Text>
                </View>
                <Badge variant="outline">Archived</Badge>
              </CardContent>
            </Card>
          ))}
        </View>
      )}

      {/* Create/Edit Team Dialog */}
      <Dialog open={showTeamDialog} onOpenChange={(v: boolean) => { setShowTeamDialog(v); if (!v) { setEditingTeamId(null); setTeamForm(emptyTeamForm); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTeamId ? "Edit Team" : "Create New Team"}</DialogTitle>
            <DialogDescription>{editingTeamId ? "Update team details" : "Set up a new team for your club"}</DialogDescription>
          </DialogHeader>
          <View style={{ gap: spacing.sm }}>
            <View><Label>Team Name *</Label><Input value={teamForm.name} onChangeText={(t: string) => setTeamForm(f => ({ ...f, name: t }))} placeholder="U16 Elite" /></View>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <View style={{ flex: 1 }}><Label>Sport</Label>
                <Select value={teamForm.sport} onValueChange={(v: string) => setTeamForm(f => ({ ...f, sport: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SPORTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </View>
              <View style={{ flex: 1 }}><Label>Gender</Label>
                <Select value={teamForm.gender} onValueChange={(v: string) => setTeamForm(f => ({ ...f, gender: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                </Select>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <View style={{ flex: 1 }}><Label>Age Group</Label><Input value={teamForm.age_group} onChangeText={(t: string) => setTeamForm(f => ({ ...f, age_group: t }))} placeholder="U16, 14-18" /></View>
              <View style={{ flex: 1 }}><Label>Graduation Year</Label><Input keyboardType="numeric" value={teamForm.graduation_year} onChangeText={(t: string) => setTeamForm(f => ({ ...f, graduation_year: t }))} placeholder="2027" /></View>
            </View>
            <View><Label>Level</Label>
              <Select value={teamForm.level} onValueChange={(v: string) => setTeamForm(f => ({ ...f, level: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{LEVELS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
              </Select>
            </View>
            <View><Label>Season</Label><Input value={teamForm.season} onChangeText={(t: string) => setTeamForm(f => ({ ...f, season: t }))} placeholder="Spring 2026" /></View>
            <View><Label>League</Label><Input value={teamForm.league} onChangeText={(t: string) => setTeamForm(f => ({ ...f, league: t }))} placeholder="AAU, USSSA..." /></View>
            <View><Label>Description</Label><Textarea value={teamForm.description} onChangeText={(t: string) => setTeamForm(f => ({ ...f, description: t }))} numberOfLines={2} /></View>
            {!hsCoachProfileId && (
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.sm, gap: spacing.sm }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground }}>Visible to high school coaches</Text>
                  <Text style={{ fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground, marginTop: 2 }}>
                    Lets verified HS coaches find HS-aged athletes on this roster and request a transfer. You still approve every request, and parents consent for minors.
                  </Text>
                </View>
                <Switch
                  value={teamForm.recruiting_enabled}
                  onValueChange={(v: boolean) => setTeamForm(f => ({ ...f, recruiting_enabled: v }))}
                />
              </View>
            )}
          </View>
          <DialogFooter>
            <Button variant="outline" onPress={() => setShowTeamDialog(false)}>Cancel</Button>
            <Button
              onPress={() => editingTeamId ? updateTeam.mutate({ id: editingTeamId, form: teamForm }) : createTeam.mutate(teamForm)}
              disabled={!teamForm.name || createTeam.isPending || updateTeam.isPending}
              leftIcon={(createTeam.isPending || updateTeam.isPending) ? <Loader2 size={16} color={colors.primaryForeground} /> : undefined}
            >
              {editingTeamId ? "Save Changes" : "Create Team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ScrollView>
  );
}

export default ClubTeamManagement;
