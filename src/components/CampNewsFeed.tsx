// CampNewsFeed — thin re-export.
//
// The real RN port lives at `src/components/dashboard/CampNewsFeedCard.tsx`
// (browse-camps CTA with proper navigation). One dashboard imports
// `CampNewsFeed` from this path, so redirect to the real implementation.

export {
  CampNewsFeedCard as CampNewsFeed,
  CampNewsFeedCard as default,
} from '@/components/dashboard/CampNewsFeedCard';
