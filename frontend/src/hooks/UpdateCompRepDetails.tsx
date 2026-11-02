import supabase from "../config/supabaseClient";

export default function UpdateCompRepDetails() {
    const updateCompRepDetails = async (compRepDetailsId: number | string, compRepDetails: any) => {
        try {
            const { data, error } = await supabase
                .from("componentreportdetails")
                .update({ ...compRepDetails })
                .eq("id", compRepDetailsId)
                .select();

            if (error) {
                console.error("Error updating component report details:", error);
                return { error };
            } else {
                console.log("Component report details updated successfully:", data);
                return { data };
            }
        } catch (error) {
            console.error("Error updating component report details:", error);
            return { error };
        }
    };
    return { updateCompRepDetails };
}