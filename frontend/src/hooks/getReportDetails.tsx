import supabase from "../config/supabaseClient";
import { useState, useEffect } from "react";

interface ReportDetails {

    status: string;
    equipmentid: number;
    equipment: {
        name: string;
        tagno: string;
        doshregno: string;
        vesseltype: {
            name: string; // Equipment Description
        };
        plant: {
            name: string;
        };
    };
    employee?: {
        name: string;
    };
}

export function useGetReportDetails(reportId: string | number | null) {
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<any>(null);
    const [data, setData] = useState<ReportDetails | null>(null);

    useEffect(() => {
        if (!reportId) return;

        const fetchReportDetails = async () => {
            setLoading(true);
            setError(null);

            try {
                const { data, error } = await supabase
                    .from('report')
                    .select(`
                        reportdate,
                        status,
                        equipmentid,
                        employee (
                            name
                        ),
                        equipment (
                            name,
                            tagno,
                            doshregno,
                            vesseltype:vesseltypeid(
                                name
                            ),
                            plant:plantid(
                                name
                            )
                        )
                    `)
                    .eq('reportid', reportId)
                    .single();

                if (error) {
                    console.error("Select error:", error);
                    setError(error);
                    setLoading(false);
                    return { error };
                }

                console.log("🔍 getReportDetails raw data:", data);
                setData(data as any);
                setLoading(false);
                return { data };
            } catch (error) {
                console.error("Error fetching report details:", error);
                setError(error);
                setLoading(false);
                return { error };
            }
        };

        fetchReportDetails();
    }, [reportId]);

    return {
        loading,
        error,
        data,
    };
}
