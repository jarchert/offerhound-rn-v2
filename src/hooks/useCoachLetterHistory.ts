import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "react-native-toast-message";

export interface CoachLetterHistoryEntry {
  id: string;
  coach_user_id: string;
  athlete_name: string;
  athlete_email: string;
  athlete_school: string | null;
  letter_type: string;
  letter_content: string;
  in_response_to_type: string | null;
  sent_at: string;
  created_at: string;
}

export function useCoachLetterHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState<CoachLetterHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchHistory = async () => {
     if (!user) return;
     setIsLoading(true);
     try {
       const { data, error } = await supabase
         .from("coach_letter_history")
         .select("*")
         .eq("coach_user_id", user.id)
         .order("sent_at", { ascending: false });
       if (error) throw error;
       setHistory(data || []);
     } catch (error) {
       console.error("Error fetching coach letter history:", error);
     } finally {
       setIsLoading(false);
     }
  };

  const addToHistory = async (entry: {
     athlete_name: string;
     athlete_email: string;
     athlete_school?: string | null;
     letter_type: string;
     letter_content: string;
     in_response_to_type?: string | null;
  }) => {
     if (!user) return;
     try {
       const { error } = await supabase.from("coach_letter_history").insert({
         coach_user_id: user.id,
         ...entry,
       });
       if (error) throw error;
       await fetchHistory();
     } catch (error) {
       console.error("Error saving to coach letter history:", error);
     }
  };

  const deleteFromHistory = async (id: string) => {
     if (!user) return;
     try {
       const { error } = await supabase
         .from("coach_letter_history")
         .delete()
         .eq("id", id)
         .eq("coach_user_id", user.id);
       if (error) throw error;
       setHistory((prev) => prev.filter((item) => item.id !== id));
       toast.success("Letter deleted from history");
     } catch (error) {
       console.error("Error deleting from history:", error);
       toast.error("Failed to delete letter");
     }
  };

  useEffect(() => {
     fetchHistory();
  }, [user]);

  return { history, isLoading, addToHistory, deleteFromHistory, refetch: fetchHistory };
}
