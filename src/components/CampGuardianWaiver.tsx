import {HomeButton} from '@/navigation/HomeNavigation';
import React, { useRef, useState } from "react";
import {
  View,
  Text,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Share,
  Pressable,
  PanResponder,
  Platform,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import QRCode from "react-native-qrcode-svg";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { colors, spacing } from "@/lib/theme";
import { campConsentUrl } from "@/lib/campConsent";

type Review = {
  template_id: string;
  title: string;
  body: string;
  version: number;
  signature_mode: string;
  attendee_name: string;
  is_minor: boolean;
  signed: boolean;
  context: string;
};
export function CampGuardianWaiver({
  campId,
  enrollmentId,
}: {
  campId: string;
  enrollmentId: string;
}) {
  const [review, setReview] = useState<Review | null>(null),
    [visible, setVisible] = useState(false),
    [busy, setBusy] = useState(false);
  const [name, setName] = useState(""),
    [relationship, setRelationship] = useState(""),
    [attested, setAttested] = useState(false),
    [method, setMethod] = useState<"typed" | "drawn">("typed");
  const [drawing, setDrawing] = useState(false),
    [paths, setPaths] = useState<string[]>([]),
    [link, setLink] = useState("");
  const canvas = useRef<Svg>(null),
    width = useRef(300),
    stroke = useRef(""),
    hasInk = useRef(false),
    submitting = useRef(false),
    request = useRef("");
  const scroll = useRef<ScrollView>(null),
    busyRef = useRef(busy);
  busyRef.current = busy;
  const finishDrawing = () => {
    setDrawing(false);
    scroll.current?.setNativeProps?.({ scrollEnabled: true });
  };
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !busyRef.current,
      onMoveShouldSetPanResponder: () => !busyRef.current,
      onStartShouldSetPanResponderCapture: () => !busyRef.current,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: (e) => {
        e.preventDefault();
        setDrawing(true);
        scroll.current?.setNativeProps?.({ scrollEnabled: false });
        stroke.current = `M ${point(e)}`;
        setPaths((p) => [...p, stroke.current]);
      },
      onPanResponderMove: (e) => {
        e.preventDefault();
        hasInk.current = true;
        stroke.current += ` L ${point(e)}`;
        setPaths((p) => [...p.slice(0, -1), stroke.current]);
        request.current = "";
      },
      onPanResponderRelease: finishDrawing,
      onPanResponderTerminate: finishDrawing,
    }),
  ).current;
  const resetRequest = () => {
    request.current = "";
  };
  const clear = () => {
    finishDrawing();
    hasInk.current = false;
    stroke.current = "";
    setPaths([]);
    resetRequest();
  };
  async function open() {
    setBusy(true);
    try {
      const result = await (supabase.rpc as any)("camp_waiver_review", {
        p_enrollment_id: enrollmentId,
      });
      if (result.error) throw result.error;
      setReview(result.data);
      setName("");
      setRelationship("");
      setAttested(false);
      setLink("");
      clear();
      setMethod(result.data.signature_mode === "drawn" ? "drawn" : "typed");
      setVisible(true);
    } catch (e: any) {
      Alert.alert("Waiver unavailable", e.message);
    } finally {
      setBusy(false);
    }
  }
  async function shareLink() {
    setBusy(true);
    try {
      const r = await (supabase.rpc as any)("issue_camp_consent_link", {
        p_camp_id: campId,
        p_enrollment_id: enrollmentId,
      });
      if (r.error) throw r.error;
      setLink(campConsentUrl(r.data.token));
    } catch (e: any) {
      Alert.alert("QR unavailable", e.message);
    } finally {
      setBusy(false);
    }
  }
  async function sign() {
    if (submitting.current || !review) return;
    if (
      name.trim().length < 2 ||
      (!relationship && review.is_minor) ||
      !attested
    ) {
      Alert.alert(
        "Complete required fields",
        "Enter your full legal name, select your relationship if required, and confirm that you are signing personally.",
      );
      return;
    }
    if (method === "drawn" && !hasInk.current) {
      Alert.alert(
        "Signature required",
        "Draw your signature in the white box.",
      );
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      let drawn: string | null = null;
      if (method === "drawn") {
        drawn = await new Promise<string>((resolve, reject) => {
          const timer = setTimeout(
            () => reject(Error("Signature capture timed out. Retry.")),
            5000,
          );
          if (!canvas.current) {
            clearTimeout(timer);
            reject(Error("Signature pad unavailable"));
            return;
          }
          canvas.current.toDataURL((value) => {
            clearTimeout(timer);
            resolve(`data:image/png;base64,${value}`);
          });
        });
      }
      if (!request.current) {
        const random = Array.from({ length: 32 }, () =>
          Math.floor(Math.random() * 16).toString(16),
        );
        random[12] = "4";
        random[16] = "8";
        const hex = random.join("");
        request.current = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
      }
      const result = await (supabase.rpc as any)("sign_camp_waiver_simple", {
        p_enrollment_id: enrollmentId,
        p_template_id: review.template_id,
        p_version: review.version,
        p_request_key: request.current,
        p_signer_name: name.trim(),
        p_relationship: review.is_minor ? relationship : "adult_self",
        p_attested: attested,
        p_method: method,
        p_drawn: drawn,
      });
      if (result.error) throw result.error;
      setReview({ ...review, signed: true });
      setDrawing(false);
    } catch (e: any) {
      Alert.alert("Waiver not saved", e.message || "Please retry.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  const point = (e: any) =>
    `${Math.max(0, Math.min(width.current, e.nativeEvent.locationX))} ${Math.max(0, Math.min(170, e.nativeEvent.locationY))}`;
  return (
    <View>
      <Button
        variant="outline"
        disabled={busy}
        onPress={() => {
          void open();
        }}
      >
        Review / sign camp waiver
      </Button>
      <Modal
        visible={visible}
        animationType="slide"
        onRequestClose={() => {
          if (!busy) setVisible(false);
        }}
      >
        <SafeAreaView style={s.screen}>
          <View style={s.header}>
            <HomeButton disabled={busy} confirmLeave={!!review&&!review.signed&&!!(name.trim()||relationship||attested||paths.length)} beforeNavigate={()=>{finishDrawing();setVisible(false);}}/>
            <Text style={s.title}>Camp waiver</Text>
            <Button
              variant="ghost"
              disabled={busy}
              onPress={() => setVisible(false)}
            >
              Close
            </Button>
          </View>
          <ScrollView
            ref={scroll}
            testID="waiver-scroll"
            scrollEnabled={!drawing}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.content}
          >
            {review?.signed ? (
              <View style={s.section}>
                <Text style={s.heading}>✓ Waiver complete</Text>
                <Text style={s.text}>
                  Consent is recorded for {review.attendee_name}. Only one
                  parent or guardian signature is needed for a minor.
                </Text>
                <Button onPress={() => setVisible(false)}>Done</Button>
              </View>
            ) : (
              review && (
                <>
                  <Text style={s.subtitle}>
                    {review.attendee_name} · No guardian account needed
                  </Text>
                  <View style={s.section}>
                    <Text style={s.heading}>1. Review waiver</Text>
                    <Text style={s.text}>
                      {review.title} · Version {review.version}
                    </Text>
                    <Text selectable style={s.text}>
                      {review.body}
                    </Text>
                  </View>
                  <View style={s.section}>
                    <Text style={s.heading}>2. Who is signing?</Text>
                    <Text style={s.text}>
                      {review.is_minor
                        ? "A parent or legal guardian must sign personally. The athlete does not also sign."
                        : "The adult participant signs personally."}
                    </Text>
                    {review.is_minor && (
                      <>
                        <Text style={s.label}>Relationship to athlete *</Text>
                        <View style={s.row}>
                          {[
                            ["parent", "Parent"],
                            ["legal_guardian", "Legal guardian"],
                          ].map(([value, label]) => (
                            <Button
                              key={value}
                              accessibilityRole="radio"
                              accessibilityState={{
                                checked: relationship === value,
                              }}
                              variant={
                                relationship === value ? "default" : "outline"
                              }
                              disabled={busy}
                              onPress={() => {
                                setRelationship(value);
                                resetRequest();
                              }}
                            >
                              {relationship === value ? "● " : "○ "}
                              {label}
                            </Button>
                          ))}
                        </View>
                        <Text style={s.help}>Required: choose one option.</Text>
                      </>
                    )}
                  </View>
                  <View style={s.section}>
                    <Text style={s.heading}>3. Add one signature</Text>
                    <Text style={s.help}>
                      Fields marked * are required. Choose typed OR drawn.
                    </Text>
                    {review.signature_mode === "either" && (
                      <View style={s.row}>
                        {[
                          ["typed", "Type signature"],
                          ["drawn", "Draw signature"],
                        ].map(([value, label]) => (
                          <Button
                            key={value}
                            variant={method === value ? "default" : "outline"}
                            disabled={busy}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: method === value }}
                            onPress={() => {
                              setMethod(value as "typed" | "drawn");
                              clear();
                            }}
                          >
                            {method === value ? "● " : "○ "}
                            {label}
                          </Button>
                        ))}
                      </View>
                    )}
                    <Input
                      label={
                        method === "typed"
                          ? "Type your full legal name *"
                          : "Your full legal name *"
                      }
                      accessibilityLabel={
                        method === "typed"
                          ? "Type your full legal name required"
                          : "Your full legal name required"
                      }
                      placeholder="e.g. Jordan Taylor"
                      autoCapitalize="words"
                      value={name}
                      editable={!busy}
                      onChangeText={(v) => {
                        setName(v);
                        resetRequest();
                      }}
                    />
                    <Text style={s.help}>
                      {method === "typed"
                        ? "This name is your electronic signature. No second signature is required."
                        : "Your name identifies you. Draw your one signature below."}
                    </Text>
                    {method === "drawn" && (
                      <>
                        <Text style={s.label}>Draw signature *</Text>
                        <View
                          testID="waiver-signature-pad"
                          accessibilityLabel="Draw your signature here"
                          style={[
                            s.pad,
                            Platform.OS === "web"
                              ? ({
                                  touchAction: "none",
                                  userSelect: "none",
                                } as any)
                              : null,
                          ]}
                          onLayout={(e) => {
                            width.current = e.nativeEvent.layout.width;
                          }}
                          {...pan.panHandlers}
                        >
                          <Svg
                            ref={canvas}
                            pointerEvents="none"
                            width="100%"
                            height={170}
                            viewBox={`0 0 ${width.current} 170`}
                          >
                            {paths.map((d, i) => (
                              <Path
                                key={i}
                                d={d}
                                stroke="#111827"
                                strokeWidth={2.5}
                                fill="none"
                                strokeLinecap="round"
                              />
                            ))}
                          </Svg>
                        </View>
                        <Text style={s.help}>
                          Page scrolling pauses while your finger is inside the
                          signature box.
                        </Text>
                        <Button
                          variant="outline"
                          disabled={busy}
                          onPress={clear}
                        >
                          Clear signature
                        </Button>
                      </>
                    )}
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: attested }}
                      aria-checked={attested}
                      disabled={busy}
                      onPress={() => {
                        setAttested(!attested);
                        resetRequest();
                      }}
                      style={{
                        flexDirection: "row",
                        alignItems: "flex-start",
                        gap: 10,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: attested ? colors.primary : colors.border,
                        borderRadius: 12,
                      }}
                    >
                      <Text style={{ color: colors.foreground, fontSize: 20 }}>
                        {attested ? "☑" : "☐"}
                      </Text>
                      <Text style={[s.text, { flex: 1 }]}>
                        I reviewed this waiver and am signing personally. *
                      </Text>
                    </Pressable>
                    <Button
                      disabled={busy}
                      onPress={() => {
                        void sign();
                      }}
                    >
                      {busy ? "Saving…" : "Submit waiver & consent"}
                    </Button>
                  </View>
                  <View style={s.qrSection}>
                    <Text style={s.heading}>Prefer your own phone?</Text>
                    <Text style={s.text}>
                      Scan a private QR code to review and sign in a web
                      browser. No app or account required.
                    </Text>
                    <Button
                      variant="outline"
                      disabled={busy}
                      onPress={() => {
                        void shareLink();
                      }}
                    >
                      Show consent QR code
                    </Button>
                    {link && (
                      <>
                        <View style={s.qr}>
                          <QRCode
                            value={link}
                            size={190}
                            backgroundColor="#fff"
                            color="#111827"
                          />
                        </View>
                        <Text style={s.help}>
                          Share only with this attendee or their
                          parent/guardian. Expires in 24 hours.
                        </Text>
                        <Button
                          variant="outline"
                          onPress={() => {
                            void Share.share({ message: link });
                          }}
                        >
                          Share consent link
                        </Button>
                      </>
                    )}
                  </View>
                </>
              )
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}
const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { flex: 1, marginHorizontal: 8, fontSize: 20, fontWeight: "700", color: colors.foreground },
  subtitle: { color: colors.mutedForeground, fontSize: 14 },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  section: {
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.card,
  },
  heading: { fontSize: 20, fontWeight: "700", color: colors.foreground },
  text: { fontSize: 15, lineHeight: 23, color: colors.foreground },
  label: { fontSize: 15, fontWeight: "700", color: colors.foreground },
  help: { fontSize: 13, lineHeight: 20, color: colors.mutedForeground },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  pad: {
    height: 170,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#94a3b8",
    borderRadius: 12,
    overflow: "hidden",
  },
  qrSection: {
    padding: 18,
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qr: {
    alignSelf: "center",
    padding: 14,
    backgroundColor: "#fff",
    borderRadius: 12,
  },
});
