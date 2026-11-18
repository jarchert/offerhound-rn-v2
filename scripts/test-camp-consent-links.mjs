import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import ts from "typescript";
const source = fs.readFileSync(
  new URL("../src/lib/campConsent.ts", import.meta.url),
  "utf8",
);
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
function link(base, env = "staging", token = "private-token") {
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    URL,
    process: {
      env: { EXPO_PUBLIC_CAMP_CONSENT_WEB_URL: base, EXPO_PUBLIC_APP_ENV: env },
    },
  });
  return exports.campConsentUrl(token);
}
assert.throws(() => link(), /not been configured/);
assert.throws(() => link("http://qa.example.test"), /secure/);
assert.throws(() => link("https://user:password@qa.example.test"), /secure/);
assert.throws(() => link("https://qa.example.test/path"), /secure/);
assert.throws(() => link("https://offer-hound.com"), /own staging/);
assert.equal(
  link("https://qa.example.test", "staging", "a#b&c"),
  "https://qa.example.test/camp-consent#a%23b%26c",
);
console.log(
  "Native consent URL checks PASS (6): explicit HTTPS origin, no credentials/path/query, staging isolation and fragment encoding.",
);
// Verify actual native button forwarding, including the browser renderer's ARIA alias.
const themeExports = {};
vm.runInNewContext(
  ts.transpileModule(
    fs.readFileSync(new URL("../src/lib/theme.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText,
  { exports: themeExports, require: name => {
    assert.equal(name, './adaptiveTheme');
    return {adaptiveColors:()=>JSON.parse(fs.readFileSync(new URL('../src/lib/themePalettes.json',import.meta.url),'utf8')).dark};
  } },
);
const react = {
  createElement: (type, props, ...children) => ({ type, props, children }),
};
const imports = {
  react: { __esModule: true, default: react, ...react },
  "react-native": {
    Pressable: "Pressable",
    Text: "Text",
    ActivityIndicator: "ActivityIndicator",
    View: "View",
    StyleSheet: { create: (x) => x },
  },
  "@/lib/theme": themeExports,
};
const buttonExports = {};
vm.runInNewContext(
  ts.transpileModule(
    fs.readFileSync(
      new URL("../src/components/ui/Button.tsx", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.React,
        esModuleInterop: true,
      },
    },
  ).outputText,
  { exports: buttonExports, require: (name) => imports[name] },
);
for (const checked of [true, false]) {
  const tree = buttonExports.Button({
    children: "Parent",
    accessibilityRole: "radio",
    accessibilityState: { checked },
  });
  assert.equal(tree.props.accessibilityRole, "radio");
  assert.equal(tree.props["aria-checked"], checked);
  assert.equal(tree.props.accessibilityState.checked, checked);
}
assert.equal(
  buttonExports.Button({ children: "Continue" }).props.accessibilityRole,
  "button",
);
console.log(
  "Native actual button accessibility PASS (3): selected/unselected radio state reaches native and web renderers; default button role retained.",
);
