import React from 'react';
import { InfluencerMatchCard } from '@/components/influencer/InfluencerMatchCard';

/**
 * Thin wrapper preserved for backward compatibility.
 * All influencer contact rendering now uses the unified
 * `InfluencerMatchCard` to match the platform-wide card style.
 */
export const InfluencerCard = ({
  influencer,
  snapshot,
  showRank,
}: {
  influencer: any;
  snapshot?: any;
  showRank?: boolean;
}) => {
  return (
    <InfluencerMatchCard
      influencer={influencer}
      snapshot={snapshot}
      showRank={showRank}
      variant="full"
    />
  );
};

export default InfluencerCard;
