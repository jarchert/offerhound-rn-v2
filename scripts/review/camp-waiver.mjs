// Browser rendering of the actual native component for pre-build UX review.
// Synthetic transport only. Never included in the mobile app or device builds.
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../..",
  ),
  out = "/private/tmp/offerhound-native-waiver-review";
fs.mkdirSync(out, { recursive: true });
const fixture = {
  template_id: "qa-review-template",
  title: "Summer Skills Camp — QA waiver",
  body: "TEST PREVIEW — SYNTHETIC WAIVER TEXT ONLY.\n\nReview the camp participation terms here. This preview demonstrates the signing experience for a fictional attendee.\n\nA parent or legal guardian provides one signature for a minor. The minor does not also sign.",
  version: 1,
  signature_mode: "either",
  attendee_name: "Alex Taylor · Age 15",
  is_minor: true,
  signed: false,
  context: "staff_device",
};
await build({
  absWorkingDir: root,
  stdin: {
    contents: `import React from 'react';import{createRoot}from'react-dom/client';import{View,Text}from'react-native';import{CampGuardianWaiver}from'./src/components/CampGuardianWaiver';import{CampRegistrationQR}from'./src/components/CampRegistrationQR';import CampNPSCapture from './src/components/CampNPSCapture';import CampRefundRequestCard from './src/components/CampRefundRequestCard';import CampReportExportButton from './src/components/CampReportExportButton';import{CampGuestWalkupForm}from'./src/components/CampGuestWalkupForm';import{HomeNavigationProvider,HomeNavigationBar}from'./src/navigation/HomeNavigation';import{SafeAreaProvider}from'react-native-safe-area-context';import{QueryClient,QueryClientProvider}from'@tanstack/react-query';const cache=new QueryClient();createRoot(document.getElementById('root')).render(<QueryClientProvider client={cache}><SafeAreaProvider><HomeNavigationProvider route="ParentTabs"><HomeNavigationBar authenticated/>{location.pathname==='/walkup'?<View style={{padding:20,gap:16}}><Text style={{color:'#fff',fontSize:24,fontWeight:'700'}}>Camp walk-up flow</Text><Text style={{color:'#cbd5e1'}}>UI review · Synthetic data and photo boundary · No real registration or waiver submitted</Text><CampGuestWalkupForm campId="20000000-0000-4000-8000-000000000001" positions={[]} online refreshQueue={()=>{}} onCheckIn={()=>{}} onRoster={()=>{location.href='/'}}/></View>:location.pathname==='/followup'?<View style={{padding:20,gap:16}}><Text style={{color:'#fff',fontSize:24,fontWeight:'700'}}>Camp follow-up</Text><Text style={{color:'#cbd5e1'}}>UI review · Synthetic data · First save simulates a failed connection</Text><CampNPSCapture campId="20000000-0000-4000-8000-000000000001" enrollmentId="30000000-0000-4000-8000-000000000001"/><CampRefundRequestCard campId="20000000-0000-4000-8000-000000000001" enrollmentId="30000000-0000-4000-8000-000000000001"/><CampReportExportButton campName="Summer Skills Camp" campId="20000000-0000-4000-8000-000000000001" enrollmentId="30000000-0000-4000-8000-000000000001"/></View>:<View style={{padding:20,gap:16}}><Text style={{color:'#fff',fontSize:24,fontWeight:'700'}}>Camp waivers</Text><Text style={{color:'#cbd5e1'}}>UI review · Synthetic data · Native component rendered in browser</Text><Text style={{color:'#fff'}}>Summer Skills Camp · Alex Taylor</Text><CampRegistrationQR campId="20000000-0000-4000-8000-000000000001"/><CampGuardianWaiver campId="qa-camp" enrollmentId="qa-enrollment"/></View>}</HomeNavigationProvider></SafeAreaProvider></QueryClientProvider>);`,
    resolveDir: root,
    loader: "tsx",
  },
  loader: { ".js": "jsx" },
  bundle: true,
  format: "iife",
  platform: "browser",
  jsx: "automatic",
  outfile: path.join(out, "review.js"),
  resolveExtensions: [
    ".web.tsx",
    ".web.ts",
    ".web.js",
    ".tsx",
    ".ts",
    ".js",
    ".json",
  ],
  alias: { "react-native": "react-native-web" },
  define: {
    "process.env.NODE_ENV": '"development"',
    "process.env.EXPO_PUBLIC_CAMP_CONSENT_WEB_URL": '"https://qa.example.test"',
    "process.env.EXPO_PUBLIC_APP_ENV": '"staging"',
    __DEV__: "true",
  },
  plugins: [
    {
      name: "synthetic-review-only",
      setup(b) {
        b.onResolve({filter:/^@\/hooks\/useAuth$/},()=>({path:'auth',namespace:'walkup-review'}));
        b.onResolve({filter:/^@\/components\/CampRegistrantIdentity$/},()=>({path:'identity',namespace:'walkup-review'}));
        b.onLoad({filter:/.*/,namespace:'walkup-review'},args=>({contents:args.path==='auth'?"export const useAuth=()=>({user:{id:'qa-preview-user'},isAuthenticated:true});":"import React from 'react';import{Button}from'@/components/ui/Button';export const emptyNativeIdentity=()=>({phone:'',birthDate:'',headshotPath:''});export function CampRegistrantIdentityForm({onChange}){return <Button variant=\"outline\" onPress={()=>onChange({phone:'3125550100',birthDate:'2015-01-01',headshotPath:'20000000-0000-4000-8000-000000000001/qa-preview/fixture.jpg'})}>Use synthetic photo and contact details</Button>}",loader:'tsx',resolveDir:root}));

        b.onResolve({filter:/^expo-(file-system|sharing)$/},args=>({path:args.path,namespace:'native-boundary'}));
        b.onLoad({filter:/.*/,namespace:'native-boundary'},()=>({contents:"export const Paths={cache:''};export class File{write(){}};export async function isAvailableAsync(){return false};export async function shareAsync(){}",loader:'js'}));
        b.onResolve({ filter: /^@\/integrations\/supabase\/client$/ }, () => ({
          path: "review-client",
          namespace: "review",
        }));
        b.onLoad({ filter: /.*/, namespace: "review" }, () => ({
          contents: `let failNext=true;const rows={};export const supabase={auth:{getUser:async()=>({data:{user:{id:'qa-preview-user'}},error:null})},from:(table)=>{let payload;const result=async()=>{if(failNext){failNext=false;return{error:{message:'Connection lost. Your draft was not saved. Please retry.'}};}const row={id:'qa-preview-row',status:'pending',...payload};rows[table]=row;return{data:row,error:null};};const q={select:()=>q,eq:()=>q,order:()=>q,limit:()=>q,maybeSingle:async()=>({data:rows[table]||null,error:null}),insert:p=>{payload=p;return q;},update:p=>{payload=p;return q;},single:result,then:(resolve,reject)=>result().then(resolve,reject)};return q;},rpc:async(name)=>name==='can_register_camp_guest'?{data:true,error:null}:name==='register_camp_attendee'?{data:'30000000-0000-4000-8000-000000000001',error:null}:name==='camp_event_qr_status'||name==='set_camp_event_qr'?{data:{camp_id:'20000000-0000-4000-8000-000000000001',camp_name:'Summer Skills Camp',published:true,can_manage:true},error:null}:name==='camp_waiver_review'?{data:${JSON.stringify(fixture)},error:null}:name==='issue_camp_consent_link'?{data:{token:'synthetic-review-code'},error:null}:{data:'qa-preview-signature',error:null}};`,
          loader: "js",
        }));
      },
    },
  ],
});
fs.writeFileSync(
  path.join(out, "index.html"),
  `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>OfferHound native waiver — UI review</title><style>html{background:#e2e8f0}@font-face{font-family:Inter_400Regular;src:url('/Inter_400Regular.ttf')}@font-face{font-family:Inter_600SemiBold;src:url('/Inter_600SemiBold.ttf')}body{font-family:system-ui;margin:40px auto 0;width:430px;max-width:100vw;height:calc(100vh - 80px);background:#101318;border:1px solid #334155;border-radius:24px;overflow:hidden}#root{height:100%;overflow:auto}[aria-modal="true"]{left:max(0px,calc(50vw - 215px))!important;right:auto!important;top:40px!important;bottom:auto!important;width:min(430px,100vw)!important;height:calc(100vh - 80px)!important;border-radius:24px;overflow:hidden}button,input{font:inherit}</style></head><body><div id="root"></div><script src="/review.js"></script></body></html>`,
);
http
  .createServer((req, res) => {
    if (
      req.url === "/Inter_400Regular.ttf" ||
      req.url === "/Inter_600SemiBold.ttf"
    ) {
      const weight = req.url.includes("400") ? "400Regular" : "600SemiBold";
      res.setHeader("Content-Type", "font/ttf");
      res.end(
        fs.readFileSync(
          path.join(
            root,
            "node_modules/@expo-google-fonts/inter",
            weight,
            req.url.slice(1),
          ),
        ),
      );
      return;
    }
    const file = req.url === "/review.js" ? "review.js" : "index.html";
    res.setHeader(
      "Content-Type",
      file.endsWith(".js") ? "text/javascript" : "text/html",
    );
    res.end(fs.readFileSync(path.join(out, file)));
  })
  .listen(8100, "127.0.0.1", () =>
    console.log(
      "Native waiver review on http://127.0.0.1:8100 (synthetic transport; actual native component).",
    ),
  );
