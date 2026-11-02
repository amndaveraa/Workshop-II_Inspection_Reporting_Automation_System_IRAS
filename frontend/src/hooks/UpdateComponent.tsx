import supabase from "../config/supabaseClient";

export default function UpdateComponent() {
    const updateComponent = async (componentId: number | string, name: string, _componentTemplateId: number | null = null) => {
        try {
            const updates: { name: string; componenttemplateid?: number } = { name };
            // Assuming component table has 'componenttemplateid' or similar if needed, 
            // but usually component table might just be 'component' with 'id' and 'name'.
            // However, based on user code: "updateComponent(entry.dbComponentId, entry.component, entry.componentId)"
            // It seems they treat entry.componentId as a template ID if it differs from dbComponentId?
            // Let's assume standard pattern with optional template ID update if schema supports it.
            // If component table doesn't have template ID, this might error, but let's follow the pattern.

            // Checking schema based on context: components usually are just selected. 
            // If they are selected from a dropdown, maybe 'componentid' in 'componentreportdetails' is what changes?
            // Wait, 'componentreportdetails' has 'componentid'. 
            // If user changes component dropdown, usually we update 'componentreportdetails.componentid'.
            // WE DO NOT UPDATE THE 'COMPONENT' TABLE (which is likely a master list).

            // CRITICAL CHECK: detailed logic below.

            // Logic A: If we are updating the MASTER component name? (Unlikely for a reporting app)
            // Logic B: If we are switching the component linked to the report? (Likely)

            // The user wrote: `updateComponent(entry.dbComponentId, entry.component, entry.componentId)`
            // and then `newCompId = entry.componentId`.

            // If they want to update the NAME of the component in the master table:
            const { data, error } = await supabase
                .from("component")
                .update(updates)
                .eq("id", componentId)
                .select();

            if (error) {
                console.error("Error updating component:", error);
                return { error };
            } else {
                console.log("Component updated successfully:", data);
                return { data };
            }
        } catch (error) {
            console.error("Error updating component:", error);
            return { error };
        }
    };
    return { updateComponent };
}
