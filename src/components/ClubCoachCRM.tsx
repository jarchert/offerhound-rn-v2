import { useState } from "react";
import { View, Text, ScrollView, Pressable, Linking, StyleSheet } from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/Dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Contact, Plus, Search, Tag, Mail, Phone, Edit, Trash2,
  Send, Loader2, Building, User
} from "lucide-react-native";
import { formatDistanceToNow } from "date-fns";
import { colors, typography, spacing, radius } from "@/lib/theme";

const CONTACT_TYPES = ["college_coach", "scout", "recruiter", "parent", "prospect_player", "agency", "event_operator", "other"];
const CONTACT_TYPE_LABELS: Record<string, string> = {
  college_coach: "College Coach",
  scout: "Scout",
  recruiter: "Recruiter",
  parent: "Parent",
  prospect_player: "Prospect Player",
  agency: "Agency",
  event_operator: "Event Operator",
  other: "Other",
};

interface ContactFormData {
  contact_name: string;
  contact_type: string;
  email: string;
  phone: string;
  organization: string;
  title: string;
  notes: string;
  tags: string;
}

const emptyForm: ContactFormData = {
  contact_name: "", contact_type: "college_coach", email: "", phone: "",
  organization: "", title: "", notes: "", tags: "",
};

export function ClubCoachCRM() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [form, setForm] = useState<ContactFormData>(emptyForm);
  const [logMessage, setLogMessage] = useState("");
  const [logChannel, setLogChannel] = useState("email");
  const [logDirection, setLogDirection] = useState("outbound");
  const [activeTab, setActiveTab] = useState("details");

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["club-crm-contacts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("club_coach_contacts")
        .select("*")
        .eq("coach_user_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: contactHistory = [] } = useQuery({
    queryKey: ["club-crm-history", selectedContact?.id],
    queryFn: async () => {
      if (!selectedContact) return [];
      const { data, error } = await supabase
        .from("club_coach_contact_history")
        .select("*")
        .eq("contact_id", selectedContact.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedContact,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: ContactFormData) => {
      if (!user) throw new Error("Not authenticated");
      const tags = data.tags.split(",").map(t => t.trim()).filter(Boolean);
      const payload = {
        coach_user_id: user.id,
        contact_name: data.contact_name,
        contact_type: data.contact_type,
        email: data.email || null,
        phone: data.phone || null,
        organization: data.organization || null,
        title: data.title || null,
        notes: data.notes || null,
        tags: tags.length > 0 ? tags : null,
      };
      if (editingContact) {
        const { error } = await supabase
          .from("club_coach_contacts")
          .update(payload)
          .eq("id", editingContact.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("club_coach_contacts")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["club-crm-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["club-contacts-count"] });
      setShowAddDialog(false);
      setEditingContact(null);
      setForm(emptyForm);
      toast({ title: editingContact ? "Contact Updated" : "Contact Added" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("club_coach_contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["club-crm-contacts"] });
      queryClient.invalidateQueries({ queryKey: ["club-contacts-count"] });
      setSelectedContact(null);
      toast({ title: "Contact Deleted" });
    },
  });

  const logMutation = useMutation({
    mutationFn: async () => {
      if (!user || !selectedContact) throw new Error("Missing data");
      const { error } = await supabase.from("club_coach_contact_history").insert({
        coach_user_id: user.id,
        contact_id: selectedContact.id,
        channel: logChannel,
        direction: logDirection,
        subject: logMessage.slice(0, 100),
        body: logMessage,
      });
      if (error) throw error;
      await supabase
        .from("club_coach_contacts")
        .update({ last_contacted_at: new Date().toISOString() })
        .eq("id", selectedContact.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["club-crm-history"] });
      queryClient.invalidateQueries({ queryKey: ["club-crm-contacts"] });
      setLogMessage("");
      toast({ title: "Communication Logged" });
    },
  });

  const openEdit = (contact: any) => {
    setEditingContact(contact);
    setForm({
      contact_name: contact.contact_name,
      contact_type: contact.contact_type,
      email: contact.email || "",
      phone: contact.phone || "",
      organization: contact.organization || "",
      title: contact.title || "",
      notes: contact.notes || "",
      tags: (contact.tags || []).join(", "),
    });
    setShowAddDialog(true);
  };

  const filteredContacts = contacts.filter((c: any) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      c.contact_name.toLowerCase().includes(q) ||
      (c.organization || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q);
    const matchesType = filterType === "all" || c.contact_type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <ScrollView contentContainerStyle={s.root}>
      {/* Header */}
      <View style={s.headerRow}>
        <View style={{ flex: 1 }}>
          <View style={s.headerTitleRow}>
            <Contact width={20} height={20} color={colors.foreground} />
            <Text style={s.headerTitle}>Contact CRM</Text>
          </View>
          <Text style={s.headerSubtitle}>Manage your recruiting network contacts</Text>
        </View>
        <Button onPress={() => { setEditingContact(null); setForm(emptyForm); setShowAddDialog(true); }}>
          <View style={s.btnInline}>
            <Plus width={16} height={16} color={colors.primaryForeground} />
            <Text style={s.btnInlineText}>Add Contact</Text>
          </View>
        </Button>
      </View>

      {/* Filters */}
      <View style={s.filtersRow}>
        <View style={s.searchWrap}>
          <Search width={16} height={16} color={colors.mutedForeground} style={s.searchIcon} />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={s.searchInput}
          />
        </View>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger style={s.filterSelect}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {CONTACT_TYPES.map(t => (
              <SelectItem key={t} value={t}>{CONTACT_TYPE_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </View>

      <View style={s.grid}>
        {/* Contact List */}
        <View style={s.listCol}>
          <Card>
            <CardHeader style={s.listCardHeader}>
              <CardTitle>{`Contacts (${filteredContacts.length})`}</CardTitle>
            </CardHeader>
            <CardContent style={s.listCardContent}>
              <ScrollArea style={s.listScroll}>
                {isLoading ? (
                  <View style={s.centerPad}>
                    <Loader2 width={24} height={24} color={colors.mutedForeground} />
                  </View>
                ) : filteredContacts.length === 0 ? (
                  <Text style={s.emptyText}>No contacts found</Text>
                ) : (
                  <View>
                    {filteredContacts.map((contact: any) => {
                      const selected = selectedContact?.id === contact.id;
                      return (
                        <Pressable
                          key={contact.id}
                          onPress={() => setSelectedContact(contact)}
                          style={[s.contactRow, selected && s.contactRowSelected]}
                        >
                          <View style={s.avatar}>
                            <User width={16} height={16} color={colors.primary} />
                          </View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={s.contactName} numberOfLines={1}>{contact.contact_name}</Text>
                            {contact.organization ? (
                              <Text style={s.contactOrg} numberOfLines={1}>{contact.organization}</Text>
                            ) : null}
                            <View style={s.badgeWrap}>
                              <Badge variant="outline">
                                <Text style={s.badgeTinyText}>{CONTACT_TYPE_LABELS[contact.contact_type]}</Text>
                              </Badge>
                            </View>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </View>

        {/* Contact Detail */}
        <View style={s.detailCol}>
          {selectedContact ? (
            <Card>
              <CardHeader>
                <View style={s.detailHeaderRow}>
                  <View style={{ flex: 1 }}>
                    <CardTitle>{selectedContact.contact_name}</CardTitle>
                    <CardDescription>
                      {CONTACT_TYPE_LABELS[selectedContact.contact_type]}
                      {selectedContact.organization ? ` • ${selectedContact.organization}` : ""}
                    </CardDescription>
                  </View>
                  <View style={s.detailActions}>
                    <Button variant="outline" size="sm" onPress={() => openEdit(selectedContact)}>
                      <View style={s.btnInline}>
                        <Edit width={12} height={12} color={colors.foreground} />
                        <Text style={s.btnInlineSmText}>Edit</Text>
                      </View>
                    </Button>
                    <Button variant="outline" size="sm" onPress={() => deleteMutation.mutate(selectedContact.id)}>
                      <Trash2 width={12} height={12} color={colors.destructive} />
                    </Button>
                  </View>
                </View>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList style={s.tabsListGrid}>
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="history">{`History (${contactHistory.length})`}</TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" style={s.tabContent}>
                    <View style={s.detailFieldsGrid}>
                      {selectedContact.title ? (
                        <View style={s.fieldRow}>
                          <User width={16} height={16} color={colors.mutedForeground} />
                          <View style={{ flex: 1 }}>
                            <Text style={s.fieldLabel}>Title</Text>
                            <Text style={s.fieldValue}>{selectedContact.title}</Text>
                          </View>
                        </View>
                      ) : null}
                      {selectedContact.email ? (
                        <View style={s.fieldRow}>
                          <Mail width={16} height={16} color={colors.mutedForeground} />
                          <View style={{ flex: 1 }}>
                            <Text style={s.fieldLabel}>Email</Text>
                            <Text
                              style={s.fieldLink}
                              onPress={() => Linking.openURL(`mailto:${selectedContact.email}`)}
                            >
                              {selectedContact.email}
                            </Text>
                          </View>
                        </View>
                      ) : null}
                      {selectedContact.phone ? (
                        <View style={s.fieldRow}>
                          <Phone width={16} height={16} color={colors.mutedForeground} />
                          <View style={{ flex: 1 }}>
                            <Text style={s.fieldLabel}>Phone</Text>
                            <Text style={s.fieldValue}>{selectedContact.phone}</Text>
                          </View>
                        </View>
                      ) : null}
                      {selectedContact.organization ? (
                        <View style={s.fieldRow}>
                          <Building width={16} height={16} color={colors.mutedForeground} />
                          <View style={{ flex: 1 }}>
                            <Text style={s.fieldLabel}>Organization</Text>
                            <Text style={s.fieldValue}>{selectedContact.organization}</Text>
                          </View>
                        </View>
                      ) : null}
                    </View>

                    {selectedContact.tags && selectedContact.tags.length > 0 ? (
                      <View style={{ marginTop: spacing.md }}>
                        <Text style={s.sectionLabel}>Tags</Text>
                        <View style={s.tagsWrap}>
                          {selectedContact.tags.map((tag: string) => (
                            <Badge key={tag} variant="secondary">
                              <View style={s.tagInner}>
                                <Tag width={12} height={12} color={colors.secondaryForeground} />
                                <Text style={s.tagText}>{tag}</Text>
                              </View>
                            </Badge>
                          ))}
                        </View>
                      </View>
                    ) : null}

                    {selectedContact.notes ? (
                      <View style={{ marginTop: spacing.md }}>
                        <Text style={s.sectionLabel}>Notes</Text>
                        <Text style={s.notesBlock}>{selectedContact.notes}</Text>
                      </View>
                    ) : null}

                    {selectedContact.last_contacted_at ? (
                      <Text style={[s.fieldLabel, { marginTop: spacing.md }]}>
                        {`Last contacted ${formatDistanceToNow(new Date(selectedContact.last_contacted_at), { addSuffix: true })}`}
                      </Text>
                    ) : null}
                  </TabsContent>

                  <TabsContent value="history" style={s.tabContent}>
                    {/* Log new communication */}
                    <View style={s.logBox}>
                      <Text style={s.logTitle}>Log Communication</Text>
                      <View style={s.logSelectsRow}>
                        <Select value={logChannel} onValueChange={setLogChannel}>
                          <SelectTrigger style={s.logSelect}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="phone">Phone</SelectItem>
                            <SelectItem value="in_app">In-App</SelectItem>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={logDirection} onValueChange={setLogDirection}>
                          <SelectTrigger style={s.logSelect}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="outbound">Outbound</SelectItem>
                            <SelectItem value="inbound">Inbound</SelectItem>
                          </SelectContent>
                        </Select>
                      </View>
                      <Textarea
                        placeholder="Describe the interaction..."
                        value={logMessage}
                        onChangeText={setLogMessage}
                        rows={2}
                      />
                      <Button
                        size="sm"
                        disabled={!logMessage.trim() || logMutation.isPending}
                        onPress={() => logMutation.mutate()}
                      >
                        <View style={s.btnInline}>
                          {logMutation.isPending
                            ? <Loader2 width={16} height={16} color={colors.primaryForeground} />
                            : <Send width={16} height={16} color={colors.primaryForeground} />}
                          <Text style={s.btnInlineText}>Log Entry</Text>
                        </View>
                      </Button>
                    </View>

                    {/* History list */}
                    <ScrollArea style={s.historyScroll}>
                      {contactHistory.length === 0 ? (
                        <Text style={s.emptyText}>No communication history yet</Text>
                      ) : (
                        <View>
                          {contactHistory.map((entry: any) => (
                            <View key={entry.id} style={s.historyEntry}>
                              <View style={s.historyHeaderRow}>
                                <Badge variant={entry.direction === "outbound" ? "default" : "secondary"}>
                                  <Text style={s.badgeTinyText}>{entry.direction}</Text>
                                </Badge>
                                <Badge variant="outline">
                                  <Text style={s.badgeTinyText}>{entry.channel}</Text>
                                </Badge>
                                <Text style={s.historyTime}>
                                  {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                                </Text>
                              </View>
                              {entry.subject ? <Text style={s.historySubject}>{entry.subject}</Text> : null}
                              {entry.body ? <Text style={s.historyBody}>{entry.body}</Text> : null}
                            </View>
                          ))}
                        </View>
                      )}
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent style={s.placeholderCard}>
                <Contact width={48} height={48} color={colors.mutedForeground} />
                <Text style={s.placeholderTitle}>Select a Contact</Text>
                <Text style={s.placeholderText}>
                  Choose a contact from the list to view details and communication history
                </Text>
              </CardContent>
            </Card>
          )}
        </View>
      </View>

      {/* Add/Edit Dialog */}
      <Dialog
        open={showAddDialog}
        onOpenChange={(open: boolean) => {
          if (!open) { setShowAddDialog(false); setEditingContact(null); }
        }}
      >
        <DialogContent style={s.dialogContent}>
          <DialogHeader>
            <DialogTitle>{editingContact ? "Edit Contact" : "Add Contact"}</DialogTitle>
          </DialogHeader>
          <View style={s.dialogBody}>
            <View style={s.dialogFieldsGrid}>
              <View style={s.dialogField}>
                <Label>Name *</Label>
                <Input value={form.contact_name} onChangeText={(v: string) => setForm({ ...form, contact_name: v })} placeholder="Full name" />
              </View>
              <View style={s.dialogField}>
                <Label>Type</Label>
                <Select value={form.contact_type} onValueChange={(v: string) => setForm({ ...form, contact_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTACT_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{CONTACT_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </View>
              <View style={s.dialogField}>
                <Label>Email</Label>
                <Input keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={(v: string) => setForm({ ...form, email: v })} />
              </View>
              <View style={s.dialogField}>
                <Label>Phone</Label>
                <Input keyboardType="phone-pad" value={form.phone} onChangeText={(v: string) => setForm({ ...form, phone: v })} />
              </View>
              <View style={s.dialogField}>
                <Label>Organization</Label>
                <Input value={form.organization} onChangeText={(v: string) => setForm({ ...form, organization: v })} />
              </View>
              <View style={s.dialogField}>
                <Label>Title</Label>
                <Input value={form.title} onChangeText={(v: string) => setForm({ ...form, title: v })} />
              </View>
            </View>
            <View style={s.dialogField}>
              <Label>Tags (comma-separated)</Label>
              <Input value={form.tags} onChangeText={(v: string) => setForm({ ...form, tags: v })} placeholder="e.g. D1, Football, Priority" />
            </View>
            <View style={s.dialogField}>
              <Label>Notes</Label>
              <Textarea value={form.notes} onChangeText={(v: string) => setForm({ ...form, notes: v })} rows={3} />
            </View>
          </View>
          <DialogFooter>
            <Button variant="outline" onPress={() => { setShowAddDialog(false); setEditingContact(null); }}>
              <Text style={s.btnOutlineText}>Cancel</Text>
            </Button>
            <Button
              onPress={() => saveMutation.mutate(form)}
              disabled={!form.contact_name.trim() || saveMutation.isPending}
            >
              <View style={s.btnInline}>
                {saveMutation.isPending ? <Loader2 width={16} height={16} color={colors.primaryForeground} /> : null}
                <Text style={s.btnInlineText}>{editingContact ? "Update" : "Add Contact"}</Text>
              </View>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ScrollView>
  );
}

export default ClubCoachCRM;

const s = StyleSheet.create({
  root: { padding: spacing.md, gap: spacing.lg },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md, flexWrap: 'wrap' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTitle: { fontFamily: typography.fontFamily.heading, color: colors.foreground, fontSize: typography.heading.h4, letterSpacing: typography.letterSpacing.heading },
  headerSubtitle: { fontFamily: typography.fontFamily.body, color: colors.mutedForeground, fontSize: typography.fontSize.sm, marginTop: 2 },
  btnInline: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  btnInlineText: { fontFamily: typography.fontFamily.bodySemiBold, color: colors.primaryForeground, fontSize: typography.fontSize.sm },
  btnInlineSmText: { fontFamily: typography.fontFamily.bodySemiBold, color: colors.foreground, fontSize: typography.fontSize.xs },
  btnOutlineText: { fontFamily: typography.fontFamily.bodySemiBold, color: colors.foreground, fontSize: typography.fontSize.sm },
  filtersRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  searchWrap: { flex: 1, minWidth: 200, position: 'relative' },
  searchIcon: { position: 'absolute', left: spacing.sm, top: 12, zIndex: 1 },
  searchInput: { paddingLeft: spacing.lg + spacing.xs },
  filterSelect: { minWidth: 180 },
  grid: { flexDirection: 'column', gap: spacing.lg },
  listCol: { width: '100%' },
  detailCol: { width: '100%' },
  listCardHeader: { paddingBottom: spacing.sm },
  listCardContent: { padding: 0 },
  listScroll: { maxHeight: 500 },
  centerPad: { padding: spacing.xl, alignItems: 'center' },
  emptyText: { fontFamily: typography.fontFamily.body, color: colors.mutedForeground, fontSize: typography.fontSize.sm, textAlign: 'center', paddingVertical: spacing.xl },
  contactRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  contactRowSelected: { backgroundColor: colors.muted, borderLeftWidth: 2, borderLeftColor: colors.primary },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  contactName: { fontFamily: typography.fontFamily.bodyMedium, color: colors.foreground, fontSize: typography.fontSize.sm },
  contactOrg: { fontFamily: typography.fontFamily.body, color: colors.mutedForeground, fontSize: typography.fontSize.xs },
  badgeWrap: { flexDirection: 'row', marginTop: 4 },
  badgeTinyText: { fontFamily: typography.fontFamily.body, fontSize: 10, color: colors.foreground },
  detailHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  detailActions: { flexDirection: 'row', gap: spacing.sm },
  tabsListGrid: { flexDirection: 'row' },
  tabContent: { gap: spacing.md, paddingTop: spacing.md },
  detailFieldsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexBasis: '48%', flexGrow: 1, minWidth: 160 },
  fieldLabel: { fontFamily: typography.fontFamily.body, color: colors.mutedForeground, fontSize: typography.fontSize.xs },
  fieldValue: { fontFamily: typography.fontFamily.body, color: colors.foreground, fontSize: typography.fontSize.sm },
  fieldLink: { fontFamily: typography.fontFamily.body, color: colors.primary, fontSize: typography.fontSize.sm, textDecorationLine: 'underline' },
  sectionLabel: { fontFamily: typography.fontFamily.body, color: colors.mutedForeground, fontSize: typography.fontSize.xs, marginBottom: spacing.xs },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tagInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tagText: { fontFamily: typography.fontFamily.body, color: colors.secondaryForeground, fontSize: typography.fontSize.xs },
  notesBlock: { fontFamily: typography.fontFamily.body, color: colors.foreground, fontSize: typography.fontSize.sm, backgroundColor: colors.muted, padding: spacing.sm, borderRadius: radius.md },
  logBox: { padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, gap: spacing.sm },
  logTitle: { fontFamily: typography.fontFamily.bodyMedium, color: colors.foreground, fontSize: typography.fontSize.sm },
  logSelectsRow: { flexDirection: 'row', gap: spacing.sm },
  logSelect: { width: 128 },
  historyScroll: { maxHeight: 300 },
  historyEntry: { padding: spacing.sm, backgroundColor: colors.muted, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm },
  historyHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  historyTime: { marginLeft: 'auto', fontFamily: typography.fontFamily.body, color: colors.mutedForeground, fontSize: typography.fontSize.xs },
  historySubject: { fontFamily: typography.fontFamily.bodyMedium, color: colors.foreground, fontSize: typography.fontSize.sm },
  historyBody: { fontFamily: typography.fontFamily.body, color: colors.mutedForeground, fontSize: typography.fontSize.sm, marginTop: 2 },
  placeholderCard: { paddingVertical: spacing.xxl, alignItems: 'center', justifyContent: 'center' },
  placeholderTitle: { fontFamily: typography.fontFamily.bodySemiBold, color: colors.foreground, fontSize: typography.fontSize.base, marginTop: spacing.md, marginBottom: spacing.xs },
  placeholderText: { fontFamily: typography.fontFamily.body, color: colors.mutedForeground, fontSize: typography.fontSize.sm, textAlign: 'center' },
  dialogContent: { maxWidth: 560 },
  dialogBody: { gap: spacing.md },
  dialogFieldsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  dialogField: { gap: spacing.xs, flexBasis: '48%', flexGrow: 1, minWidth: 160 },
});
