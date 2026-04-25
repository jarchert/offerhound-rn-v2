// Ported from Lovable: offerhound-repo/src/components/ClubEventCalendar.tsx
// RN-adapted verbatim. shadcn/Calendar primitive replaced with a manual month-grid
// (no react-native-calendars dependency). datetime-local inputs become two text fields.
import { useState, useMemo } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { Switch } from "@/components/ui/Switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/Dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar as CalendarIcon, Plus, Edit, Trash2, MapPin, Clock, Loader2, ChevronLeft, ChevronRight,
} from "lucide-react-native";
import {
  format, startOfMonth, endOfMonth, isSameDay, addMonths, subMonths, parseISO,
  startOfWeek, endOfWeek, addDays, isSameMonth,
} from "date-fns";
import { colors, typography, spacing, radius } from "@/lib/theme";

const EVENT_TYPES = ["practice", "game", "tournament", "showcase", "meeting", "other"];
const EVENT_TYPE_COLORS: Record<string, { bg: string; fg: string }> = {
  practice:   { bg: colors.primary + "33",   fg: colors.primary },
  game:       { bg: colors.destructive + "33", fg: colors.destructive },
  tournament: { bg: colors.accent,           fg: colors.accentForeground },
  showcase:   { bg: colors.secondary,        fg: colors.secondaryForeground },
  meeting:    { bg: colors.muted,            fg: colors.mutedForeground },
  other:      { bg: colors.muted,            fg: colors.mutedForeground },
};

interface EventForm {
  title: string;
  event_type: string;
  start_time: string;
  end_time: string;
  location: string;
  description: string;
  team_id: string;
  is_mandatory: boolean;
}

const emptyForm: EventForm = {
  title: "", event_type: "practice", start_time: "", end_time: "",
  location: "", description: "", team_id: "", is_mandatory: false,
};

export function ClubEventCalendar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  const { data: teams = [] } = useQuery({
    queryKey: ["club-event-teams", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("teams").select("id, name").eq("coach_user_id", user.id).neq("status", "archived");
      return data || [];
    },
    enabled: !!user,
  });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["club-events", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("team_events")
        .select("*, teams(name)")
        .eq("coach_user_id", user.id)
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: EventForm) => {
      if (!user) throw new Error("Not authenticated");
      if (!data.team_id) throw new Error("Please select a team");
      const payload = {
        coach_user_id: user.id,
        title: data.title,
        event_type: data.event_type,
        start_time: data.start_time,
        end_time: data.end_time || null,
        location: data.location || null,
        description: data.description || null,
        team_id: data.team_id,
        is_mandatory: data.is_mandatory,
      };
      if (editingEvent) {
        const { error } = await supabase.from("team_events").update(payload).eq("id", editingEvent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("team_events").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["club-events"] });
      setShowAddDialog(false);
      setEditingEvent(null);
      setForm(emptyForm);
      toast({ title: editingEvent ? "Event Updated" : "Event Created" });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("team_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["club-events"] });
      toast({ title: "Event Deleted" });
    },
  });

  const openEdit = (event: any) => {
    setEditingEvent(event);
    setForm({
      title: event.title,
      event_type: event.event_type,
      start_time: event.start_time?.slice(0, 16) || "",
      end_time: event.end_time?.slice(0, 16) || "",
      location: event.location || "",
      description: event.description || "",
      team_id: event.team_id,
      is_mandatory: event.is_mandatory || false,
    });
    setShowAddDialog(true);
  };

  const openAddOnDate = (date: Date) => {
    setEditingEvent(null);
    const dateStr = format(date, "yyyy-MM-dd'T'09:00");
    setForm({ ...emptyForm, start_time: dateStr });
    setShowAddDialog(true);
  };

  const monthEvents = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return events.filter((e: any) => {
      const d = parseISO(e.start_time);
      return d >= start && d <= end;
    });
  }, [events, currentMonth]);

  const getEventsForDate = (date: Date) => {
    return events.filter((e: any) => isSameDay(parseISO(e.start_time), date));
  };

  // Build month grid days (Sun-start week, like shadcn default).
  const monthGridDays = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
    const gridEnd = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    const days: Date[] = [];
    let d = gridStart;
    while (d <= gridEnd) { days.push(d); d = addDays(d, 1); }
    return days;
  }, [currentMonth]);

  const upcomingEvents = events.filter((e: any) => new Date(e.start_time) >= new Date()).slice(0, 10);

  return (
    <ScrollView contentContainerStyle={{ gap: spacing.lg, padding: spacing.md }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: spacing.md }}>
        <View style={{ flexShrink: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
            <CalendarIcon size={20} color={colors.foreground} />
            <Text style={s.h2}>Event Calendar</Text>
          </View>
          <Text style={s.muted}>Schedule practices, games, tournaments, and meetings</Text>
        </View>
        <View style={{ flexDirection: "row", gap: spacing.xs }}>
          <Button variant={view === "calendar" ? "default" : "outline"} size="sm" onPress={() => setView("calendar")}>Calendar</Button>
          <Button variant={view === "list" ? "default" : "outline"} size="sm" onPress={() => setView("list")}>List</Button>
          <Button onPress={() => { setEditingEvent(null); setForm(emptyForm); setShowAddDialog(true); }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
              <Plus size={16} color={colors.primaryForeground} />
              <Text style={{ color: colors.primaryForeground, fontFamily: typography.fontFamily.bodySemiBold }}>Add Event</Text>
            </View>
          </Button>
        </View>
      </View>

      {view === "calendar" ? (
        <Card>
          <CardHeader style={{ paddingBottom: spacing.xs }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Button variant="ghost" size="sm" onPress={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft size={16} color={colors.foreground} />
              </Button>
              <CardTitle>{format(currentMonth, "MMMM yyyy")}</CardTitle>
              <Button variant="ghost" size="sm" onPress={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight size={16} color={colors.foreground} />
              </Button>
            </View>
          </CardHeader>
          <CardContent>
            {/* Weekday headers */}
            <View style={{ flexDirection: "row" }}>
              {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((w) => (
                <Text key={w} style={[s.weekday, { flex: 1 }]}>{w}</Text>
              ))}
            </View>
            {/* Month grid */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: spacing.xs }}>
              {monthGridDays.map((d) => {
                const inMonth = isSameMonth(d, currentMonth);
                const hasEvent = getEventsForDate(d).length > 0;
                const isSelected = selectedDate && isSameDay(d, selectedDate);
                return (
                  <Pressable
                    key={d.toISOString()}
                    onPress={() => setSelectedDate(d)}
                    style={{
                      width: `${100/7}%`,
                      aspectRatio: 1,
                      alignItems: "center",
                      justifyContent: "center",
                      padding: 2,
                    }}
                  >
                    <View style={{
                      flex: 1,
                      width: "100%",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: radius.md,
                      backgroundColor: isSelected ? colors.primary : (hasEvent ? colors.primary + "33" : "transparent"),
                    }}>
                      <Text style={{
                        fontFamily: hasEvent ? typography.fontFamily.bodySemiBold : typography.fontFamily.body,
                        color: isSelected ? colors.primaryForeground : (inMonth ? colors.foreground : colors.mutedForeground),
                        fontSize: typography.fontSize.sm,
                      }}>
                        {format(d, "d")}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            {selectedDate && (
              <View style={{ marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md, gap: spacing.xs }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={s.bodyMed}>{format(selectedDate, "EEEE, MMMM d")}</Text>
                  <Button variant="outline" size="sm" onPress={() => openAddOnDate(selectedDate)}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Plus size={12} color={colors.foreground} />
                      <Text style={{ color: colors.foreground, fontSize: typography.fontSize.xs }}>Add</Text>
                    </View>
                  </Button>
                </View>
                {getEventsForDate(selectedDate).length === 0 ? (
                  <Text style={s.xsMuted}>No events this day</Text>
                ) : (
                  getEventsForDate(selectedDate).map((e: any) => {
                    const tc = EVENT_TYPE_COLORS[e.event_type] || EVENT_TYPE_COLORS.other;
                    return (
                      <View key={e.id} style={s.eventRow}>
                        <Badge style={{ backgroundColor: tc.bg }}>{e.event_type}</Badge>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={s.bodyMed}>{e.title}</Text>
                          {e.location && (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                              <MapPin size={12} color={colors.mutedForeground} />
                              <Text style={s.xsMuted}>{e.location}</Text>
                            </View>
                          )}
                          <Text style={s.xsMuted}>{format(parseISO(e.start_time), "h:mm a")}</Text>
                        </View>
                        <Button variant="ghost" size="sm" onPress={() => openEdit(e)}>
                          <Edit size={12} color={colors.foreground} />
                        </Button>
                        <Button variant="ghost" size="sm" onPress={() => deleteMutation.mutate(e.id)}>
                          <Trash2 size={12} color={colors.destructive} />
                        </Button>
                      </View>
                    );
                  })
                )}
              </View>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <View style={{ alignItems: "center", paddingVertical: spacing.xl }}>
                <ActivityIndicator size="small" color={colors.mutedForeground} />
              </View>
            ) : upcomingEvents.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: spacing.xl }}>
                <CalendarIcon size={48} color={colors.mutedForeground} />
                <Text style={[s.muted, { marginTop: spacing.md }]}>No upcoming events</Text>
              </View>
            ) : (
              <View style={{ gap: spacing.sm }}>
                {upcomingEvents.map((e: any) => {
                  const tc = EVENT_TYPE_COLORS[e.event_type] || EVENT_TYPE_COLORS.other;
                  return (
                    <View key={e.id} style={s.upcomingRow}>
                      <View style={{ width: 56, alignItems: "center" }}>
                        <Text style={[s.xsMuted, { textTransform: "uppercase" }]}>{format(parseISO(e.start_time), "MMM")}</Text>
                        <Text style={s.dateBig}>{format(parseISO(e.start_time), "d")}</Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, flexWrap: "wrap", marginBottom: 2 }}>
                          <Text style={s.bodyMed}>{e.title}</Text>
                          <Badge style={{ backgroundColor: tc.bg }}>{e.event_type}</Badge>
                          {e.is_mandatory && <Badge variant="destructive">Required</Badge>}
                        </View>
                        {e.teams?.name && <Text style={{ fontSize: typography.fontSize.xs, color: colors.primary }}>{e.teams.name}</Text>}
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: 2 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                            <Clock size={12} color={colors.mutedForeground} />
                            <Text style={s.xsMuted}>
                              {format(parseISO(e.start_time), "h:mm a")}{e.end_time ? ` - ${format(parseISO(e.end_time), "h:mm a")}` : ""}
                            </Text>
                          </View>
                          {e.location && (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                              <MapPin size={12} color={colors.mutedForeground} />
                              <Text style={s.xsMuted}>{e.location}</Text>
                            </View>
                          )}
                        </View>
                        {e.description && <Text style={[s.xsMuted, { marginTop: 2 }]}>{e.description}</Text>}
                      </View>
                      <View style={{ flexDirection: "row", gap: 4 }}>
                        <Button variant="ghost" size="sm" onPress={() => openEdit(e)}>
                          <Edit size={12} color={colors.foreground} />
                        </Button>
                        <Button variant="ghost" size="sm" onPress={() => deleteMutation.mutate(e.id)}>
                          <Trash2 size={12} color={colors.destructive} />
                        </Button>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open: boolean) => { if (!open) { setShowAddDialog(false); setEditingEvent(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingEvent ? "Edit Event" : "Create Event"}</DialogTitle></DialogHeader>
          <View style={{ gap: spacing.md }}>
            <View style={{ gap: spacing.xs }}>
              <Label>Title *</Label>
              <Input value={form.title} onChangeText={(v) => setForm({ ...form, title: v })} />
            </View>
            <View style={{ gap: spacing.xs }}>
              <Label>Type</Label>
              <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </View>
            <View style={{ gap: spacing.xs }}>
              <Label>Start * (YYYY-MM-DDTHH:MM)</Label>
              <Input value={form.start_time} onChangeText={(v) => setForm({ ...form, start_time: v })} placeholder="2025-01-15T18:00" />
            </View>
            <View style={{ gap: spacing.xs }}>
              <Label>End (YYYY-MM-DDTHH:MM)</Label>
              <Input value={form.end_time} onChangeText={(v) => setForm({ ...form, end_time: v })} placeholder="2025-01-15T20:00" />
            </View>
            <View style={{ gap: spacing.xs }}>
              <Label>Team *</Label>
              <Select value={form.team_id} onValueChange={(v) => setForm({ ...form, team_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select team" /></SelectTrigger>
                <SelectContent>
                  {teams.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </View>
            <View style={{ gap: spacing.xs }}>
              <Label>Location</Label>
              <Input value={form.location} onChangeText={(v) => setForm({ ...form, location: v })} />
            </View>
            <View style={{ gap: spacing.xs }}>
              <Label>Description</Label>
              <Textarea value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} numberOfLines={2} />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
              <Switch value={form.is_mandatory} onValueChange={(v: boolean) => setForm({ ...form, is_mandatory: v })} />
              <Label>Mandatory attendance</Label>
            </View>
          </View>
          <DialogFooter>
            <Button variant="outline" onPress={() => { setShowAddDialog(false); setEditingEvent(null); }}>Cancel</Button>
            <Button
              onPress={() => saveMutation.mutate(form)}
              disabled={!form.title.trim() || !form.start_time || !form.team_id || saveMutation.isPending}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
                {saveMutation.isPending && <ActivityIndicator size="small" color={colors.primaryForeground} />}
                <Text style={{ color: colors.primaryForeground, fontFamily: typography.fontFamily.bodySemiBold }}>
                  {editingEvent ? "Update" : "Create"}
                </Text>
              </View>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ScrollView>
  );
}

export default ClubEventCalendar;

const s = StyleSheet.create({
  h2: { fontFamily: typography.fontFamily.heading, color: colors.foreground, fontSize: typography.fontSize.xl },
  muted: { fontFamily: typography.fontFamily.body, color: colors.mutedForeground, fontSize: typography.fontSize.sm },
  bodyMed: { fontFamily: typography.fontFamily.bodySemiBold, color: colors.foreground, fontSize: typography.fontSize.sm },
  xsMuted: { fontFamily: typography.fontFamily.body, color: colors.mutedForeground, fontSize: typography.fontSize.xs },
  weekday: { fontFamily: typography.fontFamily.body, color: colors.mutedForeground, fontSize: 12, textAlign: "center" },
  eventRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.muted,
    borderRadius: radius.md,
  },
  upcomingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  dateBig: { fontFamily: typography.fontFamily.heading, color: colors.foreground, fontSize: typography.fontSize["2xl"] },
});
