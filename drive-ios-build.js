#!/usr/bin/env node
// Drive `eas build -p ios --profile production` interactively from stdin.
// Uses node-pty to give EAS the TTY it wants, auto-answering the prompts
// with sensible defaults for first-time Distribution Certificate generation.

const pty = require('node-pty');
const fs = require('fs');

const env = {
  ...process.env,
  EAS_BUILD_NO_EXPO_GO_WARNING: 'true',
  EXPO_TOKEN: 'TbLuZ8OH0-g1ODrx1OAum5JeUYWpIrqNOYN3d-3P',
  EXPO_ASC_API_KEY_PATH: '/home/ubuntu/.openclaw/workspace/offerhound-rn/AuthKey_99J47ZB3UA.p8',
  EXPO_ASC_KEY_ID: '99J47ZB3UA',
  EXPO_ASC_ISSUER_ID: 'fee1cb8d-f7b2-4344-a87d-c604ca896284',
  EXPO_APPLE_TEAM_ID: '8MG7GFDJ62',
  EXPO_APPLE_TEAM_TYPE: 'COMPANY_OR_ORGANIZATION',
};

const child = pty.spawn('eas', ['build', '-p', 'ios', '--profile', 'production', '--no-wait'], {
  cwd: '/home/ubuntu/.openclaw/workspace/offerhound-v2/app',
  env,
  cols: 120,
  rows: 40,
});

let buf = '';
const log = fs.createWriteStream('/tmp/ios-build-drive.log');
let sent = new Set();

const send = (tag, keys) => {
  if (sent.has(tag)) return;
  sent.add(tag);
  setTimeout(() => { child.write(keys); log.write(`\n>>> sent ${tag}: ${JSON.stringify(keys)}\n`); }, 400);
};

child.onData((chunk) => {
  process.stdout.write(chunk);
  log.write(chunk);
  buf += chunk;
  buf = buf.slice(-4000);

  // Affirmative defaults for first-run credential generation
  if (/What would you like to do\?/.test(buf) && /version source/.test(buf)) send('version-source-remote', '\r');
  if (/Do you want to log in to your Apple account/.test(buf)) send('apple-login-no', 'n\r');
  if (/Reuse this (distribution certificate|provisioning profile|setup|push key)/i.test(buf)) send('reuse-' + (buf.match(/Reuse this (\S+)/) || [,'x'])[1], 'Y\r');
  if (/Would you like to re-use this setup/.test(buf)) send('reuse-setup-yes', 'Y\r');
  if (/Generate a new Apple Distribution Certificate/.test(buf)) send('gen-dist-cert', '\r');
  if (/Generate a new Apple Provisioning Profile/.test(buf)) send('gen-prov', '\r');
  if (/Would you like to set up Push Notifications for your project/i.test(buf)) send('push-yes-arrow', '\r');
  if (/Setup a new push key/i.test(buf)) send('new-push-key', '\r');
  if (/Generate a new Apple Push Notifications service key/i.test(buf)) send('gen-push-key', 'Y\r');
  if (/Do you want EAS CLI to manage/i.test(buf)) send('eas-manages', 'Y\r');
  if (/Proceed\?/.test(buf)) send('proceed', 'Y\r');
  if (/Which credentials/.test(buf)) send('creds-choice', '\r');
  if (/Select a build profile/.test(buf)) send('profile-choice', '\r');
});

child.onExit(({ exitCode }) => {
  console.log(`\n[drive] eas exited with ${exitCode}`);
  log.end();
  process.exit(exitCode ?? 0);
});

setTimeout(() => {
  console.log('[drive] timeout after 12 min — killing eas');
  child.kill();
}, 12 * 60 * 1000);
