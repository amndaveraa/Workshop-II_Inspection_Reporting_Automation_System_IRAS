import { useEffect, useState } from "react";
import supabase from "../config/supabaseClient";

interface FindingOption {
    id: number;
    label: string;
    value: number;
    category: string;
}

export default function SelectAllFindings() {
    const [findings, setFindings] = useState<FindingOption[]>([]);

    useEffect(() => {
        async function load() {
            const { data: data2, error: error2 } = await supabase
                .from("findingtemplate")
                .select("findingtemplateid, templatecontent")
                .order("findingtemplateid", { ascending: true });

            if (!error2) {
                const options = data2.map(row => ({
                    id: row.findingtemplateid,        // Changed: value → id
                    label: row.templatecontent,
                    value: row.findingtemplateid,     // Keep for compatibility
                    category: 'Finding'                // Optional: add category
                }));

                console.log("Options from findingtemplate:", options);
                setFindings(options);
            }
        }

        load();
    }, []);

    return findings;
}