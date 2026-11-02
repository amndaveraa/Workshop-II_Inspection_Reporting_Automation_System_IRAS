import { useState } from 'react';
import supabase from '../config/supabaseClient';

interface ReportData {
    title: string;
    reportid: number;
    reportdate: string;
    employeeid: number;
    equipment: {
        tagno: string;
        doshregno: string;
        plant: {
            name: string;
        };
    };
}

export function useGetReportData() {
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<any>(null);
    const [data, setData] = useState<ReportData[] | null>(null);
    const [hasData, setHasData] = useState<boolean>(false);

    const load = async (inspectorid: string | number) => {
        setLoading(true);
        console.log("Diagnostic: Attempting to load reports. Inspector ID (from token):", inspectorid);
        
        try {
            const { data, error } = await supabase
                .from("report")
                .select(`
                    title,
                    reportdate,
                    reportid,
                    employeeid,
                    equipment: equipmentid (
                        tagno,
                        doshregno,
                        plant: plantid (
                            name
                        )
                    )
                `)
                .eq("employeeid", inspectorid) 
                // .limit(10)
                .in("status", ["Approved", "approved"]);

            console.log("Diagnostic: Supabase Response Data:", data);
            console.log("Diagnostic: Supabase Response Error:", error);
            
            // console.log("Diagnostic: Fetched reports:", data);

            if (error) {
                console.error("Select error:", error);
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
    };

    return { load, loading, error, data, hasData };
}