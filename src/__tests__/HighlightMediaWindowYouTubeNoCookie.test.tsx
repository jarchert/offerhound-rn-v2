// src/__tests__/HighlightMediaWindowYouTubeNoCookie.test.tsx
//
// Privacy hardening — HighlightMediaWindow must embed YouTube videos via
// the privacy-enhanced domain `youtube-nocookie.com`, not the default
// `youtube.com`. This materially reduces the third-party tracking
// footprint (no DoubleClick/Google-advertising cookies dropped inside the
// embedded iframe) with zero UX or feature change — YouTube supports the
// nocookie endpoint as an official privacy variant of the standard embed.
//
// Rationale: PRIVACY_DISCLOSURE_AUDIT.md §7e / Flag #2 resolution.
//
// The tests are source-level assertions rather than render-tree
// introspection because the WebView embeds HTML strings, and the exact
// substring we care about (the `<iframe src=…>`) is constructed inline in
// the render path. Source-level asserts are the reliable structural guard.

import { describe, it, expect } from '@jest/globals';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const source = readFileSync(
  resolve(__dirname, '../components/HighlightMediaWindow.tsx'),
  'utf8',
);

describe('HighlightMediaWindow — YouTube privacy-enhanced embed', () => {
  it('uses youtube-nocookie.com for the YouTube embed URL', () => {
    // The exact URL template is:
    //   `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&modestbranding=1&rel=0&playsinline=1`
    // Match on the hostname + path prefix so future param tweaks don't
    // break this test, only a hostname regression would.
    expect(source).toMatch(
      /https:\/\/www\.youtube-nocookie\.com\/embed\/\$\{videoId\}/,
    );
  });

  it('does NOT construct any embed URL against www.youtube.com/embed/', () => {
    // Regression guard: if anyone reverts to the tracking-enabled
    // hostname, this fires. The parsers (getYouTubeVideoId patterns)
    // legitimately reference `youtube.com/watch|embed|shorts` to detect
    // user input — those matches are fine. The forbidden pattern is
    // specifically the constructed embed URL that the WebView loads.
    expect(source).not.toMatch(
      /https:\/\/www\.youtube\.com\/embed\/\$\{videoId\}/,
    );
  });

  it('preserves the full YouTube embed query string (autoplay/mute/loop/…)', () => {
    // Sanity check: the query params driving muted autoplay + hidden
    // controls + modest branding must survive the hostname swap.
    expect(source).toMatch(
      /youtube-nocookie\.com\/embed\/\$\{videoId\}\?autoplay=1&mute=1&loop=1&playlist=\$\{videoId\}&controls=0&modestbranding=1&rel=0&playsinline=1/,
    );
  });

  it('still detects standard youtube.com URLs at parse time (user input side unchanged)', () => {
    // The input-parsing regexes must still recognize user-typed youtube.com
    // URLs — the privacy swap only changes where we LOAD the embed, not
    // what URLs we accept from the user.
    expect(source).toMatch(/youtube\.com\\?\/watch\\?\?v=|youtu\\?\.be\\?\//);
  });

  it('does not embed any other unexpected hostname for YouTube-typed videos', () => {
    // Belt and suspenders: the only two YouTube-related hostnames in the
    // file should be:
    //   - youtube.com / youtu.be — in the INPUT parsing patterns
    //   - youtube-nocookie.com — in the OUTPUT embed URL construction
    // Anything else (m.youtube.com, googlevideo.com, etc.) is unexpected.
    const forbiddenHosts = [
      'm.youtube.com',
      'googlevideo.com',
      'youtube.googleapis.com',
    ];
    for (const host of forbiddenHosts) {
      expect(source).not.toContain(host);
    }
  });
});
