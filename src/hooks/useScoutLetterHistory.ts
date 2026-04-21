import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import Toast from "react-native-toast-message";
const toast = (opts: any) => Toast.show(opts);

export interface ScoutLetterHistoryEntry {
  id: string;
  scout_user_id: string;
  recipient_name: string;
  recipient_email: string;
  recipient_type: string;
  organization_name: string | null;
  letter_type: string;
  letter_content: string;
  in_response_to_type: string | null;
  sent_at: string;
  created_at: string;
}

export function useScoutLetterHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState<ScoutLetterHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchHistory = async () => {
     if (!user) return;
     setIsLoading(true);
     try {
       const { data, error } = await supabase
         .from("scout_letter_history")
         .select("*")
         .eq("scout_user_id", user.id)
         .order("sent_at", { ascending: false });
       if (error) throw error;
       setHistory(data || []);
     } catch (error) {
       console.error("Error fetching scout letter history:", error);
     } finally {
       setIsLoading(false);
     }
  };

  const addToHistory = async (entry: {
     recipient_name: string;
     recipient_email: string;
     recipient_type?: string;
     organization_name?: string | null;
     letter_type: string;
     letter_content: string;
     in_response_to_type?: string | null;
  }) => {
     if (!user) return;
     try {
       const { error } = await supabase.from("scout_letter_history").insert({
         scout_user_id: user.id,
         ...entry,
       });
       if (error) throw error;
       await fetchHistory();
     } catch (error) {
       console.error("Error saving to scout letter history:", error);
     }
  };

  const deleteFromHistory = async (id: string) => {
     if (!user) return;
     try {
       const { error } = await supabase
         .from("scout_letter_history")
         .delete()
         .eq("id", id)
         .eq("scout_user_id", user.id);
       if (error) throw error;
       setHistory((prev) => prev.filter((item) => item.id !== id));
       Toast.show({ type: "success", text1: "Letter deleted from history" });
     } catch (error) {
       console.error("Error deleting from history:", error);
       Toast.show({ type: "error", text1: "Failed to delete letter" });
     }
  };

  useEffect(() => {
     fetchHistory();
  }, [user]);

  return { history, isLoading, addToHistory, deleteFromHistory, refetch: fetchHistory };
}
