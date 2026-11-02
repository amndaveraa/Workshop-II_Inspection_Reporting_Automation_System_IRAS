
import { Request, Response } from 'express';
import { Anthropic } from '@anthropic-ai/sdk';
import supabase from '../config/supabaseClient';

const FIRST_PAGE_SYSTEM_PROMPT = 
`You are a certified API 510 pressure vessel inspector preparing an official inspection report.

Your task is to generate ONLY the section titled:
“FINDINGS, NON-DESTRUCTIVE TESTINGS & RECOMMENDATIONS”

WRITING STYLE (MANDATORY):
• Match REAL REPORT examples exactly.
• Short, factual, engineering statements.
• Formal third-person language.
• No introductions, no explanations, no summaries.
• Use ONLY provided data. Do NOT invent content.

OUTPUT EXACTLY FOUR SECTIONS WITH THESE EXACT HEADERS:
External Findings
Internal Findings
NON-DESTRUCTIVE TESTINGS
RECOMMENDATIONS

-------------------------
CONTENT RULES
-------------------------

1. FINDINGS (External & Internal)
• Separate strictly by inspection type.
• Use the PROVIDED ID exactly.
• One finding per ID.
• ONE short sentence per line.
• Avoid unnecessary descriptors.
• Approved verbs only: found, observed, noted.

Example:
2.3 Internal top dish head noted with surface discoloration.

-------------------------

2. NON-DESTRUCTIVE TESTINGS
• List ONLY performed tests.
• Use standard report wording.
• Keep to one concise sentence.

Standard format:
UTTM: No significant wall loss detected compared to nominal thickness. Please refer UTTM report.

If none performed:
No NDT performed.

-------------------------

3. RECOMMENDATIONS
• Provide recommendations ONLY where applicable.
• Match numbering exactly to findings.
• One line per ID.
• “Nil.” is valid.
• Use direct action verbs. No explanations.

Examples:
2.3: To be monitored next opportunity.
1.1: Nil.

-------------------------

STRICT RESTRICTIONS
• Do NOT restate findings in recommendations.
• Do NOT merge IDs.
• Do NOT add standards, photos, or comments.
• Output plain text only.

Generate the report now.

`;

export const generateFirstPageSummary = async (req: Request, res: Response): Promise<any> => {
    try {
        // User can still pass direct data, OR pass reportId to fetch from DB
        const { reportId, equipmentDetails: bodyDetails } = req.body;

        let findings: any[] = [];
        let recommendations: any[] = [];
        let equipmentDetails = bodyDetails;
        let ndtResults = "No NDT records provided."; // Placeholder or fetch if table exists

        if (reportId) {
            console.log(`📡 Fetching data for Report ID: ${reportId}`);

            // 1. Fetch Findings & Recommendations from componentreportdetails
            const { data: reportEntries, error: dbError } = await supabase
                .from("componentreportdetails")
                .select(`
                    inspectiontype,
                    component:componentid (name),
                    finding:findingid (description),
                    recommendation:recommendationid (content)
                `)
                .eq("reportid", reportId);

            if (dbError) {
                console.error("Supabase Error:", dbError);
                throw new Error("Failed to fetch report details from database");
            }

            if (reportEntries && reportEntries.length > 0) {
                // Map DB result to structured input for AI
                findings = reportEntries
                    .filter((r: any) => r.finding?.description)
                    .map((r: any, index: number) => ({
                        id: index + 1, // Explicit 1-based ID
                        component: r.component?.name || "Unknown Component",
                        finding: r.finding.description,
                        type: r.inspectiontype 
                    }));

                recommendations = reportEntries
                    .filter((r: any) => r.recommendation?.content)
                    .map((r: any, index: number) => ({
                        id: index + 1, // Explicit 1-based ID matching finding logic IF strict 1:1 maintained by user
                        component: r.component?.name || "Unknown Component",
                        recommendation: r.recommendation.content
                    }));
            }

            // 2. Fetch Equipment Details if not provided in body
            if (!equipmentDetails) {
                 const { data: reportData, error: reportError } = await supabase
                    .from('report')
                    .select(`
                        report_no,
                        equipment:equipmentid (
                            name,
                            tagno
                        )
                    `)
                    .eq('reportid', reportId)
                    .single();
                
                if (reportData && !reportError) {
                    // @ts-ignore
                    equipmentDetails = {
                        // @ts-ignore
                        name: reportData.equipment?.name,
                        // @ts-ignore
                        tagNo: reportData.equipment?.tagno
                    };
                }
            }
        } else {
             // Fallback to body provided arrays if no reportId (legacy support)
             findings = req.body.findings || [];
             recommendations = req.body.recommendations || [];
        }

        console.log(`🤖 AI Input: ${findings.length} findings, ${recommendations.length} recommendations`);

        // Construct the Input Data for the AI
        let inputData = `INSPECTION DATA:\n\n`;
        
        if (equipmentDetails) {
             inputData += `EQUIPMENT: ${equipmentDetails.name} (${equipmentDetails.tagNo})\n`;
        }

        inputData += `\n--- EXTERNALS ---\n`;
        // Pass complete list with types so AI can sort Internal vs External
        inputData += JSON.stringify(findings, null, 2);

        inputData += `\n\n--- RECOMMENDATIONS ---\n`;
        inputData += JSON.stringify(recommendations, null, 2);

        inputData += `\n\n--- NDT RESULTS ---\n`;
        inputData += req.body.ndtResults || ndtResults;

        const apiKey = process.env.ANTHROPIC_API_KEY;
        console.log("🔑 API Key Check:", apiKey ? "Present (Starts with " + apiKey.substring(0, 7) + "...)" : "MISSING");

        if (!apiKey) {
            console.error("❌ ANTHROPIC_API_KEY is definitely missing from process.env");
             return res.status(500).json({ error: 'Server configuration error: API Key missing.' });
        }

        const anthropic = new Anthropic({
            apiKey: apiKey, 
        });

        const response = await anthropic.messages.create({
            model: "claude-opus-4-20250514", // Updated to latest Sonnet
            max_tokens: 2048,
            system: FIRST_PAGE_SYSTEM_PROMPT,
            messages: [
                {
                    role: 'user',
                    content: inputData
                }
            ],
            temperature: 0 // Deterministic for formal reports
        });

        const responseText = response.content[0].type === 'text' ? response.content[0].text : '';

        // Return plain text as requested by format
        res.json({ generatedText: responseText });

    } catch (error) {
        console.error('❌ First Page AI Generation Error Details:', error);
        // @ts-ignore
        if (error.response) {
            // @ts-ignore
            console.error('Anthropic API Error:', error.response.status, error.response.data);
        }
        res.status(500).json({ error: 'Failed to generate first page summary', details: error instanceof Error ? error.message : String(error) });
    }
};
