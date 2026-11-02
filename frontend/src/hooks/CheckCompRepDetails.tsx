import supabase from "../config/supabaseClient";
import { useEffect, useState } from "react";

interface ComponentReportDetail {
    id: string | number;
    recommendationid: string | number;
    findingid: string | number;
    photo_path: string;
    componentid: string | number;
    inspectiontype: string;
    recommendation: {
        content: string;
        recommendationtemplateid: string | number;
    };
    finding: {
        description: string;
        findingtemplateid: string | number;
    };
    component: {
        name: string;
    };
}

export default function CheckCompRepDetails(reportId: string | number) {
    const [error, setError] = useState<any>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [data, setData] = useState<ComponentReportDetail[] | null>(null);
    const [hasData, setHasData] = useState<boolean>(false);

    useEffect(() => {
        if (!reportId) return;

        async function load() {
            // Guard against "new"
            if (reportId === 'new') {
                setLoading(false);
                setHasData(false);
                return;
            }

            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from("componentreportdetails")
                    .select(`
                        id,
                        recommendationid, 
                        findingid, 
                        photo_path, 
                        componentid, 
                        inspectiontype,
                        recommendation:recommendationid (content, recommendationtemplateid),
                        finding:findingid (description, findingtemplateid),
                        component:componentid (name)
                    `)
                    .eq("reportid", reportId);

                if (error) {
                    setError(error);
                    setHasData(false);
                } else {
                    setData(data as any);
                    // Check if array has items
                    setHasData(data && data.length > 0);

                }
            } catch (err) {
                setError(err);
            } finally {
                setLoading(false);
            }
        }

        load();
    }, [reportId]); // Rerun if reportId changes

    return { data, hasData, error, loading };
}

