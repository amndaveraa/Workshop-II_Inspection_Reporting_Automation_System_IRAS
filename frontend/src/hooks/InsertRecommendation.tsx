import { useState, useCallback } from "react";
import supabase from "../config/supabaseClient";

interface RecommendationData {
  id: number | string;
  content: string;
  recommendationtemplateid: number | string;
}

export function useInsertRecommendation() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<any>(null);
  const [data, setData] = useState<RecommendationData[] | null>(null);

  const insertRecommendation = useCallback(async (content: string, recommendationtemplateid?: number | string | null) => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("recommendation")
      .insert([{ content, recommendationtemplateid }])
      .select();

    if (error) {
      console.error("Insert Recommendation Error:", error);
      setError(error);
      setLoading(false);
      return { error };
    }

    setData(data as any);
    setLoading(false);
    return { data };
  }, []);

  return {
    insertRecommendation,
    loading,
    error,
    data,
  };
}
