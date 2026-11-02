import { useState } from 'react';
import supabase from "../config/supabaseClient";

interface ComponentReportDetail {
    id: number;
    reportid: number;
    componentid: {
        componentid: number;
        name: string;
    };
    findingid: {
        findingid: number;
        description: string;
    };
    recommendationid: {
        recommendationid: number;
        content: string;
    };
    inspectiontype: string;
    photo_path: string;
}

export default function getDataForFirstPage() {
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<any>(null);
    const [data, setData] = useState<ComponentReportDetail[] | null>(null);

    const load = async (reportid: string | number) => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from("componentreportdetails")
                .select(`
                    id,
                    reportid,
                    componentid: componentid (
                        componentid,
                        name
                    ),
                    findingid: findingid (
                        findingid,
                        description
                    ),
                    recommendationid: recommendationid (
                        recommendationid,
                        content
                    ),
                    inspectiontype,
                    photo_path
                `)
                .eq("reportid", reportid);

            if (error) {
                console.error("Select error:", error);
                setError(error);
                return null;
            } else {
                setData(data as any); // Type assertion needed until Supabase types are fully generated
                return data;
            }
        } catch (err) {
            console.error("Hook error:", err);
            setError(err);
            return null;
        } finally {
            setLoading(false);
        }
    };

    return { load, loading, error, data };
}
