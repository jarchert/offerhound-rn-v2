// Ported from Lovable web → RN. Source:
//   /home/ubuntu/.openclaw/workspace/offerhound-repo/src/components/ClubCoachMessagingHub.tsx
// Translations:
//   - lucide-react        → lucide-react-native
//   - shadcn @/components/ui/* (lowercase) → PascalCase RN equivalents
//   - Tailwind classes    → StyleSheet
//   - useNavigate         → useNavigation() (@react-navigation/native)
//   - <label>/<div>/<p>   → <Pressable>/<View>/<Text>
//   - Composer wrapped in KeyboardAvoidingView so the textarea stays visible.
import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Checkbox } from "@/components/ui/Checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { useToast } from "@/hooks/use-toast";
import {
  MessageSquare,
  Send,
  Users,
  User,
  Loader2,
  Forward,
  Mail,
  Globe,
} from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { colors, typography, spacing, radius } from "@/lib/theme";

export function ClubCoachMessagingHub() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("team");
  const [selectedTeam, setSelectedTeam] = useState<string>("all");
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [messageContent, setMessageContent] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Teams
  const { data: teams = [] } = useQuery({
    queryKey: ["club-msg-teams", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("teams")
        .select("id, name, sport")
        .eq("coach_user_id", user.id)
        .neq("status", "archived");
      return data || [];
    },
    enabled: !!user,
  });

  // Roster athletes (with linked profiles)
  const { data: rosterAthletes = [], isLoading: rosterLoading } = useQuery({
    queryKey: ["club-msg-roster", user?.id, selectedTeam],
    queryFn: async () => {
      if (!user) return [];
      let query = supabase
        .from("team_rosters")
        .select(
          "id, athlete_name, position, jersey_number, status, athlete_profile_id, team_id, teams!inner(coach_user_id, name)"
        )
        .eq("teams.coach_user_id", user.id);
      if (selectedTeam !== "all") {
        query = query.eq("team_id", selectedTeam);
      }
      const { data } = await query;
      return data || [];
    },
    enabled: !!user,
  });

  // CRM contacts for external messaging
  const { data: crmContacts = [] } = useQuery({
    queryKey: ["club-msg-crm", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("club_coach_contacts")
        .select("id, contact_name, contact_type, email, organization")
        .eq("coach_user_id", user.id);
      return data || [];
    },
    enabled: !!user,
  });

  const toggleAthlete = (id: string) => {
    setSelectedAthletes((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedAthletes.length === rosterAthletes.length) {
      setSelectedAthletes([]);
    } else {
      setSelectedAthletes(rosterAthletes.map((a: any) => a.id));
    }
  };

  const handleSendTeamMessage = async () => {
    if (!messageContent.trim() || selectedAthletes.length === 0) return;
    setIsSending(true);
    try {
      // Log as internal message via staff_messages or direct logging
      if (user) {
        for (const athleteRosterId of selectedAthletes) {
          const athlete = rosterAthletes.find(
            (a: any) => a.id === athleteRosterId
          );
          if (athlete?.athlete_profile_id) {
            await supabase.from("coach_activity_log").insert({
              coach_user_id: user.id,
              activity_type: "athlete_contacted",
              athlete_profile_id: athlete.athlete_profile_id,
              details: {
                message: messageContent.slice(0, 200),
                channel: "in_app",
              },
            });
          }
        }
      }
      toast({
        title: "Messages Sent",
        description: `Sent to ${selectedAthletes.length} athlete(s)`,
      });
      setMessageContent("");
      setSelectedAthletes([]);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  // Map a club-coach contact's stored type to a LetterDashboard recipientCategory
  const inferRecipientCategory = (contact: any): string => {
    const t = String(contact?.contact_type || "").toLowerCase();
    if (t.includes("scout") || t.includes("agency")) return "scout";
    if (t.includes("hs") || t.includes("high school")) return "hs-coach";
    if (t.includes("club")) return "club-coach";
    if (t.includes("media") || t.includes("influencer")) return "influencer";
    // Default — college coach / recruiter
    return "college-coach";
  };

  const handleContactRecruiter = (contact: any) => {
    if (!contact.email) {
      toast({
        title: "No email",
        description: "This contact has no email address",
        variant: "destructive",
      });
      return;
    }
    navigation.navigate("ClubLetters" as never, {
      recipientCategory: inferRecipientCategory(contact),
      recipientType: "coach",
      recipientName: contact.contact_name || "",
      recipientEmail: contact.email,
      organizationName: contact.organization || "",
      recipientTitle: contact.title || contact.contact_type || "",
    } as never);
  };

  const handleRecommendAthlete = (contact: any, athlete: any) => {
    if (!contact.email) return;
    navigation.navigate("ClubLetters" as never, {
      recipientCategory: inferRecipientCategory(contact),
      recipientType: "coach",
      recipientName: contact.contact_name || "",
      recipientEmail: contact.email,
      organizationName: contact.organization || "",
      recipientTitle: contact.title || "",
      letterType: "player-pitch",
      recommendAthlete: athlete.athlete_name || "",
    } as never);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={s.flex1}
    >
      <View style={s.root}>
        <View>
          <View style={s.titleRow}>
            <MessageSquare size={20} color={colors.foreground} />
            <Text style={s.h2}>Messaging Hub</Text>
          </View>
          <Text style={s.subtitle}>
            Internal team messaging and external recruiter outreach
          </Text>
        </View>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList style={s.tabsList}>
            <TabsTrigger value="team">
              <View style={s.tabInner}>
                <Users size={16} color={colors.foreground} />
                <Text style={s.tabLabel}>Team Messages</Text>
              </View>
            </TabsTrigger>
            <TabsTrigger value="external">
              <View style={s.tabInner}>
                <Globe size={16} color={colors.foreground} />
                <Text style={s.tabLabel}>Recruiter Outreach</Text>
              </View>
            </TabsTrigger>
            <TabsTrigger value="recommend">
              <View style={s.tabInner}>
                <Forward size={16} color={colors.foreground} />
                <Text style={s.tabLabel}>Recommend Athletes</Text>
              </View>
            </TabsTrigger>
          </TabsList>

          {/* Team Messages */}
          <TabsContent value="team">
            <Card>
              <CardHeader>
                <CardTitle>Send to Team Members</CardTitle>
                <CardDescription>
                  Message individual athletes, position groups, or entire teams
                </CardDescription>
              </CardHeader>
              <CardContent>
                <View style={s.stack}>
                  {/* Team filter */}
                  <View style={s.filterRow}>
                    <View style={s.selectWrap}>
                      <Select
                        value={selectedTeam}
                        onValueChange={(v: string) => {
                          setSelectedTeam(v);
                          setSelectedAthletes([]);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Filter by team" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Teams</SelectItem>
                          {teams.map((t: any) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </View>
                    <Button variant="outline" size="sm" onPress={selectAll}>
                      {selectedAthletes.length === rosterAthletes.length
                        ? "Deselect All"
                        : "Select All"}
                    </Button>
                    <Badge variant="secondary">
                      {selectedAthletes.length} selected
                    </Badge>
                  </View>

                  {/* Athlete list */}
                  <ScrollArea style={s.athleteList}>
                    {rosterLoading ? (
                      <View style={s.center}>
                        <ActivityIndicator color={colors.mutedForeground} />
                      </View>
                    ) : rosterAthletes.length === 0 ? (
                      <Text style={s.emptyText}>No athletes on roster</Text>
                    ) : (
                      <View>
                        {rosterAthletes.map((athlete: any, idx: number) => (
                          <Pressable
                            key={athlete.id}
                            onPress={() => toggleAthlete(athlete.id)}
                            style={[
                              s.athleteRow,
                              idx > 0 && s.athleteDivider,
                            ]}
                          >
                            <Checkbox
                              checked={selectedAthletes.includes(athlete.id)}
                              onCheckedChange={() => toggleAthlete(athlete.id)}
                            />
                            <View style={s.avatarCircle}>
                              <User size={16} color={colors.primary} />
                            </View>
                            <View style={s.flex1MinW0}>
                              <Text style={s.athleteName} numberOfLines={1}>
                                {athlete.athlete_name}
                              </Text>
                              <Text style={s.athleteMeta}>
                                {athlete.position || "No position"}{" "}
                                {athlete.jersey_number
                                  ? `#${athlete.jersey_number}`
                                  : ""}
                              </Text>
                            </View>
                            <Badge variant="outline">
                              {(athlete as any).teams?.name}
                            </Badge>
                            <Badge
                              variant={
                                athlete.status === "approved"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {athlete.status}
                            </Badge>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </ScrollArea>

                  {/* Compose */}
                  <Textarea
                    placeholder="Type your message..."
                    value={messageContent}
                    onChangeText={setMessageContent}
                    numberOfLines={3}
                  />
                  <View style={s.sendBtnWrap}>
                    <Button
                      disabled={
                        !messageContent.trim() ||
                        selectedAthletes.length === 0 ||
                        isSending
                      }
                      onPress={handleSendTeamMessage}
                      leftIcon={
                        isSending ? (
                          <Loader2 size={16} color={colors.primaryForeground} />
                        ) : (
                          <Send size={16} color={colors.primaryForeground} />
                        )
                      }
                    >
                      Send to {selectedAthletes.length} Athlete(s)
                    </Button>
                  </View>
                </View>
              </CardContent>
            </Card>
          </TabsContent>

          {/* External Recruiter Outreach */}
          <TabsContent value="external">
            <Card>
              <CardHeader>
                <CardTitle>Contact Recruiters & Scouts</CardTitle>
                <CardDescription>
                  Send professional letters to contacts in your CRM via the AI
                  Letter Composer
                </CardDescription>
              </CardHeader>
              <CardContent>
                {crmContacts.length === 0 ? (
                  <View style={s.emptyState}>
                    <Mail size={48} color={colors.mutedForeground} />
                    <Text style={s.emptyTitle}>No CRM contacts yet</Text>
                    <Text style={s.emptyBody}>
                      Add contacts to your CRM first, then reach out from here.
                    </Text>
                  </View>
                ) : (
                  <View style={s.stack}>
                    {crmContacts.map((contact: any) => (
                      <View key={contact.id} style={s.contactRow}>
                        <View style={s.avatarCircleLg}>
                          <User size={16} color={colors.primary} />
                        </View>
                        <View style={s.flex1MinW0}>
                          <Text style={s.athleteName} numberOfLines={1}>
                            {contact.contact_name}
                          </Text>
                          <Text style={s.athleteMeta}>
                            {contact.organization || contact.contact_type}
                            {contact.email ? ` • ${contact.email}` : ""}
                          </Text>
                        </View>
                        <Button
                          size="sm"
                          variant="outline"
                          onPress={() => handleContactRecruiter(contact)}
                          disabled={!contact.email}
                          leftIcon={
                            <Mail size={12} color={colors.foreground} />
                          }
                        >
                          Compose Letter
                        </Button>
                      </View>
                    ))}
                  </View>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recommend Athletes */}
          <TabsContent value="recommend">
            <Card>
              <CardHeader>
                <CardTitle>Recommend Athletes to Contacts</CardTitle>
                <CardDescription>
                  Send athlete profiles and highlights to recruiters, scouts,
                  and college coaches in your network
                </CardDescription>
              </CardHeader>
              <CardContent>
                {crmContacts.length === 0 || rosterAthletes.length === 0 ? (
                  <View style={s.emptyState}>
                    <Forward size={48} color={colors.mutedForeground} />
                    <Text style={s.emptyTitle}>Setup Required</Text>
                    <Text style={s.emptyBody}>
                      You need both CRM contacts and roster athletes to
                      recommend.
                    </Text>
                  </View>
                ) : (
                  <View style={s.recGrid}>
                    {rosterAthletes
                      .filter((a: any) => a.athlete_profile_id)
                      .slice(0, 12)
                      .map((athlete: any) => (
                        <View key={athlete.id} style={s.recCard}>
                          <View style={s.recHeader}>
                            <View style={s.avatarCircle}>
                              <User size={16} color={colors.primary} />
                            </View>
                            <View>
                              <Text style={s.athleteName}>
                                {athlete.athlete_name}
                              </Text>
                              <Text style={s.athleteMeta}>
                                {athlete.position}
                              </Text>
                            </View>
                          </View>
                          <Select
                            onValueChange={(contactId: string) => {
                              const contact = crmContacts.find(
                                (c: any) => c.id === contactId
                              );
                              if (contact)
                                handleRecommendAthlete(contact, athlete);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Recommend to..." />
                            </SelectTrigger>
                            <SelectContent>
                              {crmContacts
                                .filter((c: any) => c.email)
                                .map((c: any) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.contact_name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </View>
                      ))}
                  </View>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </View>
    </KeyboardAvoidingView>
  );
}

export default ClubCoachMessagingHub;

const s = StyleSheet.create({
  flex1: { flex: 1 },
  flex1MinW0: { flex: 1, minWidth: 0 },
  root: { gap: spacing.lg },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  h2: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.xl,
    color: colors.foreground,
  },
  subtitle: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  tabsList: { width: "100%" },
  tabInner: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  tabLabel: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.foreground,
    fontSize: typography.fontSize.sm,
  },
  stack: { gap: spacing.md },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  selectWrap: { width: 192 },
  athleteList: {
    height: 250,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: 32 },
  emptyText: {
    textAlign: "center",
    paddingVertical: 32,
    color: colors.mutedForeground,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
  },
  athleteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
  },
  athleteDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + "1A",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarCircleLg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + "1A",
    alignItems: "center",
    justifyContent: "center",
  },
  athleteName: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  athleteMeta: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  sendBtnWrap: { alignSelf: "flex-start" },
  emptyState: { alignItems: "center", paddingVertical: 32, gap: spacing.sm },
  emptyTitle: {
    fontFamily: typography.fontFamily.bodySemiBold,
    color: colors.foreground,
    fontSize: typography.fontSize.base,
    marginTop: spacing.sm,
  },
  emptyBody: {
    textAlign: "center",
    color: colors.mutedForeground,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.muted,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recGrid: { gap: spacing.md },
  recCard: {
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    gap: spacing.sm,
  },
  recHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
