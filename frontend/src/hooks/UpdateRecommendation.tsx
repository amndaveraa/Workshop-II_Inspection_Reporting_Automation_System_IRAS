import supabase from "../config/supabaseClient";

export default function UpdateRecommendation() {
    const updateRecommendation = async (recommendationId: number | string, recommendation: string, recommendationTemplateId: number | string | null = null) => {
        try {
            const updates: { content: string; recommendationtemplateid?: number | string } = { content: recommendation };
            if (recommendationTemplateId !== null) {
                updates.recommendationtemplateid = recommendationTemplateId;
            }

            const { data, error } = await supabase
                .from("recommendation")
                .update(updates)
                .eq("recommendationid", recommendationId)
                .select();

            if (error) {
                console.error("Error updating recommendation:", error);
                return { error };
            } else {
                console.log("Recommendation updated successfully:", data);
                return { data };
            }
        } catch (error) {
            console.error("Error updating recommendation:", error);
            return { error };
        }
    };
    return { updateRecommendation };
}
