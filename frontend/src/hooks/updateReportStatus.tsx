import supabase from "../config/supabaseClient";

export default function updateReportStatus(reportId: string | number, status: string) {
    const updateReportStatus = async () => {
    try {
        const { data, error } = await supabase
            .from("report")
            .update({ status })
            .eq("reportid", reportId);

        if (error) {
            console.error("Error updating report status:", error);
            throw error;
        }

        console.log("Report status updated successfully:", data);
        return data;
    } catch (error) {
        console.error("Error updating report status:", error);
        throw error;
    }
    };
    return { updateReportStatus };
};
