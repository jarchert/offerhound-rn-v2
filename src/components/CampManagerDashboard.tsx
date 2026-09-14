import { useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, Switch as RNSwitch, Platform } from "react-native";
import { useNavigation } from '@react-navigation/native';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/Dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { useCamps, useCreateCamp, useUpdateCamp, useDeleteCamp, useCampStaff, useAddCampStaff, type Camp } from "@/hooks/useCampManager";
import { SPORT_POSITIONS } from "@/lib/data/sportPositions";
import { SPORTS_LIST } from "@/lib/data/sports";
import { useToast } from "@/hooks/use-toast";
import { Plus, Calendar, MapPin, Users, Loader2, Copy, Trash2, Eye, Edit, UserPlus, ClipboardList, ArrowLeft, QrCode, Timer, Brain, Target, DollarSign, Link2, Trophy, CalendarDays, Star, GraduationCap, Megaphone, TrendingUp, MessageSquare, ShieldCheck, Sparkles, CalendarClock } from "lucide-react-native";
import { format } from "date-fns";
import { CampEnrollmentManager } from "./CampEnrollmentManager";
import { CampCheckInOps } from "./CampCheckInOps";
import { CampPerformanceCapture } from "./CampPerformanceCapture";
import { CampAIScoring } from "./CampAIScoring";
import { CampRecruitingActions } from "./CampRecruitingActions";
import { CampMonetizationManager } from "./CampMonetizationManager";
import { colors, typography, spacing } from "@/lib/theme";

// ----- Real Wave 22 ports (replaces previous _Stub scaffolding) -----
import { CampHeroImageUpload } from "@/components/CampHeroImageUpload";
import { CampAnalyticsPanel } from "@/components/CampAnalyticsPanel";
import { CampLinkBuilder } from "@/components/CampLinkBuilder";
import { CampEmailTemplateEditor } from "@/components/CampEmailTemplateEditor";
import { EditCampDialog } from "@/components/EditCampDialog";
import { CampScheduleBuilder } from "@/components/CampScheduleBuilder";
import { CampResultsView } from "@/components/CampResultsView";
import { CloneCampDialog } from "@/components/CloneCampDialog";
import { CampNPSResultsDialog } from "@/components/CampNPSResultsDialog";
import { CampRecruiterAttendanceLog } from "@/components/CampRecruiterAttendanceLog";
import { CampTopPerformerShare } from "@/components/CampTopPerformerShare";
import { CampCrossCampTrending } from "@/components/CampCrossCampTrending";
import { CampSmsBroadcastDialog } from "@/components/CampSmsBroadcastDialog";
import { AddToCalendarButton } from "@/components/AddToCalendarButton";
import { CampRefundReviewQueue } from "@/components/CampRefundReviewQueue";
import { CampAuditEventsLog } from "@/components/CampAuditEventsLog";
import { CampWaiverManager } from "@/components/CampWaiverManager";
import { CampInsuranceManager } from "@/components/CampInsuranceManager";
import { CampStaffScheduler } from "@/components/CampStaffScheduler";
import { CampLeaderboardEmbedBuilder } from "@/components/CampLeaderboardEmbedBuilder";
import { CampRecruiterHeatmap } from "@/components/CampRecruiterHeatmap";
import { CampTop10PacketButton } from "@/components/CampTop10PacketButton";
import { CampCrossCampInviteDialog } from "@/components/CampCrossCampInviteDialog";
import { RescheduleCampDialog } from "@/components/RescheduleCampDialog";

// Local stub data — campManagerSports module not yet ported
const CAMP_MANAGER_SUPPORTED_SPORTS: string[] = ["football","basketball","baseball","soccer","volleyball","lacrosse","hockey","softball","track","wrestling"];
const CAMP_SPORT_STAT_FOCUS: Record<string, { label: string; stats: string[] }> = {};

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"
];

interface CampManagerDashboardProps {
  sport?: string;
}

export function CampManagerDashboard({ sport = "football" }: CampManagerDashboardProps) {
  const nav = useNavigation<any>();
  const { data: camps = [], isLoading } = useCamps();
  const createCamp = useCreateCamp();
  const updateCamp = useUpdateCamp();
  const deleteCamp = useDeleteCamp();
  const { toast } = useToast();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editCamp, setEditCamp] = useState<Camp | null>(null);
  const [rescheduleCamp, setRescheduleCamp] = useState<Camp | null>(null);
  const [scheduleCamp, setScheduleCamp] = useState<Camp | null>(null);
  const [resultsCamp, setResultsCamp] = useState<Camp | null>(null);
  const [selectedCampId, setSelectedCampId] = useState<string | null>(null);
  const [showStaffDialog, setShowStaffDialog] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState("upcoming");
  const [enrollmentCamp, setEnrollmentCamp] = useState<Camp | null>(null);
  const [opsCamp, setOpsCamp] = useState<Camp | null>(null);
  const [perfCamp, setPerfCamp] = useState<Camp | null>(null);
  const [aiScoreCamp, setAiScoreCamp] = useState<Camp | null>(null);
  const [recruitCamp, setRecruitCamp] = useState<Camp | null>(null);
  const [monetizeCamp, setMonetizeCamp] = useState<Camp | null>(null);
  const [cloneSource, setCloneSource] = useState<Camp | null>(null);
  const [npsCamp, setNpsCamp] = useState<Camp | null>(null);
  const [recruiterLogCamp, setRecruiterLogCamp] = useState<Camp | null>(null);
  const [topShareCamp, setTopShareCamp] = useState<Camp | null>(null);
  const [crossInviteCamp, setCrossInviteCamp] = useState<Camp | null>(null);
  const [showTrending, setShowTrending] = useState(false);
  const [smsCamp, setSmsCamp] = useState<Camp | null>(null);
  const [trustCamp, setTrustCamp] = useState<Camp | null>(null);

  const [newCamp, setNewCamp] = useState({
    name: "",
    description: "",
    camp_type: "college_camp",
    sport: sport,
    start_date: "",
    end_date: "",
    start_time: "",
    end_time: "",
    location: "",
    city: "",
    state: "",
    positions: [] as string[],
    capacity: "",
    is_free: true,
    price_cents: 0,
    image_url: "" as string,
  });

  const resetForm = () => {
    setNewCamp({
      name: "", description: "", camp_type: "college_camp", sport, start_date: "", end_date: "",
      start_time: "", end_time: "", location: "", city: "", state: "", positions: [],
      capacity: "", is_free: true, price_cents: 0, image_url: "",
    });
  };

  const handleCreateCamp = async () => {
    if (!newCamp.name || !newCamp.start_date) {
      toast({ title: "Missing Fields", description: "Camp name and start date are required.", variant: "destructive" });
      return;
    }
    try {
      await createCamp.mutateAsync({
        name: newCamp.name,
        description: newCamp.description || null,
        camp_type: newCamp.camp_type,
        sport: newCamp.sport,
        start_date: newCamp.start_date,
        end_date: newCamp.end_date || null,
        start_time: newCamp.start_time || null,
        end_time: newCamp.end_time || null,
        location: newCamp.location || null,
        city: newCamp.city || null,
        state: newCamp.state || null,
        positions: newCamp.positions,
        capacity: newCamp.capacity ? parseInt(newCamp.capacity) : null,
        is_free: newCamp.is_free,
        price_cents: newCamp.is_free ? 0 : newCamp.price_cents,
        image_url: newCamp.image_url || null,
      } as any);
      setShowCreateDialog(false);
      resetForm();
      toast({ title: "Camp Created", description: "Your camp has been created successfully." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteCamp = async (campId: string) => {
    try {
      await deleteCamp.mutateAsync(campId);
      toast({ title: "Camp Deleted" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handlePublishCamp = async (campId: string) => {
    try {
      await updateCamp.mutateAsync({ id: campId, status: "published" } as any);
      toast({ title: "Camp Published" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const now = new Date().toISOString().slice(0, 10);
  const upcomingCamps = camps.filter(c => c.start_date >= now && c.status !== "completed" && c.status !== "cancelled");
  const pastCamps = camps.filter(c => c.start_date < now || c.status === "completed");
  const draftCamps = camps.filter(c => c.status === "draft");

  const sportPositions = SPORT_POSITIONS[newCamp.sport] || [];

  if (isLoading) {
    return <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 48 }}><Loader2 size={32} color={colors.mutedForeground} /></View>;
  }

  if (enrollmentCamp) {
    return (
      <ScrollView contentContainerStyle={{ gap: spacing.md, padding: spacing.md }}>
        <Button variant="ghost" size="sm" onPress={() => setEnrollmentCamp(null)} leftIcon={<ArrowLeft size={16} color={colors.foreground} />}>Back to Camps</Button>
        <CampEnrollmentManager
          campId={enrollmentCamp.id}
          campName={enrollmentCamp.name}
          capacity={enrollmentCamp.capacity}
          isFree={enrollmentCamp.is_free}
          priceCents={enrollmentCamp.price_cents}
        />
        <CampAnalyticsPanel campId={enrollmentCamp.id} campName={enrollmentCamp.name} capacity={enrollmentCamp.capacity} />
        <CampLinkBuilder campId={enrollmentCamp.id} campName={enrollmentCamp.name} campDescription={enrollmentCamp.description} />
        <CampEmailTemplateEditor campId={enrollmentCamp.id} campName={enrollmentCamp.name} />
      </ScrollView>
    );
  }

  if (opsCamp) {
    return (
      <ScrollView contentContainerStyle={{ gap: spacing.md, padding: spacing.md }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: spacing.xs }}>
          <Button variant="ghost" size="sm" onPress={() => setOpsCamp(null)} leftIcon={<ArrowLeft size={16} color={colors.foreground} />}>Back to Camps</Button>
          <Button variant="outline" size="sm" onPress={() => nav.navigate('CampStack' as any, { screen: 'CampMobileCheckin', params: { campId: opsCamp.id } })}>📱 Mobile check-in</Button>
          <Button variant="outline" size="sm" onPress={() => nav.navigate('CampStack' as any, { screen: 'CampEvaluatorScoring', params: { campId: opsCamp.id } })}>🏃 Evaluator scoring</Button>
          <Button variant="outline" size="sm" onPress={() => nav.navigate('CampStack' as any, { screen: 'CampLeaderboard', params: { campId: opsCamp.id } })}>🏆 Live leaderboard</Button>
        </View>
        <CampCheckInOps campId={opsCamp.id} campName={opsCamp.name} drillStations={(opsCamp as any).drill_stations || []} positions={opsCamp.positions || []} />
      </ScrollView>
    );
  }

  if (perfCamp) {
    return (
      <ScrollView contentContainerStyle={{ gap: spacing.md, padding: spacing.md }}>
        <Button variant="ghost" size="sm" onPress={() => setPerfCamp(null)} leftIcon={<ArrowLeft size={16} color={colors.foreground} />}>Back to Camps</Button>
        <CampPerformanceCapture campId={perfCamp.id} campName={perfCamp.name} sport={perfCamp.sport} positions={perfCamp.positions || []} />
      </ScrollView>
    );
  }

  if (aiScoreCamp) {
    return (
      <View style={{ gap: spacing.md, padding: spacing.md }}>
        <CampAIScoring campId={aiScoreCamp.id} campName={aiScoreCamp.name} onBack={() => setAiScoreCamp(null)} />
      </View>
    );
  }

  if (recruitCamp) {
    return (
      <View style={{ gap: spacing.md, padding: spacing.md }}>
        <CampRecruitingActions campId={recruitCamp.id} campName={recruitCamp.name} onBack={() => setRecruitCamp(null)} />
      </View>
    );
  }

  if (trustCamp) {
    return (
      <ScrollView contentContainerStyle={{ gap: spacing.md, padding: spacing.md }}>
        <Button variant="ghost" size="sm" onPress={() => setTrustCamp(null)} leftIcon={<ArrowLeft size={16} color={colors.foreground} />}>Back to Camps</Button>
        <View>
          <Text style={{ fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize["2xl"], color: colors.foreground }}>{trustCamp.name}</Text>
          <Text style={{ fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground }}>Trust & safety controls</Text>
        </View>
        <CampWaiverManager campId={trustCamp.id} />
        <CampInsuranceManager campId={trustCamp.id} />
        <CampStaffScheduler campId={trustCamp.id} />
        <CampLeaderboardEmbedBuilder campId={trustCamp.id} campName={trustCamp.name} />
        <CampRefundReviewQueue campId={trustCamp.id} />
        <CampAuditEventsLog campId={trustCamp.id} />
      </ScrollView>
    );
  }

  if (monetizeCamp) {
    return <CampMonetizationManager campId={monetizeCamp.id} campName={monetizeCamp.name} onBack={() => setMonetizeCamp(null)} />;
  }

  if (scheduleCamp) {
    return <CampScheduleBuilder camp={scheduleCamp} onBack={() => setScheduleCamp(null)} />;
  }

  if (resultsCamp) {
    return <CampResultsView camp={resultsCamp} onBack={() => setResultsCamp(null)} />;
  }

  if (recruiterLogCamp) {
    return (
      <ScrollView contentContainerStyle={{ gap: spacing.md, padding: spacing.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: spacing.xs }}>
          <Button variant="ghost" size="sm" onPress={() => setRecruiterLogCamp(null)} leftIcon={<ArrowLeft size={16} color={colors.foreground} />}>Back to Camps</Button>
          <CampTop10PacketButton campId={recruiterLogCamp.id} campName={recruiterLogCamp.name} />
        </View>
        <CampRecruiterAttendanceLog campId={recruiterLogCamp.id} campName={recruiterLogCamp.name} />
        <CampRecruiterHeatmap campId={recruiterLogCamp.id} campName={recruiterLogCamp.name} />
      </ScrollView>
    );
  }

  if (topShareCamp) {
    return (
      <ScrollView contentContainerStyle={{ gap: spacing.md, padding: spacing.md }}>
        <Button variant="ghost" size="sm" onPress={() => setTopShareCamp(null)} leftIcon={<ArrowLeft size={16} color={colors.foreground} />}>Back to Camps</Button>
        <CampTopPerformerShare campId={topShareCamp.id} campName={topShareCamp.name} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ gap: spacing.lg, padding: spacing.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: spacing.sm }}>
        <View>
          <Text style={{ fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize.xl, color: colors.foreground }}>Camp Manager</Text>
          <Text style={{ fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground }}>Create, manage, and run your camps</Text>
        </View>
        <View style={{ flexDirection: "row", gap: spacing.xs }}>
          <Button variant="outline" onPress={() => setShowTrending(v => !v)} leftIcon={<TrendingUp size={16} color={colors.foreground} />}>{showTrending ? "Hide" : "Show"} trends</Button>
          <Button onPress={() => setShowCreateDialog(true)} leftIcon={<Plus size={16} color={colors.primaryForeground} />}>Create Camp</Button>
        </View>
      </View>

      {showTrending && <CampCrossCampTrending />}

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        {[
          { label: "Total Camps", value: camps.length, icon: Calendar },
          { label: "Upcoming", value: upcomingCamps.length, icon: ClipboardList },
          { label: "Drafts", value: draftCamps.length, icon: Edit },
          { label: "Completed", value: pastCamps.length, icon: Eye },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} style={{ flexBasis: "48%", flexGrow: 1 }}>
            <CardContent style={{ paddingTop: spacing.md }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                <View style={{ padding: spacing.xs, backgroundColor: "rgba(231,175,8,0.1)", borderRadius: 8 }}><Icon size={20} color={colors.primary} /></View>
                <View>
                  <Text style={{ fontFamily: typography.fontFamily.heading, fontSize: typography.fontSize["2xl"], color: colors.primary }}>{value}</Text>
                  <Text style={{ fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground }}>{label}</Text>
                </View>
              </View>
            </CardContent>
          </Card>
        ))}
      </View>

      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcomingCamps.length})</TabsTrigger>
          <TabsTrigger value="drafts">Drafts ({draftCamps.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({pastCamps.length})</TabsTrigger>
        </TabsList>

        {(["upcoming", "drafts", "past"] as const).map(tab => {
          const list = tab === "upcoming" ? upcomingCamps : tab === "drafts" ? draftCamps : pastCamps;
          return (
            <TabsContent key={tab} value={tab}>
              {list.length === 0 ? (
                <Card>
                  <CardContent style={{ paddingVertical: 48, alignItems: "center" }}>
                    <Calendar size={48} color={colors.mutedForeground} style={{ marginBottom: spacing.md }} />
                    <Text style={{ fontFamily: typography.fontFamily.bodySemiBold, color: colors.foreground, marginBottom: spacing.xs }}>No {tab} camps</Text>
                    <Text style={{ fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, marginBottom: spacing.md, textAlign: "center" }}>
                      {tab === "drafts" ? "Create a camp to get started." : `No ${tab} camps to display.`}
                    </Text>
                    {tab !== "past" && (
                      <Button onPress={() => setShowCreateDialog(true)} leftIcon={<Plus size={16} color={colors.primaryForeground} />}>Create Camp</Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <View style={{ gap: spacing.md }}>
                  {list.map(camp => (
                    <Card key={camp.id}>
                      <CardHeader style={{ paddingBottom: spacing.xs }}>
                        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
                          <View style={{ flex: 1 }}>
                            <CardTitle>{camp.name}</CardTitle>
                            <CardDescription style={{ flexDirection: "row", alignItems: "center", marginTop: 4 } as any}>
                              <Calendar size={12} color={colors.mutedForeground} />{"  "}
                              {format(new Date(camp.start_date), "MMM d, yyyy")}
                              {camp.end_date ? ` – ${format(new Date(camp.end_date), "MMM d, yyyy")}` : ""}
                            </CardDescription>
                          </View>
                          <Badge variant={camp.status === "published" ? "default" : camp.status === "active" ? "default" : "secondary"}>
                            {camp.status}
                          </Badge>
                        </View>
                      </CardHeader>
                      <CardContent style={{ gap: spacing.sm }}>
                        {(camp.city || camp.state) && (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                            <MapPin size={12} color={colors.mutedForeground} />
                            <Text style={{ fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground }}>
                              {[camp.city, camp.state].filter(Boolean).join(", ")}
                            </Text>
                          </View>
                        )}
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                          <Badge variant="outline">{camp.camp_type.replace("_", " ")}</Badge>
                          <Badge variant="outline">{camp.sport}</Badge>
                          {camp.capacity && <Badge variant="outline">{`${camp.capacity} spots`}</Badge>}
                          {!camp.is_free && <Badge variant="secondary">{`$${(camp.price_cents / 100).toFixed(2)}`}</Badge>}
                        </View>
                        {camp.positions && camp.positions.length > 0 && (
                          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                            {camp.positions.slice(0, 4).map(p => <Badge key={p} variant="outline">{p}</Badge>)}
                            {camp.positions.length > 4 && <Badge variant="outline">{`+${camp.positions.length - 4}`}</Badge>}
                          </View>
                        )}
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, paddingTop: spacing.xs }}>
                          {camp.status === "draft" && (
                            <Button size="sm" variant="default" onPress={() => handlePublishCamp(camp.id)} leftIcon={<Eye size={12} color={colors.primaryForeground} />}>Publish</Button>
                          )}
                          <Button size="sm" variant="outline" onPress={() => setEditCamp(camp)} leftIcon={<Edit size={12} color={colors.foreground} />}>Edit</Button>
                          <Button size="sm" variant="outline" onPress={() => setScheduleCamp(camp)} leftIcon={<CalendarDays size={12} color={colors.foreground} />}>Schedule</Button>
                          <Button size="sm" variant="outline" onPress={() => setRescheduleCamp(camp)} leftIcon={<CalendarClock size={12} color={colors.foreground} />}>Reschedule</Button>
                          <Button size="sm" variant="outline" onPress={() => setEnrollmentCamp(camp)} leftIcon={<Users size={12} color={colors.foreground} />}>Enrollments</Button>
                          <Button size="sm" variant="outline" onPress={() => setOpsCamp(camp)} leftIcon={<QrCode size={12} color={colors.foreground} />}>Operations</Button>
                          <Button size="sm" variant="outline" onPress={() => setPerfCamp(camp)} leftIcon={<Timer size={12} color={colors.foreground} />}>Performance</Button>
                          <Button size="sm" variant="outline" onPress={() => setAiScoreCamp(camp)} leftIcon={<Brain size={12} color={colors.foreground} />}>AI Scoring</Button>
                          <Button size="sm" variant="outline" onPress={() => setResultsCamp(camp)} leftIcon={<Trophy size={12} color={colors.foreground} />}>Results</Button>
                          <Button size="sm" variant="outline" onPress={() => setRecruitCamp(camp)} leftIcon={<Target size={12} color={colors.foreground} />}>Recruit</Button>
                          <Button size="sm" variant="outline" onPress={() => setMonetizeCamp(camp)} leftIcon={<DollarSign size={12} color={colors.foreground} />}>Monetize</Button>
                          <Button size="sm" variant="outline" onPress={() => setNpsCamp(camp)} leftIcon={<Star size={12} color={colors.foreground} />}>Feedback</Button>
                          <Button size="sm" variant="outline" onPress={() => setRecruiterLogCamp(camp)} leftIcon={<GraduationCap size={12} color={colors.foreground} />}>Recruiters</Button>
                          <Button size="sm" variant="outline" onPress={() => setTopShareCamp(camp)} leftIcon={<Megaphone size={12} color={colors.foreground} />}>Spotlight</Button>
                          <Button size="sm" variant="outline" onPress={() => setCrossInviteCamp(camp)} leftIcon={<Sparkles size={12} color={colors.foreground} />}>Invite Past Stars</Button>
                          <Button size="sm" variant="outline" onPress={() => setSmsCamp(camp)} leftIcon={<MessageSquare size={12} color={colors.foreground} />}>Text Blast</Button>
                          <Button size="sm" variant="outline" onPress={() => setTrustCamp(camp)} leftIcon={<ShieldCheck size={12} color={colors.foreground} />}>Trust & refunds</Button>
                          <AddToCalendarButton camp={camp} variant="outline" size="sm" label="Calendar" />
                          <Button size="sm" variant="outline" onPress={() => { setSelectedCampId(camp.id); setShowStaffDialog(true); }} leftIcon={<UserPlus size={12} color={colors.foreground} />}>Staff</Button>
                          {(camp.status === "published" || camp.status === "active") && (
                            <Button size="sm" variant="ghost" onPress={() => {
                              const url = `https://offerhound.app/camps/${camp.id}`;
                              // Clipboard wired up when @react-native-clipboard/clipboard is added.
                              toast({ title: "Public link", description: url });
                            }} leftIcon={<Link2 size={12} color={colors.foreground} />}>Copy Link</Button>
                          )}
                          <Button size="sm" variant="ghost" onPress={() => setCloneSource(camp)} leftIcon={<Copy size={12} color={colors.foreground} />}>Clone template</Button>
                          <Button size="sm" variant="ghost" onPress={() => handleDeleteCamp(camp.id)} leftIcon={<Trash2 size={12} color={colors.destructive} />} textStyle={{ color: colors.destructive }}>Delete</Button>
                        </View>
                      </CardContent>
                    </Card>
                  ))}
                </View>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Create Camp Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Camp</DialogTitle>
            <DialogDescription>Set up your camp details, positions, and pricing</DialogDescription>
          </DialogHeader>
          <View style={{ gap: spacing.md }}>
            <View style={{ gap: spacing.xs }}>
              <Label>Camp Name *</Label>
              <Input value={newCamp.name} onChangeText={(t: string) => setNewCamp({ ...newCamp, name: t })} placeholder="Summer Football Camp 2026" />
            </View>
            <View style={{ gap: spacing.xs }}>
              <Label>Camp Type</Label>
              <Select value={newCamp.camp_type} onValueChange={(v: string) => setNewCamp({ ...newCamp, camp_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="college_camp">College Camp</SelectItem>
                  <SelectItem value="club_camp">Club Camp</SelectItem>
                  <SelectItem value="showcase">Showcase</SelectItem>
                  <SelectItem value="combine">Combine</SelectItem>
                </SelectContent>
              </Select>
            </View>
            <View style={{ gap: spacing.xs }}>
              <Label>Sport</Label>
              <Select value={newCamp.sport} onValueChange={(v: string) => setNewCamp({ ...newCamp, sport: v, positions: [] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SPORTS_LIST
                    .filter((s: any) => CAMP_MANAGER_SUPPORTED_SPORTS.includes(s.id))
                    .map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {CAMP_SPORT_STAT_FOCUS[newCamp.sport] && (
                <Text style={{ fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground }}>
                  <Text style={{ fontFamily: typography.fontFamily.bodySemiBold, color: colors.foreground }}>{CAMP_SPORT_STAT_FOCUS[newCamp.sport].label}:</Text>
                  {" "}{CAMP_SPORT_STAT_FOCUS[newCamp.sport].stats.join(" · ")}
                </Text>
              )}
            </View>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Label>Start Date *</Label>
                <Input value={newCamp.start_date} onChangeText={(t: string) => setNewCamp({ ...newCamp, start_date: t })} placeholder="YYYY-MM-DD" />
              </View>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Label>End Date</Label>
                <Input value={newCamp.end_date} onChangeText={(t: string) => setNewCamp({ ...newCamp, end_date: t })} placeholder="YYYY-MM-DD" />
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Label>Start Time</Label>
                <Input value={newCamp.start_time} onChangeText={(t: string) => setNewCamp({ ...newCamp, start_time: t })} placeholder="HH:MM" />
              </View>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Label>End Time</Label>
                <Input value={newCamp.end_time} onChangeText={(t: string) => setNewCamp({ ...newCamp, end_time: t })} placeholder="HH:MM" />
              </View>
            </View>
            <View style={{ gap: spacing.xs }}>
              <Label>Location/Venue</Label>
              <Input value={newCamp.location} onChangeText={(t: string) => setNewCamp({ ...newCamp, location: t })} placeholder="Stadium name or facility" />
            </View>
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Label>City</Label>
                <Input value={newCamp.city} onChangeText={(t: string) => setNewCamp({ ...newCamp, city: t })} />
              </View>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Label>State</Label>
                <Select value={newCamp.state} onValueChange={(v: string) => setNewCamp({ ...newCamp, state: v })}>
                  <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>{US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </View>
            </View>
            <View style={{ gap: spacing.xs }}>
              <Label>Capacity</Label>
              <Input keyboardType="numeric" value={newCamp.capacity} onChangeText={(t: string) => setNewCamp({ ...newCamp, capacity: t })} placeholder="Max athletes" />
            </View>

            <View style={{ gap: spacing.xs }}>
              <Label>Positions</Label>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, maxHeight: 128, padding: spacing.xs, borderWidth: 1, borderColor: colors.border, borderRadius: 8 }}>
                {sportPositions.map((p: any) => {
                  const selected = newCamp.positions.includes(p.label);
                  return (
                    <Pressable
                      key={p.label}
                      onPress={() => {
                        setNewCamp(prev => ({
                          ...prev,
                          positions: prev.positions.includes(p.label)
                            ? prev.positions.filter(pos => pos !== p.label)
                            : [...prev.positions, p.label],
                        }));
                      }}
                    >
                      <Badge variant={selected ? "default" : "outline"}>{p.label}</Badge>
                    </Pressable>
                  );
                })}
                {sportPositions.length === 0 && <Text style={{ fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground }}>No positions defined for this sport</Text>}
              </View>
            </View>

            <View style={{ gap: spacing.xs }}>
              <Label>Description</Label>
              <Textarea value={newCamp.description} onChangeText={(t: string) => setNewCamp({ ...newCamp, description: t })} placeholder="Camp details, what to bring, etc." numberOfLines={3} />
            </View>

            <CampHeroImageUpload
              currentImageUrl={newCamp.image_url || null}
              onUploaded={(url: string) => setNewCamp(prev => ({ ...prev, image_url: url }))}
              onRemoved={() => setNewCamp(prev => ({ ...prev, image_url: "" }))}
            />

            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                <RNSwitch value={newCamp.is_free} onValueChange={(v: boolean) => setNewCamp({ ...newCamp, is_free: v })} />
                <Label>Free camp</Label>
              </View>
              {!newCamp.is_free && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                  <Label>Price ($)</Label>
                  <Input
                    keyboardType="decimal-pad"
                    style={{ width: 96 }}
                    value={String(newCamp.price_cents / 100)}
                    onChangeText={(t: string) => setNewCamp({ ...newCamp, price_cents: Math.round(parseFloat(t || "0") * 100) })}
                  />
                </View>
              )}
            </View>
          </View>
          <DialogFooter>
            <Button variant="outline" onPress={() => { setShowCreateDialog(false); resetForm(); }}>Cancel</Button>
            <Button
              onPress={handleCreateCamp}
              disabled={createCamp.isPending}
              leftIcon={createCamp.isPending ? <Loader2 size={16} color={colors.primaryForeground} /> : <Plus size={16} color={colors.primaryForeground} />}
            >
              Create Camp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Staff Management Dialog */}
      <CampStaffDialog campId={selectedCampId} open={showStaffDialog} onOpenChange={setShowStaffDialog} />

      {/* Edit Camp Dialog */}
      <EditCampDialog camp={editCamp} open={!!editCamp} onOpenChange={(open: boolean) => { if (!open) setEditCamp(null); }} />

      {/* Reschedule Camp Dialog */}
      <RescheduleCampDialog camp={rescheduleCamp} open={!!rescheduleCamp} onOpenChange={(open: boolean) => { if (!open) setRescheduleCamp(null); }} />

      {/* Clone Camp Template Dialog */}
      <CloneCampDialog source={cloneSource} open={!!cloneSource} onOpenChange={(open: boolean) => { if (!open) setCloneSource(null); }} />

      {npsCamp && (
        <CampNPSResultsDialog campId={npsCamp.id} open={!!npsCamp} onOpenChange={(open: boolean) => { if (!open) setNpsCamp(null); }} />
      )}

      {smsCamp && (
        <CampSmsBroadcastDialog campId={smsCamp.id} campName={smsCamp.name} open={!!smsCamp} onOpenChange={(open: boolean) => { if (!open) setSmsCamp(null); }} />
      )}
      {crossInviteCamp && (
        <CampCrossCampInviteDialog targetCampId={crossInviteCamp.id} targetCampName={crossInviteCamp.name} open={!!crossInviteCamp} onOpenChange={(open: boolean) => { if (!open) setCrossInviteCamp(null); }} />
      )}
    </ScrollView>
  );
}

function CampStaffDialog({ campId, open, onOpenChange }: { campId: string | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const { data: staff = [], isLoading } = useCampStaff(campId);
  const addStaff = useAddCampStaff();
  const { toast } = useToast();
  const [newStaff, setNewStaff] = useState({ name: "", email: "", role: "evaluator" });

  const handleAdd = async () => {
    if (!campId || !newStaff.name) return;
    try {
      await addStaff.mutateAsync({ camp_id: campId, name: newStaff.name, email: newStaff.email || undefined, role: newStaff.role });
      setNewStaff({ name: "", email: "", role: "evaluator" });
      toast({ title: "Staff Added" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Camp Staff</DialogTitle>
          <DialogDescription>Manage staff roles for this camp</DialogDescription>
        </DialogHeader>
        <View style={{ gap: spacing.md }}>
          <View style={{ flexDirection: "row", gap: spacing.xs }}>
            <Input style={{ flex: 1 }} placeholder="Name" value={newStaff.name} onChangeText={(t: string) => setNewStaff({ ...newStaff, name: t })} />
            <Input style={{ flex: 1 }} placeholder="Email" value={newStaff.email} onChangeText={(t: string) => setNewStaff({ ...newStaff, email: t })} />
            <View style={{ flex: 1 }}>
              <Select value={newStaff.role} onValueChange={(v: string) => setNewStaff({ ...newStaff, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="evaluator">Evaluator</SelectItem>
                  <SelectItem value="data_entry">Data Entry</SelectItem>
                  <SelectItem value="timer">Timer</SelectItem>
                </SelectContent>
              </Select>
            </View>
          </View>
          <Button
            size="sm"
            onPress={handleAdd}
            disabled={addStaff.isPending || !newStaff.name}
            leftIcon={addStaff.isPending ? <Loader2 size={16} color={colors.primaryForeground} /> : <UserPlus size={16} color={colors.primaryForeground} />}
          >
            Add Staff
          </Button>

          {isLoading ? (
            <View style={{ alignItems: "center", paddingVertical: spacing.md }}><Loader2 size={24} color={colors.mutedForeground} /></View>
          ) : staff.length > 0 ? (
            <View style={{ gap: spacing.xs }}>
              {staff.map((s: any) => (
                <View key={s.id} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.sm, backgroundColor: colors.secondary, borderRadius: 8 }}>
                  <View>
                    <Text style={{ fontFamily: typography.fontFamily.bodySemiBold, fontSize: typography.fontSize.sm, color: colors.foreground }}>{s.name}</Text>
                    {s.email && <Text style={{ fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.xs, color: colors.mutedForeground }}>{s.email}</Text>}
                  </View>
                  <Badge variant="outline">{s.role}</Badge>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ fontFamily: typography.fontFamily.body, fontSize: typography.fontSize.sm, color: colors.mutedForeground, textAlign: "center", paddingVertical: spacing.md }}>No staff added yet</Text>
          )}
        </View>
      </DialogContent>
    </Dialog>
  );
}
