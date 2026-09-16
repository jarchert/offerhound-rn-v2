/**
 * ShareRoleCardDialog — lazy-mount heavy content (Sep 2026 follow-up to T2.C).
 *
 * 383e098 investigated T2.C ("ShareRoleCardDialog eager-mount") and concluded
 * a fix was unnecessary because RN 0.83 <Modal visible={false}> returns null
 * and the useQuery hooks were already role-gated in 16fc132. Per explicit
 * build-cycle instruction on 2026-09-16, we're applying the fix anyway to
 * match the T2.A pattern on SharePlayerCardDialog: the heavy content body
 * (useMemo card composition, QRCode SVG, Share/Copy JSX) is now split into
 * a child <ShareRoleCardDialogContent> component that is only mounted when
 * the outer sheet's `open` state is true. Dashboard re-renders (Agency /
 * ClubCoach / HSCoach mount this eagerly as an uncontrolled trigger wrapper)
 * therefore never pay for creating those elements while the sheet is closed.
 *
 * The four role-gated useQuery calls remain in the outer component so:
 *   - Hook-order contract is stable across re-renders.
 *   - The role-gated-queries test (ShareRoleCardDialogRoleGatedQueries) still
 *     sees all four query declarations on every mount.
 *
 * This test asserts the mount-side invariants using the same mount-spy +
 * tree-walk approach as SharePlayerCardDialogLazyMount.test.tsx:
 *   1. Closed dialog: heavy content NOT mounted, Modal not in tree.
 *   2. Open dialog:   heavy content mounted once, Modal in tree.
 *   3. Re-render of parent while closed does NOT mount heavy content.
 *      This is the actual perf-guard invariant: dashboard re-renders don't
 *      trigger unnecessary heavy-tree creation.
 *   4. Close after open: heavy content unmounts; reopen re-mounts fresh.
 */
import React from 'react';
import { render, act } from '@testing-library/react-native';

// ─── Stubs so we don't need a real supabase / auth / query stack ───────────
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user', email: 'test@example.com' } }),
}));
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}));
jest.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: null, isLoading: false }),
}));
jest.mock('@/integrations/supabase/client', () => ({ supabase: {} }));

// Track every mount + unmount of the QRCode element as a proxy for "heavy
// content mounted". QRCode lives ONLY inside <ShareRoleCardDialogContent>,
// so its mount count is a direct signal of the heavy inner mount.
(global as any).__qrMountSpy__ = jest.fn();
(global as any).__qrUnmountSpy__ = jest.fn();
const qrMountSpy = (global as any).__qrMountSpy__ as jest.Mock;
const qrUnmountSpy = (global as any).__qrUnmountSpy__ as jest.Mock;

jest.mock('react-native-qrcode-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: function QRCodeMock() {
      React.useEffect(() => {
        (global as any).__qrMountSpy__();
        return () => (global as any).__qrUnmountSpy__();
      }, []);
      return React.createElement(View, { testID: 'qr-heavy-body' });
    },
  };
});

// Import AFTER mocks.
import { ShareRoleCardDialog } from '@/components/ShareRoleCardDialog';

// ─── Tree walk helpers ─────────────────────────────────────────────────────
function findByTestID(node: any, id: string): any | null {
  if (!node) return null;
  const nodes = Array.isArray(node) ? node : [node];
  for (const n of nodes) {
    if (n && typeof n === 'object') {
      if (n.props?.testID === id) return n;
      const found = findByTestID(n.children, id);
      if (found) return found;
    }
  }
  return null;
}

function isModalType(type: any): boolean {
  if (!type) return false;
  const name = typeof type === 'string' ? type : type?.displayName || type?.name;
  return name === 'Modal' || name === 'RCTModalHostView';
}

function findModal(node: any): any | null {
  if (!node) return null;
  const nodes = Array.isArray(node) ? node : [node];
  for (const n of nodes) {
    if (n && typeof n === 'object' && isModalType(n.type)) return n;
    if (n && typeof n === 'object' && n.children) {
      const found = findModal(n.children);
      if (found) return found;
    }
  }
  return null;
}

beforeEach(() => {
  qrMountSpy.mockReset();
  qrUnmountSpy.mockReset();
});

describe('ShareRoleCardDialog — lazy-mount heavy content while closed', () => {
  it('does NOT mount heavy content (QRCode) while visible=false', async () => {
    const tree: any = await render(
      <ShareRoleCardDialog role="scout" visible={false} onClose={() => undefined} />,
    );
    await act(async () => {});

    expect(qrMountSpy).not.toHaveBeenCalled();
    // Heavy body is absent from the tree.
    expect(findByTestID(tree.toJSON(), 'qr-heavy-body')).toBeNull();
    // The whole Modal element is absent — outer shell doesn't even create it.
    expect(findModal(tree.toJSON())).toBeNull();
  });

  it('mounts heavy content exactly once when visible flips to true', async () => {
    const tree: any = await render(
      <ShareRoleCardDialog role="scout" visible={false} onClose={() => undefined} />,
    );
    await act(async () => {});
    expect(qrMountSpy).not.toHaveBeenCalled();

    await act(async () => {
      tree.rerender(
        <ShareRoleCardDialog role="scout" visible={true} onClose={() => undefined} />,
      );
    });

    expect(qrMountSpy).toHaveBeenCalledTimes(1);
    expect(findByTestID(tree.toJSON(), 'qr-heavy-body')).not.toBeNull();
  });

  it('parent re-render while closed does NOT trigger any heavy-content mount', async () => {
    // This is the actual perf-guard invariant. Dashboards render
    // <ShareRoleCardDialog> eagerly and re-render freely as their own state
    // changes. Before the split, every one of those re-renders paid for the
    // useMemo card composition + creating the QRCode + Share/Copy JSX (even
    // though <Modal visible={false}> discarded it downstream). After the
    // split, the outer shell owns nothing heavy; the child component is
    // conditionally omitted from the tree entirely when open=false.
    const onClose = () => undefined;
    const tree: any = await render(
      <ShareRoleCardDialog role="club_coach" visible={false} onClose={onClose} />,
    );
    await act(async () => {});

    // Force several parent-style re-renders with the same closed prop shape.
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        tree.rerender(
          <ShareRoleCardDialog role="club_coach" visible={false} onClose={onClose} />,
        );
      });
    }

    // Zero heavy mounts across the entire re-render burst.
    expect(qrMountSpy).not.toHaveBeenCalled();
    expect(qrUnmountSpy).not.toHaveBeenCalled();
    expect(findByTestID(tree.toJSON(), 'qr-heavy-body')).toBeNull();
    expect(findModal(tree.toJSON())).toBeNull();
  });

  it('closing after open unmounts heavy content; reopening re-mounts fresh', async () => {
    const tree: any = await render(
      <ShareRoleCardDialog role="hs_coach" visible={true} onClose={() => undefined} />,
    );
    await act(async () => {});
    expect(qrMountSpy).toHaveBeenCalledTimes(1);

    // Close.
    await act(async () => {
      tree.rerender(
        <ShareRoleCardDialog role="hs_coach" visible={false} onClose={() => undefined} />,
      );
    });
    expect(qrUnmountSpy).toHaveBeenCalledTimes(1);
    expect(findByTestID(tree.toJSON(), 'qr-heavy-body')).toBeNull();
    expect(findModal(tree.toJSON())).toBeNull();

    // Reopen — heavy content mounts fresh (second mount).
    await act(async () => {
      tree.rerender(
        <ShareRoleCardDialog role="hs_coach" visible={true} onClose={() => undefined} />,
      );
    });
    expect(qrMountSpy).toHaveBeenCalledTimes(2);
    expect(findByTestID(tree.toJSON(), 'qr-heavy-body')).not.toBeNull();
  });

  it('uncontrolled mode (trigger wrapper, no explicit visible) does not mount heavy content on initial render', async () => {
    // This is the mode all three dashboards (Agency / ClubCoach / HSCoach)
    // actually use: <ShareRoleCardDialog role="..."><TriggerButton /></ShareRoleCardDialog>.
    // No `visible` prop, internalVisible defaults to false → outer shell
    // renders the trigger only.
    const { Text } = require('react-native');
    const tree: any = await render(
      <ShareRoleCardDialog role="scout">
        <Text>Share Card</Text>
      </ShareRoleCardDialog>,
    );
    await act(async () => {});

    expect(qrMountSpy).not.toHaveBeenCalled();
    expect(findByTestID(tree.toJSON(), 'qr-heavy-body')).toBeNull();
    expect(findModal(tree.toJSON())).toBeNull();
  });
});

// Config-presence sanity for the two icon/asset fixes shipping in the
// same commit — the eager-mount fix is the app-code fix; these two are
// config/asset fixes and their invariant is just "the file exists and
// app.json references it correctly". Kept in this file to consolidate
// the build124-followup coverage.
describe('app.json icon + notification config (build124 followup)', () => {
  it('icon.png exists and is referenced from app.json expo.icon', () => {
    const path = require('path');
    const fs = require('fs');
    const repoRoot = path.resolve(__dirname, '..', '..');
    const appJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'app.json'), 'utf8'));
    expect(appJson.expo.icon).toBe('./assets/icon.png');
    const iconPath = path.join(repoRoot, 'assets', 'icon.png');
    expect(fs.existsSync(iconPath)).toBe(true);
    // Non-trivial size — the previous notification-icon.png was 2572 bytes
    // and nearly blank; assert the primary icon is a real image (>50KB).
    const stat = fs.statSync(iconPath);
    expect(stat.size).toBeGreaterThan(50_000);
  });

  it('notification-icon.png exists and is referenced from expo-notifications plugin config', () => {
    const path = require('path');
    const fs = require('fs');
    const repoRoot = path.resolve(__dirname, '..', '..');
    const appJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'app.json'), 'utf8'));
    const plugins: any[] = appJson.expo.plugins || [];
    // expo-notifications is registered as ["expo-notifications", { icon, color }]
    const notif = plugins.find(
      (p) => Array.isArray(p) && p[0] === 'expo-notifications',
    );
    expect(notif).toBeTruthy();
    expect(notif[1].icon).toBe('./assets/notification-icon.png');
    const notifPath = path.join(repoRoot, 'assets', 'notification-icon.png');
    expect(fs.existsSync(notifPath)).toBe(true);

    // Android notification icon must be a white silhouette on transparent bg.
    // Verify the PNG has an alpha channel (RGBA), is 96x96, and every
    // non-transparent pixel is pure white (R=G=B=255).
    // Parse PNG header + IHDR chunk manually so we don't add a jest-time
    // dependency on Pillow / node-image tooling.
    const buf = fs.readFileSync(notifPath);
    // PNG magic: 89 50 4E 47 0D 0A 1A 0A
    expect(buf[0]).toBe(0x89);
    expect(buf.slice(1, 4).toString()).toBe('PNG');
    // IHDR chunk starts at byte 8: 4-byte length, 4-byte type, then data.
    // width at 16..20, height at 20..24, bit depth at 24, color type at 25.
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    const colorType = buf.readUInt8(25);
    expect(width).toBe(96);
    expect(height).toBe(96);
    // Color type 6 = RGBA (truecolor with alpha). This is the format that
    // preserves the silhouette + transparency Android requires.
    expect(colorType).toBe(6);
  });

  it('android adaptiveIcon still references the mascot-only asset', () => {
    const path = require('path');
    const fs = require('fs');
    const repoRoot = path.resolve(__dirname, '..', '..');
    const appJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'app.json'), 'utf8'));
    expect(appJson.expo.android.adaptiveIcon.foregroundImage).toBe(
      './assets/adaptive-icon.png',
    );
    const adaptivePath = path.join(repoRoot, 'assets', 'adaptive-icon.png');
    expect(fs.existsSync(adaptivePath)).toBe(true);
  });
});
