import supabase from "../config/supabaseClient";

async function uploadPDF(file: File): Promise<string> {
    const fileName = `${Date.now()}-${file.name}`;

    const { error } = await supabase.storage
        .from("pdf-files")
        .upload(fileName, file, {
            contentType: "application/pdf"
        });

    if (error) throw error;

    // Get Public URL
    const { data: publicURL } = supabase.storage
        .from("pdf-files")
        .getPublicUrl(fileName);

    return publicURL.publicUrl;
}

export default uploadPDF;
