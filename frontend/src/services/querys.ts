import supabase from "../config/supabaseClient";

export async function insertFinding(description: string, findingtemplateid: number) {
  const { data, error } = await supabase
    .from("finding")
    .insert([{ description, findingtemplateid }])
    .select();

  if (error) {
    console.error("Insert error:", error);
    return { error };
  }

  return { data };
}

export async function insertRecommendation(content: string, recommendationtemplateid: number) {
  const { data, error } = await supabase
    .from("recommendation")
    .insert([{ content, recommendationtemplateid }])
    .select();

  if (error) {
    console.error("Insert error:", error);
    return { error };
  }

  return { data };
}

// get reportid based on inspectorid
export async function getFromReport(inspectorid: string | number) {
  // Querying joined tables in Supabase usually requires correct syntax or a view.
  // Assuming 'report join equipment' is NOT a valid table name unless it's a view.
  // Standard Supabase join syntax: .from('report').select('reportno, equipment(doshregno)')
  // But sticking to user's intent, assuming 'report' table has keys or View exists.
  // If "report join equipment" is a VIEW:
  const { data, error } = await supabase
    .from("report") // Changed to 'report' assuming standard table, adjust if view.
    .select("reportno, equipment:equipmentid(doshregno)") // Syntax for join if FK exists
    .eq("employeeid", inspectorid); // Corrected .where to .eq

  if (error) {
    console.error("Select error:", error);
    return { error };
  }

  return { data };
}

export async function insertComponentReportDetails(
    findingid: number | null, 
    recommendationid: number | null, 
    photo_path: string, 
    componentid: number | null, 
    inpectionType: string // Typo in original 'inpectionType' kept for consistency if used elsewhere, else fix to 'inspectionType'
) {
  const { data, error } = await supabase
    .from("componentreportdetails")
    .insert([{ findingid, recommendationid, photo_path, componentid, inspectiontype: inpectionType }]) // Map param to column 'inspectiontype'
    .select();

  if (error) {
    console.error("Insert error:", error);
    return { error };
  }

  return { data };
}

// get component based on equipmentid get from report table
export async function getComponent(equipmentid: string | number) {
  const { data, error } = await supabase
    .from("component")
    .select("componentid, name")
    .eq("equipmentid", equipmentid); // Corrected .where to .eq

  if (error) {
    console.error("Select error:", error);
    return { error };
  }

  return { data };
}

export async function updateReportPdfUrl(reportid: string | number, pdf_url: string) {
  const { data, error } = await supabase
    .from("report")
    .update({ pdf_url: pdf_url })
    .eq("reportid", reportid)
    .select();

  if (error) {
    console.error("Update error:", error);
    return { error };
  }

  return { data };
}

// It seems this function was intended to update something else or is a copy-paste error?
// The original code tried to access 'pdf_url' which was not defined.
// And it updates 'componentreportdetails' with 'pdf_url' based on 'reportid'.
// 'componentreportdetails' usually doesn't have 'pdf_url', 'report' table does.
// Assuming this was meant to be 'updateComponentReportDetails' logic or just dead code.
// I will apply types but if `pdf_url` is passed as param it makes sense.
export async function updateComponentReportDetails(reportid: string | number, pdf_url: string) {
  const { data, error } = await supabase
    .from("componentreportdetails")
    .update({ pdf_url: pdf_url } as any) // Cast as any if column might not exist or implicit.
    .eq("reportid", reportid)
    .select();

  if (error) {
    console.error("Select error:", error);
    return { error };
  }

  return { data };
}