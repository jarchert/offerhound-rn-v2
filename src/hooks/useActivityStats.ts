import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface RecentActivityItem {
  id: string;
  type: "contact" | "saved" | "letter";
  description: string;
  date: string;
}

export function useActivityStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["activity-stats", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const [contactsRes, savedRes, lettersRes] = await Promise.all([
        supabase
          .from("contact_events")
          .select("*")
          .eq("user_id", user.id)
          .order("contacted_at", { ascending: false }),
        supabase
          .from("saved_coaches" as any)
          .select("*, coach:coaches(name, school)")
          .eq("user_id", user.id)
          .order("saved_at", { ascending: false }),
        supabase
          .from("coach_letter_history")
          .select("id, athlete_name, athlete_email, athlete_school, letter_type, sent_at, created_at")
          .eq("coach_user_id", user.id)
          .order("sent_at", { ascending: false }),
      ]);

      const contactList = (contactsRes.data || []) as any[];
      const savedList = (savedRes.data || []) as any[];
      const letterList = (lettersRes.data || []) as any[];

      // Build recent activity feed
      const activity: RecentActivityItem[] = [];

      contactList.forEach((c) => {
        const desc = c.coach_name && c.school
          ? `Contacted ${c.coach_name} at ${c.school}`
          : `Contacted a coach`;
        activity.push({
          id: `contact-${c.id}`,
          type: c.contact_type === "letter" ? "letter" : "contact",
             description: desc,
             date: c.contacted_at || c.created_at,
          });
       });

       savedList.forEach((s) => {
          const coachName = s.coach?.name || "a coach";
          const school = s.coach?.school ? ` at ${s.coach.school}` : "";
          activity.push({
             id: `saved-${s.id}`,
             type: "saved",
             description: `Saved ${coachName}${school}`,
             date: s.saved_at,
          });
       });

       letterList.forEach((l) => {
          const school = l.athlete_school ? ` at ${l.athlete_school}` : "";
          const typeLabel = l.letter_type ? `${l.letter_type} letter` : "letter";
          const recipient = l.athlete_name || "an athlete";
          activity.push({
             id: `letter-${l.id}`,
             type: "letter",
             description: `Sent ${typeLabel} to ${recipient}${school}`,
             date: l.sent_at || l.created_at,
          });
       });

       // Sort newest first and cap to 10
       const recentActivity = activity
          .filter((a) => !!a.date)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 10);

       // Build last-6-months contacts breakdown
       const monthsMap = new Map<string, number>();
       const now = new Date();
       for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
          monthsMap.set(key, 0);
       }
       contactList.forEach((c) => {
          const d = new Date(c.contacted_at || c.created_at);
          if (isNaN(d.getTime())) return;
          const key = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
          if (monthsMap.has(key)) monthsMap.set(key, (monthsMap.get(key) || 0) + 1);
       });
       const contactsByMonth = Array.from(monthsMap.entries()).map(([month, count]) => ({ month, count }));



       return {
          totalCoachesContacted: contactList.length,
          lettersSent: letterList.length,
          savedCoaches: savedList.length,
          contactsByStatus: {
             sent: contactList.filter((c) => c.status === "sent").length,
             opened: contactList.filter((c) => c.status === "opened").length,
             replied: contactList.filter((c) => c.status === "replied").length,
             pending: contactList.filter((c) => c.status === "pending" || c.status === "sent").length,
          },
          contactsByMonth,
          recentActivity,
       };
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}
