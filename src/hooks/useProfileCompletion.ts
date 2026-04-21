import { useMemo } from 'react';
import { usePlayerProfile } from './usePlayerProfile';

interface ProfileField {
   key: string;
   label: string;
   weight: number;
}

const PROFILE_FIELDS: ProfileField[] = [
   { key: 'full_name', label: 'Full Name', weight: 10 },
   { key: 'position', label: 'Position', weight: 10 },
   { key: 'school', label: 'School', weight: 10 },
   { key: 'graduation_year', label: 'Graduation Year', weight: 10 },
   { key: 'height', label: 'Height', weight: 5 },
   { key: 'weight', label: 'Weight', weight: 5 },
   { key: 'gpa', label: 'GPA', weight: 10 },
   { key: 'bio', label: 'Bio', weight: 10 },
   { key: 'profile_image_url', label: 'Profile Photo', weight: 10 },
   { key: 'banner_image_url', label: 'Banner Image', weight: 5 },
   { key: 'hudl_url', label: 'Hudl Link', weight: 10 },
   { key: 'twitter_url', label: 'Twitter/X Link', weight: 5 },
];

export const useProfileCompletion = () => {
   const { profile, isLoading } = usePlayerProfile();

   const completionData = useMemo(() => {
     if (!profile) {
       return {
          percentage: 0,
          completedFields: [] as string[],
          missingFields: PROFILE_FIELDS.map(f => f.label),
          totalWeight: 100,
          earnedWeight: 0,
       };
     }

     const completedFields: string[] = [];
     const missingFields: string[] = [];
     let earnedWeight = 0;
     const totalWeight = PROFILE_FIELDS.reduce((sum, f) => sum + f.weight, 0);

     PROFILE_FIELDS.forEach((field) => {
       const value = profile[field.key as keyof typeof profile];
       const isComplete = value !== null && value !== undefined && value !== '';
       if (isComplete) {
          completedFields.push(field.label);
          earnedWeight += field.weight;
       } else {
          missingFields.push(field.label);
       }
     });

     const percentage = Math.round((earnedWeight / totalWeight) * 100);
     return { percentage, completedFields, missingFields, totalWeight, earnedWeight };
   }, [profile]);

   return { ...completionData, isLoading, hasProfile: !!profile };
};
