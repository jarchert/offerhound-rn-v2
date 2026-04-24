import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import {
  useMessageTemplates,
  useCreateMessageTemplate,
  useDeleteMessageTemplate,
  useCreateBulkMessageJob,
  applyTemplateVariables,
  type MessageTemplate,
} from "@/hooks/useMessageTemplates";
import { useSavedAthletes } from "@/hooks/useSavedAthletes";
import { useCoachProfile } from "@/hooks/useCoachProfile";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Checkbox } from "@/components/ui/Checkbox";
import { Avatar } from "@/components/ui/Avatar";
import { ScrollArea } from "@/components/ui/ScrollArea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import {
  Loader2,
  Plus,
  Send,
  FileText,
  Trash2,
  Users,
  Mail,
  Eye,
  Check,
} from "lucide-react-native";
import { useToast } from "@/hooks/use-toast";
import { colors, spacing, typography } from "@/lib/theme";

const templateTypes: { value: MessageTemplate["template_type"]; label: string }[] = [
  { value: "general", label: "General" },
  { value: "initial_outreach", label: "Initial Outreach" },
  { value: "camp_invite", label: "Camp Invite" },
  { value: "follow_up", label: "Follow Up" },
  { value: "offer", label: "Offer Letter" },
  { value: "visit_invite", label: "Visit Invitation" },
];

const defaultVariables = [
  "{{athlete_name}}",
  "{{position}}",
  "{{school}}",
  "{{city}}",
  "{{state}}",
  "{{graduation_year}}",
  "{{coach_name}}",
  "{{coach_title}}",
  "{{coach_school}}",
];

export function BulkMessageComposer() {
  const { data: templates, isLoading: templatesLoading } = useMessageTemplates();
  const { data: savedAthletes, isLoading: athletesLoading } = useSavedAthletes();
  const { data: coachProfile } = useCoachProfile();
  const createTemplate = useCreateMessageTemplate();
  const deleteTemplate = useDeleteMessageTemplate();
  const createBulkJob = useCreateBulkMessageJob();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("compose");
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [includeParents, setIncludeParents] = useState(false);
  const [previewAthlete, setPreviewAthlete] = useState<any>(null);

  const [newTemplate, setNewTemplate] = useState({
    name: "",
    subject: "",
    content: "",
    templateType: "general" as MessageTemplate["template_type"],
  });

  const isLoading = templatesLoading || athletesLoading;

  const handleCreateTemplate = () => {
    createTemplate.mutate({
      name: newTemplate.name,
      subject: newTemplate.subject || undefined,
      content: newTemplate.content,
      templateType: newTemplate.templateType,
    });
    setIsCreateTemplateOpen(false);
    setNewTemplate({
      name: "",
      subject: "",
      content: "",
      templateType: "general",
    });
  };

  const handleSelectAll = () => {
    if (selectedAthletes.length === savedAthletes?.length) {
      setSelectedAthletes([]);
    } else {
      setSelectedAthletes(savedAthletes?.map((a: any) => a.athlete_profile_id) || []);
    }
  };

  const toggleAthleteSelection = (athleteId: string) => {
    setSelectedAthletes((prev) =>
      prev.includes(athleteId)
        ? prev.filter((id) => id !== athleteId)
        : [...prev, athleteId]
    );
  };

  const handleSendBulkMessage = () => {
    if (!selectedTemplate || selectedAthletes.length === 0) {
      toast({
        title: "Error",
        description: "Please select a template and at least one athlete.",
        variant: "destructive",
      });
      return;
    }

    createBulkJob.mutate({
      templateId: selectedTemplate.id,
      athleteIds: selectedAthletes,
      includeParents,
    });

    setSelectedAthletes([]);
    setSelectedTemplate(null);
  };

  const getPreviewContent = () => {
    if (!selectedTemplate || !previewAthlete) return "";

    return applyTemplateVariables(
      selectedTemplate.content,
      {
        full_name: previewAthlete.athlete?.full_name,
        position: previewAthlete.athlete?.position,
        school: previewAthlete.athlete?.school,
        city: previewAthlete.athlete?.city,
        state: previewAthlete.athlete?.state,
        graduation_year: previewAthlete.athlete?.graduation_year,
      },
      {
        name: coachProfile?.name,
        title: coachProfile?.title,
        school: coachProfile?.school,
      }
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Loader2 width={24} height={24} color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <View style={styles.root}>
        <View style={styles.headerRow}>
          <View>
            <View style={styles.titleRow}>
              <Mail width={20} height={20} color={colors.foreground} />
              <Text style={styles.h2}>Bulk Messaging</Text>
            </View>
            <Text style={styles.subtitle}>
              Send personalized messages to multiple athletes at once
            </Text>
          </View>
        </View>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="compose">Compose Message</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="compose" style={styles.tabContent}>
            {/* Step 1: Select Template */}
            <Card>
              <CardHeader>
                <View style={styles.stepTitleRow}>
                  <View style={styles.stepCircle}>
                    <Text style={styles.stepCircleText}>1</Text>
                  </View>
                  <CardTitle>Select Template</CardTitle>
                </View>
              </CardHeader>
              <CardContent>
                {templates && templates.length > 0 ? (
                  <View style={styles.templateGrid}>
                    {templates.map((template) => {
                      const selected = selectedTemplate?.id === template.id;
                      return (
                        <Pressable
                          key={template.id}
                          onPress={() => setSelectedTemplate(template)}
                          style={[styles.templateCard, selected && styles.templateCardSelected]}
                        >
                          <View style={styles.templateCardTop}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.templateName}>{template.name}</Text>
                              <View style={{ marginTop: 4, alignSelf: "flex-start" }}>
                                <Badge variant="secondary">
                                  {templateTypes.find((t) => t.value === template.template_type)?.label}
                                </Badge>
                              </View>
                            </View>
                            {selected && <Check width={20} height={20} color={colors.primary} />}
                          </View>
                          <Text numberOfLines={2} style={styles.templatePreview}>
                            {template.content.substring(0, 100)}...
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.emptyBlock}>
                    <FileText width={48} height={48} color={colors.mutedForeground} />
                    <Text style={styles.emptyText}>No templates yet.</Text>
                    <View style={{ marginTop: spacing.md }}>
                      <Button
                        variant="outline"
                        onPress={() => setIsCreateTemplateOpen(true)}
                        leftIcon={<Plus width={16} height={16} color={colors.foreground} />}
                      >
                        Create Your First Template
                      </Button>
                    </View>
                  </View>
                )}
              </CardContent>
            </Card>

            {/* Step 2: Select Recipients */}
            <Card>
              <CardHeader>
                <View style={styles.stepTitleRow}>
                  <View style={styles.stepCircle}>
                    <Text style={styles.stepCircleText}>2</Text>
                  </View>
                  <CardTitle>Select Recipients</CardTitle>
                </View>
                <CardDescription>Choose from your saved athletes</CardDescription>
              </CardHeader>
              <CardContent>
                {savedAthletes && savedAthletes.length > 0 ? (
                  <View style={{ gap: spacing.md }}>
                    <View style={styles.selectAllRow}>
                      <View style={styles.inlineRow}>
                        <Checkbox
                          checked={selectedAthletes.length === savedAthletes.length}
                          onCheckedChange={handleSelectAll}
                        />
                        <Text style={styles.inlineText}>
                          Select All ({savedAthletes.length})
                        </Text>
                      </View>
                      <Badge variant="secondary">
                        {selectedAthletes.length} selected
                      </Badge>
                    </View>
                    <ScrollArea style={styles.recipientListBox}>
                      <View style={{ padding: spacing.xs, gap: 4 }}>
                        {savedAthletes.map((saved: any) => {
                          const isSel = selectedAthletes.includes(saved.athlete_profile_id);
                          return (
                            <Pressable
                              key={saved.id}
                              onPress={() => toggleAthleteSelection(saved.athlete_profile_id)}
                              style={[styles.recipientRow, isSel && styles.recipientRowSelected]}
                            >
                              <Checkbox
                                checked={isSel}
                                onCheckedChange={() =>
                                  toggleAthleteSelection(saved.athlete_profile_id)
                                }
                              />
                              <Avatar
                                size={32}
                                source={
                                  saved.athlete?.profile_image_url
                                    ? { uri: saved.athlete.profile_image_url }
                                    : null
                                }
                                fallback={saved.athlete?.full_name?.charAt(0) || "A"}
                              />
                              <View style={{ flex: 1, minWidth: 0 }}>
                                <Text numberOfLines={1} style={styles.recipientName}>
                                  {saved.athlete?.full_name}
                                </Text>
                                <Text numberOfLines={1} style={styles.recipientMeta}>
                                  {saved.athlete?.position} • {saved.athlete?.school}
                                </Text>
                              </View>
                              <Pressable
                                style={styles.iconBtn}
                                onPress={(e) => {
                                  e.stopPropagation();
                                  setPreviewAthlete(saved);
                                }}
                              >
                                <Eye width={16} height={16} color={colors.foreground} />
                              </Pressable>
                            </Pressable>
                          );
                        })}
                      </View>
                    </ScrollArea>

                    <View style={styles.inlineRow}>
                      <Checkbox
                        checked={includeParents}
                        onCheckedChange={(checked) => setIncludeParents(!!checked)}
                      />
                      <Text style={styles.inlineText}>
                        CC parents/guardians on messages
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.emptyBlock}>
                    <Users width={48} height={48} color={colors.mutedForeground} />
                    <Text style={styles.emptyText}>No saved athletes.</Text>
                    <Text style={styles.emptySubtext}>
                      Save athletes from search results first.
                    </Text>
                  </View>
                )}
              </CardContent>
            </Card>

            {/* Step 3: Preview & Send */}
            <Card>
              <CardHeader>
                <View style={styles.stepTitleRow}>
                  <View style={styles.stepCircle}>
                    <Text style={styles.stepCircleText}>3</Text>
                  </View>
                  <CardTitle>Preview & Send</CardTitle>
                </View>
              </CardHeader>
              <CardContent>
                {selectedTemplate && previewAthlete ? (
                  <View style={{ gap: spacing.md }}>
                    <View style={styles.previewBox}>
                      <View style={{ alignSelf: "flex-start", marginBottom: spacing.xs }}>
                        <Badge variant="outline">
                          Preview for {previewAthlete.athlete?.full_name}
                        </Badge>
                      </View>
                      {selectedTemplate.subject && (
                        <Text style={styles.previewSubject}>
                          Subject:{" "}
                          {applyTemplateVariables(
                            selectedTemplate.subject,
                            previewAthlete.athlete || {},
                            coachProfile || {}
                          )}
                        </Text>
                      )}
                      <Text style={styles.previewBody}>{getPreviewContent()}</Text>
                    </View>
                  </View>
                ) : (
                  <Text style={styles.previewHint}>
                    Select a template and click the preview icon on an athlete to see the personalized message.
                  </Text>
                )}

                <View style={styles.sendRow}>
                  <Button
                    onPress={handleSendBulkMessage}
                    disabled={
                      !selectedTemplate ||
                      selectedAthletes.length === 0 ||
                      createBulkJob.isPending
                    }
                    leftIcon={
                      createBulkJob.isPending ? (
                        <Loader2 width={16} height={16} color={colors.primaryForeground} />
                      ) : (
                        <Send width={16} height={16} color={colors.primaryForeground} />
                      )
                    }
                  >
                    {`Send to ${selectedAthletes.length} Athlete${selectedAthletes.length !== 1 ? "s" : ""}`}
                  </Button>
                </View>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="templates" style={styles.tabContent}>
            <View style={{ alignItems: "flex-end" }}>
              <Button
                onPress={() => setIsCreateTemplateOpen(true)}
                leftIcon={<Plus width={16} height={16} color={colors.primaryForeground} />}
              >
                Create Template
              </Button>
            </View>

            {templates && templates.length > 0 ? (
              <View style={styles.templatesList}>
                {templates.map((template) => (
                  <Card key={template.id}>
                    <CardHeader>
                      <View style={styles.templateMgmtHeader}>
                        <View style={{ flex: 1 }}>
                          <CardTitle>{template.name}</CardTitle>
                          <View style={{ marginTop: 4, alignSelf: "flex-start" }}>
                            <Badge variant="secondary">
                              {templateTypes.find((t) => t.value === template.template_type)?.label}
                            </Badge>
                          </View>
                        </View>
                        <Pressable
                          style={styles.iconBtn}
                          onPress={() => deleteTemplate.mutate(template.id)}
                        >
                          <Trash2 width={16} height={16} color={colors.destructive} />
                        </Pressable>
                      </View>
                    </CardHeader>
                    <CardContent>
                      {template.subject && (
                        <Text style={styles.templateSubject}>
                          Subject: {template.subject}
                        </Text>
                      )}
                      <Text numberOfLines={4} style={styles.templateBody}>
                        {template.content}
                      </Text>
                      <View style={styles.useRow}>
                        <Mail width={12} height={12} color={colors.mutedForeground} />
                        <Text style={styles.useText}>
                          Used {template.use_count} times
                        </Text>
                      </View>
                    </CardContent>
                  </Card>
                ))}
              </View>
            ) : (
              <Card>
                <CardContent>
                  <View style={styles.emptyBlock}>
                    <FileText width={48} height={48} color={colors.mutedForeground} />
                    <Text style={styles.emptyText}>No templates created yet.</Text>
                  </View>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </View>

      {/* Create Template Dialog */}
      <Dialog open={isCreateTemplateOpen} onOpenChange={setIsCreateTemplateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Message Template</DialogTitle>
            <DialogDescription>
              Create a reusable template with personalization variables
            </DialogDescription>
          </DialogHeader>
          <View style={{ gap: spacing.md }}>
            <View style={styles.dialogRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Template Name</Text>
                <Input
                  value={newTemplate.name}
                  onChangeText={(text) =>
                    setNewTemplate({ ...newTemplate, name: text })
                  }
                  placeholder="e.g., Initial Outreach"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Type</Text>
                <Select
                  value={newTemplate.templateType}
                  onValueChange={(v: any) =>
                    setNewTemplate({ ...newTemplate, templateType: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {templateTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </View>
            </View>
            <View>
              <Text style={styles.fieldLabel}>Subject (optional)</Text>
              <Input
                value={newTemplate.subject}
                onChangeText={(text) =>
                  setNewTemplate({ ...newTemplate, subject: text })
                }
                placeholder="e.g., Recruiting Interest from {{coach_school}}"
              />
            </View>
            <View>
              <Text style={styles.fieldLabel}>Message Content</Text>
              <Textarea
                value={newTemplate.content}
                onChangeText={(text) =>
                  setNewTemplate({ ...newTemplate, content: text })
                }
                placeholder="Write your message here..."
                rows={8}
              />
            </View>
            <View>
              <Text style={styles.fieldLabel}>Available Variables</Text>
              <View style={styles.variablesRow}>
                {defaultVariables.map((variable) => (
                  <Pressable
                    key={variable}
                    onPress={() =>
                      setNewTemplate({
                        ...newTemplate,
                        content: newTemplate.content + variable,
                      })
                    }
                  >
                    <Badge variant="outline">{variable}</Badge>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
          <DialogFooter>
            <Button variant="outline" onPress={() => setIsCreateTemplateOpen(false)}>
              Cancel
            </Button>
            <Button
              onPress={handleCreateTemplate}
              disabled={!newTemplate.name || !newTemplate.content || createTemplate.isPending}
              leftIcon={
                createTemplate.isPending ? (
                  <Loader2 width={16} height={16} color={colors.primaryForeground} />
                ) : undefined
              }
            >
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default BulkMessageComposer;

const styles = StyleSheet.create({
  loadingContainer: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
    justifyContent: "center",
  },
  root: { gap: spacing.lg },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  h2: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSize.xl,
    color: colors.foreground,
    letterSpacing: typography.letterSpacing.heading,
  },
  subtitle: {
    marginTop: 4,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  tabContent: { gap: spacing.lg, marginTop: spacing.md },
  stepTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleText: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.primaryForeground,
  },
  templateGrid: { gap: spacing.md },
  templateCard: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  templateCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + "0D",
  },
  templateCardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  templateName: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  templatePreview: {
    marginTop: spacing.xs,
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  emptyBlock: { alignItems: "center", paddingVertical: spacing.xl, gap: spacing.sm },
  emptyText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.base,
    color: colors.mutedForeground,
  },
  emptySubtext: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  selectAllRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inlineRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  inlineText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  recipientListBox: {
    height: 256,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
  },
  recipientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.xs,
    borderRadius: 8,
  },
  recipientRowSelected: { backgroundColor: colors.primary + "1A" },
  recipientName: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  recipientMeta: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  previewBox: {
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.secondary + "4D",
  },
  previewSubject: {
    marginBottom: spacing.xs,
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.base,
    color: colors.foreground,
  },
  previewBody: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  previewHint: {
    paddingVertical: spacing.md,
    textAlign: "center",
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  sendRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: spacing.md,
  },
  templatesList: { gap: spacing.md },
  templateMgmtHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  templateSubject: {
    marginBottom: spacing.xs,
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
  },
  templateBody: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.sm,
    color: colors.mutedForeground,
  },
  useRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  useText: {
    fontFamily: typography.fontFamily.body,
    fontSize: typography.fontSize.xs,
    color: colors.mutedForeground,
  },
  dialogRow: { flexDirection: "row", gap: spacing.md },
  fieldLabel: {
    fontFamily: typography.fontFamily.bodySemiBold,
    fontSize: typography.fontSize.sm,
    color: colors.foreground,
    marginBottom: 4,
  },
  variablesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
});
