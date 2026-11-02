import { useEffect, useState } from "react";
import supabase from "../config/supabaseClient";

interface ComponentOption {
    id: number;
    label: string;
    value: number;
    category: string;
}

export default function SelectAllComponents(equipmentId?: string | number | null) {
    const [components, setComponents] = useState<ComponentOption[]>([]);

    useEffect(() => {
        async function load() {
            if (!equipmentId) {
                setComponents([]);
                return;
            }

            console.log("Fetching components for equipmentId:", equipmentId);

            const { data: data2, error: error2 } = await supabase
                .from("component")
                .select(
                    "componentid, name"
                )
                .eq("equipmentid", equipmentId)
                .order("componentid", { ascending: true });


            if (!error2 && data2) {
                const options = data2.map(row => ({
                    id: row.componentid,
                    label: row.name,
                    value: row.componentid,
                    category: 'Component'
                }));

                console.log("Options from component:", options);
                setComponents(options);
            }
        }

        load();
    }, [equipmentId]);

    return components;
}

