import { useState } from 'react';


interface ReportData {
    title: string;
    reportid: number;
    reportdate: string;
    employeeid: number;
    rejection_note?: string;
    equipment: {
        tagno: string;
        doshregno: string;
        plant: {
            name: string;
        };
    };
}

export const useGetReportData = () => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const load = async (employeeId: string) => {
        setLoading(true);
        try {
            // Calling the new backend route
            const response = await fetch(
                `http://localhost:5000/api/reports/inspector-list?employeeid=${employeeId}&status=rejected`
            );
            const result = await response.json();
            if (result.success) {
                setData(result.data);
            }
        } catch (err) {
            console.error("Error fetching reports:", err);
        } finally {
            setLoading(false);
        }
    };

    return { data, loading, load };
};