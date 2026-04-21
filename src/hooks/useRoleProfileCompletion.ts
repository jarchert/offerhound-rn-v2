import { useMemo } from "react";
import { useCoachProfile } from "./useCoachProfile";
import { useScoutProfile } from "./useScoutProfile";

const COACH_FIELDS = [
   { key: "name", label: "Full Name", weight: 15 },
   { key: "title", label: "Title", weight: 10 },
   { key: "school", label: "School", weight: 15 },
   { key: "conference", label: "Conference", weight: 10 },
   { key: "division", label: "Division", weight: 10 },
   { key: "position_coached", label: "Position Coached", weight: 10 },
   { key: "email", label: "Email", weight: 5 },
   { key: "bio", label: "Bio", weight: 10 },
   { key: "image_url", label: "Profile Photo", weight: 10 },
   { key: "phone", label: "Phone", weight: 5 },
];

function calcCompletion(profile: Record<string, any> | null | undefined, fields: typeof COACH_FIELDS) {
   if (!profile) return { percentage: 0 };
   let earned = 0;
   const total = fields.reduce((s, f) => s + f.weight, 0);
   fields.forEach((f) => {
     const v = profile[f.key];
     if (v !== null && v !== undefined && v !== "") earned += f.weight;
   });
   return { percentage: Math.round((earned / total) * 100) };
}

export function useRoleProfileCompletion(role: string) {
   const coachQuery = useCoachProfile();
   const scoutQuery = useScoutProfile();

   return useMemo(() => {
     if (role === "coach") return calcCompletion(coachQuery.data, COACH_FIELDS);
     if (role === "scout") return calcCompletion(scoutQuery.data, COACH_FIELDS);
     return { percentage: 0 };
   }, [role, coachQuery.data, scoutQuery.data]);
}
