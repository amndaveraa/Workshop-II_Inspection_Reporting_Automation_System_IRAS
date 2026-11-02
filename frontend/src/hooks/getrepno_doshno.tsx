import { useState, useCallback } from "react";
import { getFromReport } from "../services/querys";

interface ReportData {
  reportno: string;
    equipment: {
        doshregno: string;
    }
}

export function useGetRepNoDoshNo() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<any>(null);
  const [data, setData] = useState<ReportData[] | null>(null);

  const getRepNoDoshNo = useCallback(async (inspectorid: string | number) => {
    setLoading(true);
    setError(null);

    const { data, error } = await getFromReport(inspectorid);

    if (error) {
      console.error("Select error:", error);
      setError(error);
      setLoading(false);
      return { error };
    }

    setData(data as any);
    setLoading(false);
    return { data };
  }, []);

  return {
    getRepNoDoshNo,
    loading,
    error,
    data,
  };
}

