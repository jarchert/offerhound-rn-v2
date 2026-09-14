import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { WebView } from 'react-native-webview';
import { colors } from '@/lib/theme';

interface HighlightMediaWindowProps {
  videoSrc?: string;
  style?: any;
}

// Helper to parse YouTube URLs and extract video ID
function getYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Helper to parse Vimeo URLs and extract video ID
function getVimeoVideoId(url: string): string | null {
  const patterns = [/vimeo\.com\/(\d+)/, /player\.vimeo\.com\/video\/(\d+)/];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// Helper to parse HUDL URLs and extract embed path
function getHudlEmbedUrl(url: string): string | null {
  // Already an embed URL
  if (url.includes('hudl.com/embed/')) {
    return url;
  }

  // Standard HUDL video URLs: hudl.com/video/3/123/456 or hudl.com/v/2XXXXX
  const videoMatch = url.match(/hudl\.com\/video\/(.+?)(?:\?|$)/);
  if (videoMatch) {
    return `https://www.hudl.com/embed/video/${videoMatch[1]}`;
  }

  // Short HUDL URLs: hudl.com/v/2XXXXX
  const shortMatch = url.match(/hudl\.com\/v\/([A-Za-z0-9]+)/);
  if (shortMatch) {
    return `https://www.hudl.com/embed/video/${shortMatch[1]}`;
  }

  return null;
}

// Check if URL is a HUDL URL
function isHudlUrl(url: string): boolean {
  return url.includes('hudl.com');
}

// Helper to parse MaxPreps URLs and get embed URL
function getMaxPrepsEmbedUrl(url: string): string | null {
  // Already an embed URL
  if (url.includes('maxpreps.com/embed/')) {
    return url;
  }

  // MaxPreps video URLs: maxpreps.com/video/... or maxpreps.com/athletes/.../videos/...
  const videoMatch = url.match(/maxpreps\.com\/(?:video|videos?)\/([A-Za-z0-9-]+)/i);
  if (videoMatch) {
    return `https://www.maxpreps.com/embed/video/${videoMatch[1]}`;
  }

  // MaxPreps athlete video page
  const athleteVideoMatch = url.match(
    /maxpreps\.com\/athletes\/[^/]+\/videos\/([A-Za-z0-9-]+)/i
  );
  if (athleteVideoMatch) {
    return `https://www.maxpreps.com/embed/video/${athleteVideoMatch[1]}`;
  }

  return null;
}

// Check if URL is a MaxPreps URL
function isMaxPrepsUrl(url: string): boolean {
  return (
    url.includes('maxpreps.com') &&
    (url.includes('/video') || url.includes('/videos'))
  );
}

// Determine video type from URL
function getVideoType(
  url: string
): 'youtube' | 'vimeo' | 'hudl' | 'maxpreps' | 'direct' {
  if (getYouTubeVideoId(url)) return 'youtube';
  if (getVimeoVideoId(url)) return 'vimeo';
  if (isHudlUrl(url)) return 'hudl';
  if (isMaxPrepsUrl(url)) return 'maxpreps';
  return 'direct';
}

// HTML wrapper for iframe embeds so autoplay/loop params pass through
function embedHtml(src: string): string {
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"><style>html,body{margin:0;padding:0;background:#000;height:100%;width:100%;overflow:hidden}iframe{border:0;width:100%;height:100%;position:absolute;inset:0}</style></head><body><iframe src="${src}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe></body></html>`;
}

export function HighlightMediaWindow({
  videoSrc = '/videos/highlight-reel.mov',
  style,
}: HighlightMediaWindowProps) {
  const videoType = getVideoType(videoSrc);
  const { width } = useWindowDimensions();

  // Breakpoints matching Lovable (md: 768, lg: 1024):
  //   base: w-72 h-44       → 288 x 176
  //   md:   w-96 h-56       → 384 x 224
  //   lg:   w-[480px] h-72  → 480 x 288
  let boxW = 288;
  let boxH = 176;
  if (width >= 1024) {
    boxW = 480;
    boxH = 288;
  } else if (width >= 768) {
    boxW = 384;
    boxH = 224;
  }

  // expo-video player for direct video files
  const player = useVideoPlayer(
    videoType === 'direct' ? videoSrc : null,
    (p) => {
      p.loop = true;
      p.muted = true;
      try {
        p.play();
      } catch {
        // Autoplay may be blocked, that's ok
      }
    }
  );

  const renderVideoContent = () => {
    if (videoType === 'youtube') {
      const videoId = getYouTubeVideoId(videoSrc);
      const src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&modestbranding=1&rel=0&playsinline=1`;
      return (
        <WebView
          source={{ html: embedHtml(src) }}
          style={styles.fill}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
        />
      );
    }

    if (videoType === 'vimeo') {
      const videoId = getVimeoVideoId(videoSrc);
      const src = `https://player.vimeo.com/video/${videoId}?autoplay=1&muted=1&loop=1&background=1`;
      return (
        <WebView
          source={{ html: embedHtml(src) }}
          style={styles.fill}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
        />
      );
    }

    if (videoType === 'hudl') {
      const embedUrl = getHudlEmbedUrl(videoSrc) || videoSrc;
      return (
        <WebView
          source={{ html: embedHtml(embedUrl) }}
          style={styles.fill}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
        />
      );
    }

    if (videoType === 'maxpreps') {
      const embedUrl = getMaxPrepsEmbedUrl(videoSrc) || videoSrc;
      return (
        <WebView
          source={{ html: embedHtml(embedUrl) }}
          style={styles.fill}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
        />
      );
    }

    // Direct video file — object-cover equivalent via contentFit="cover"
    return (
      <VideoView
        player={player}
        style={styles.fill}
        contentFit="cover"
        nativeControls={false}
      />
    );
  };

  return (
    <View style={[styles.root, style]}>
      <View style={styles.relative}>
        {/* Main media container with hero image styling */}
        <View
          style={[
            styles.mediaBox,
            { width: boxW, height: boxH },
          ]}
        >
          {renderVideoContent()}
        </View>
        {/* Decorative accent - matching hero image box */}
        <View
          style={[
            styles.accent,
            { width: boxW, height: boxH },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    // relative z-10
    position: 'relative',
    zIndex: 10,
  },
  relative: {
    position: 'relative',
  },
  mediaBox: {
    // rounded-2xl overflow-hidden border-4 border-primary/30 shadow-2xl bg-secondary
    borderRadius: 16, // Tailwind rounded-2xl = 1rem = 16px
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: 'rgba(231, 175, 8, 0.3)', // primary/30
    backgroundColor: colors.secondary,
    // shadow-2xl
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 25 },
    shadowOpacity: 0.25,
    shadowRadius: 50,
    elevation: 24,
  },
  accent: {
    // absolute -bottom-3 -right-3 border-4 border-primary/20 rounded-2xl -z-10
    position: 'absolute',
    bottom: -12,
    right: -12,
    borderWidth: 4,
    borderColor: 'rgba(231, 175, 8, 0.2)',
    borderRadius: 16, // Tailwind rounded-2xl = 1rem = 16px
    zIndex: -1,
  },
  fill: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
});
