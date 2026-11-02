import { useEffect, useState } from "react";
import supabase from "../config/supabaseClient";

interface RecommendationOption {
    id: number;
    label: string;
    value: number;
    category: string;
}

export default function SelectAllRecommendations() {
    const [recommendations, setRecommendations] = useState<RecommendationOption[]>([]);

    useEffect(() => {
        async function load() {
            const { data: data2, error: error2 } = await supabase
                .from("recommendationtemplate")
                .select("recommendationtemplateid, templatecontent")
                .order("recommendationtemplateid", { ascending: true });

            if (!error2) {
                const options = data2.map(row => ({
                    id: row.recommendationtemplateid,  // Changed: value → id
                    label: row.templatecontent,
                    value: row.recommendationtemplateid, // Keep for compatibility
                    category: 'Recommendation'          // Optional: add category
                }));

                console.log("Options from recommendationtemplate:", options);
                setRecommendations(options);
            }
        }

        load();
    }, []);

    return recommendations;
}