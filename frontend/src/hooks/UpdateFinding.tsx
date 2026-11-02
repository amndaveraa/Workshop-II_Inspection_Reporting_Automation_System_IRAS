import supabase from "../config/supabaseClient";

export default function UpdateFinding() {
    const updateFinding = async (findingId: number | string, finding: string, findingTemplateId: number | string | null = null) => {
        try {
            const updates: { description: string; findingtemplateid?: number | string } = { description: finding };
            if (findingTemplateId !== null) {
                updates.findingtemplateid = findingTemplateId;
            }

            const { data, error } = await supabase
                .from("finding")
                .update(updates)
                .eq("findingid", findingId)
                .select();

            if (error) {
                console.error("Error updating finding:", error);
                return { error };
            } else {
                console.log("Finding updated successfully:", data);
                return { data };
            }
        } catch (error) {
            console.error("Error updating finding:", error);
            return { error };
        }
    };
    return { updateFinding };
}
