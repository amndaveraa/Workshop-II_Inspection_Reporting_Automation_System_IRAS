import supabase from "../config/supabaseClient";
import { useState, useCallback } from "react";

interface ComponentReportDetailData {
    id: number | string;
    recommendationid: number | string | null;
    findingid: number | string | null;
    photo_path: string;
    reportid: number | string;
    componentid: number | string | null;
    inspectiontype: string;
}

export default function InsertToCompRepDetails() {
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<any>(null);
    const [data, setData] = useState<ComponentReportDetailData[] | null>(null);


    const insertToCompRepDetails = useCallback(async (
        recommendationid: number | string | null,
        findingid: number | string | null,
        photo_path: string,
        reportid: string | number,
        componentid: number | string | null,
        inspectiontype: string
    ) => {
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
            .from("componentreportdetails")
            .insert([
                {
                    recommendationid,
                    findingid,
                    photo_path,
                    reportid,
                    componentid,
                    inspectiontype
                }
            ])
            .select();

        if (error) {
            console.error("Insert To Component Report Details Error:", JSON.stringify(error, null, 2));
            setError(error);
            setLoading(false);
            return { error };
        }

        setData(data as any);
        setLoading(false);
        return { data };
    }, []);

    return { insertToCompRepDetails, loading, error, data };
}
