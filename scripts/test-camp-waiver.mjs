import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const code = ts.transpileModule(
  fs.readFileSync(
    new URL("../src/components/CampGuardianWaiver.tsx", import.meta.url),
    "utf8",
  ),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
  },
).outputText;
let checks = 0;
function fixture({
  mode = "either",
  minor = true,
  signed = false,
  fail = false,
} = {}) {
  const state = [],
    refs = [],
    calls = [],
    alerts = [];
  let si = 0,
    ri = 0,
    tree;
  const react = {
    createElement: (type, props, ...children) => ({
      type,
      props: props || {},
      children,
    }),
    useState: (value) => {
      const i = si++;
      if (!(i in state)) state[i] = value;
      return [
        state[i],
        (v) => {
          state[i] = typeof v === "function" ? v(state[i]) : v;
        },
      ];
    },
    useRef: (value) => {
      const i = ri++;
      return (refs[i] ??= { current: value });
    },
  };
  const api = {
    rpc: async (name, args) => {
      calls.push({ name, args });
      if (name === "camp_waiver_review")
        return {
          data: {
            template_id: "qa-template",
            title: "QA synthetic waiver",
            body: "Synthetic test text only",
            version: 4,
            signature_mode: mode,
            attendee_name: "QA Participant",
            is_minor: minor,
            signed,
            context: "staff_device",
          },
          error: null,
        };
      if (name === "issue_camp_consent_link")
        return { data: { token: "test-token" }, error: null };
      return fail
        ? { error: { message: "Temporary failure" } }
        : { data: "signature-qa", error: null };
    },
  };
  const imports = {
    "@/navigation/HomeNavigation": {HomeButton:"HomeButton"},
    react: { __esModule: true, default: react, ...react },
    "react-native": {
      View: "View",
      Text: "Text",
      Modal: "Modal",
      SafeAreaView: "SafeAreaView",
      ScrollView: "ScrollView",
      StyleSheet: { create: (x) => x },
      Platform: { OS: "ios" },
      PanResponder: {
        create: (c) => ({
          panHandlers: {
            onStartShouldSetResponderCapture:
              c.onStartShouldSetPanResponderCapture,
            onResponderTerminationRequest: c.onPanResponderTerminationRequest,
            onResponderGrant: (e) => {
              c.onPanResponderGrant({ ...e, preventDefault: () => {} });
              return c.onShouldBlockNativeResponder();
            },
            onResponderMove: (e) =>
              c.onPanResponderMove({ ...e, preventDefault: () => {} }),
            onResponderRelease: c.onPanResponderRelease,
            onResponderTerminate: c.onPanResponderTerminate,
          },
        }),
      },
      Share: { share: async () => {} },
      Pressable: "Pressable",
      Alert: { alert: (...v) => alerts.push(v) },
    },
    "react-native-svg": { __esModule: true, default: "Svg", Path: "Path" },
    "react-native-qrcode-svg": { __esModule: true, default: "QRCode" },
    "@/lib/campConsent": {
      campConsentUrl: (t) => `https://qa.example.test/camp-consent#${t}`,
    },
    "@/integrations/supabase/client": { supabase: api },
    "@/components/ui/Button": { Button: "Button" },
    "@/components/ui/Input": { Input: "Input" },
    "@/lib/theme": { colors: {}, spacing: {} },
  };
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    require: (name) => {
      assert(name in imports, name);
      return imports[name];
    },
    setTimeout,
    clearTimeout,
  });
  const all = (n = tree) =>
    !n || typeof n !== "object"
      ? []
      : [n, ...(n.children || []).flat(Infinity).flatMap((c) => all(c))];
  const label = (n) =>
    (n.children || [])
      .flat(Infinity)
      .filter((v) => typeof v === "string")
      .join("");
  function render() {
    si = 0;
    ri = 0;
    tree = exports.CampGuardianWaiver({
      campId: "qa-camp",
      enrollmentId: "qa-enrollment",
    });
    for (const n of all()) {
      if (n.type === "ScrollView") n.props.ref.current = {};
    }
    for (const n of all())
      if (n.type === "Svg")
        n.props.ref.current = { toDataURL: (cb) => cb("QA_SYNTHETIC_PNG") };
    return tree;
  }
  function find(text) {
    const n = all().find(
      (n) =>
        (n.type === "Button" || n.type === "Pressable") &&
        (label(n).includes(text) ||
          (n.children || []).some(
            (c) => typeof c === "object" && label(c).includes(text),
          )),
    );
    assert(n, `Missing ${text}`);
    return n;
  }
  async function press(text) {
    find(text).props.onPress();
    await new Promise((r) => setImmediate(r));
    render();
  }
  render();
  return {
    calls,
    alerts,
    press,
    render,
    all,
    find,
    input: (v) => {
      all()
        .find((n) => n.type === "Input")
        .props.onChangeText(v);
      render();
    },
    signs: () => calls.filter((c) => c.name === "sign_camp_waiver_simple"),
  };
}
const typed = fixture();
await typed.press("Review / sign");
assert(
  typed
    .all()
    .some(
      (n) =>
        n.type === "Input" && n.props.label === "Type your full legal name *",
    ),
);
checks++;
typed.input("QA Guardian");
await typed.press("I reviewed");
await typed.press("Submit waiver");
assert.equal(typed.signs().length, 0);
checks++;
await typed.press("○ Parent");
await typed.press("Submit waiver");
assert.equal(typed.signs().length, 1);
assert.equal(typed.signs()[0].args.p_relationship, "parent");
assert(!("p_context" in typed.signs()[0].args));
checks++;
assert(typed.all().some((n) => String(n.children).includes("Waiver complete")));
checks++;
const drawn = fixture();
await drawn.press("Review / sign");
await drawn.press("Draw signature");
assert(
  drawn
    .all()
    .some(
      (n) => n.type === "Input" && n.props.label === "Your full legal name *",
    ),
);
checks++;
drawn.input("QA Legal Guardian");
await drawn.press("Legal guardian");
await drawn.press("I reviewed");
await drawn.press("Submit waiver");
assert.equal(drawn.signs().length, 0);
checks++;
let pad = drawn.all().find((n) => n.props.testID === "waiver-signature-pad");
assert.equal(pad.props.onStartShouldSetResponderCapture(), true);
assert.equal(pad.props.onResponderTerminationRequest(), false);
checks++;
assert.equal(
  pad.props.onResponderGrant({ nativeEvent: { locationX: 10, locationY: 20 } }),
  true,
);
drawn.render();
assert.equal(
  drawn.all().find((n) => n.type === "ScrollView").props.scrollEnabled,
  false,
);
checks++;
pad.props.onResponderMove({ nativeEvent: { locationX: 30, locationY: 40 } });
pad.props.onResponderRelease();
drawn.render();
assert.equal(
  drawn.all().find((n) => n.type === "ScrollView").props.scrollEnabled,
  true,
);
checks++;
await drawn.press("Submit waiver");
assert.equal(drawn.signs()[0].args.p_method, "drawn");
assert.equal(drawn.signs()[0].args.p_relationship, "legal_guardian");
checks++;
const cleared = fixture({ mode: "drawn" });
await cleared.press("Review / sign");
cleared.input("QA Guardian");
await cleared.press("○ Parent");
await cleared.press("I reviewed");
pad = cleared.all().find((n) => n.props.testID === "waiver-signature-pad");
pad.props.onResponderGrant({ nativeEvent: { locationX: 10, locationY: 10 } });
pad.props.onResponderMove({ nativeEvent: { locationX: 20, locationY: 20 } });
pad.props.onResponderTerminate();
cleared.render();
assert.equal(
  cleared.all().find((n) => n.type === "ScrollView").props.scrollEnabled,
  true,
);
checks++;
await cleared.press("Clear signature");
await cleared.press("Submit waiver");
assert.equal(cleared.signs().length, 0);
checks++;
const adult = fixture({ minor: false });
await adult.press("Review / sign");
adult.input("QA Adult");
await adult.press("I reviewed");
await adult.press("Submit waiver");
assert.equal(adult.signs()[0].args.p_relationship, "adult_self");
checks++;
const already = fixture({ signed: true });
await already.press("Review / sign");
assert.equal(already.all().filter((n) => n.type === "Input").length, 0);
checks++;
const retry = fixture({ fail: true });
await retry.press("Review / sign");
retry.input("QA Guardian");
await retry.press("○ Parent");
await retry.press("I reviewed");
await retry.press("Submit waiver");
await retry.press("Submit waiver");
assert.equal(
  retry.signs()[0].args.p_request_key,
  retry.signs()[1].args.p_request_key,
);
checks++;
const qr = fixture();
await qr.press("Review / sign");
await qr.press("Show consent QR");
assert(
  qr
    .all()
    .some(
      (n) =>
        n.type === "QRCode" &&
        n.props.value === "https://qa.example.test/camp-consent#test-token",
    ),
);
checks++;
console.log(
  `Native waiver UI PASS: ${checks} checks; typed field, explicit relationship, one signature, adult, drawing scroll lock/release/cancel/clear, retry and account-free QR (actual component; mocked transport).`,
);
