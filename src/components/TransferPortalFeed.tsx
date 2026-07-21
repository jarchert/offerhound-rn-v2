// TransferPortalFeed — thin re-export.
//
// The real RN port already lives at `src/components/dashboard/TransferPortalFeedCard.tsx`
// (117 lines, fully wired: pulls `transfer_portal_news`, calls
// `crawl-recruiting-podcasts` on refresh, FlatList render, Linking.openURL on
// tap). Seven dashboard screens import `TransferPortalFeed` from this path,
// so we redirect them to the real implementation here instead of leaving a
// stub in place.
//
// If the underlying component ever moves, update this re-export — do not put
// stub UI back.

export {
  TransferPortalFeedCard as TransferPortalFeed,
  TransferPortalFeedCard as default,
} from '@/components/dashboard/TransferPortalFeedCard';
