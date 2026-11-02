import { useState, useCallback } from "react";
import supabase from "../config/supabaseClient";

interface FindingData {
  id: number | string;
  description: string;
  findingtemplateid: number | string;
}

export function useInsertFinding() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<any>(null);
  const [data, setData] = useState<FindingData[] | null>(null);

  const insertFinding = useCallback(async (description: string, findingtemplateid?: number | string | null) => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("finding")
      .insert([{ description, findingtemplateid }])
      .select();

    if (error) {
      console.error("Insert Finding Error:", error);
      setError(error);
      setLoading(false);
      return { error };
    }

    setData(data as any);
    setLoading(false);
    return { data };
  }, []);

  return {
    insertFinding,
    loading,
    error,
    data,
  };
}
