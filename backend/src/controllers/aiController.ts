
import { Request, Response } from 'express';
import { Anthropic } from '@anthropic-ai/sdk';
import supabase from '../config/supabaseClient';

const SYSTEM_PROMPT = `You are a certified pressure vessel inspector drafting a report.
You have been provided with a list of standard FINDINGS and RECOMMENDATIONS from the company's database.
Your task is to analyze the provided inspection image and:
1.  **Analyze the Component**: You are inspecting a \${component} using \${inspectionType}. Use this context.
2.  **Select Finding**: Select the most appropriate FINDING from the provided list.
    *   **CRITICAL**: The Finding MUST NOT be "Nil". Even if the condition is good, describe it (e.g., "No visible defects," "Surface condition satisfactory").
    *   If no specific defect matches, OR if the condition is unique, select the finding template labeled "Other" (or similar generic ID) and draft a specific description based on the image.
3.  **Select Recommendation**: Select the most appropriate RECOMMENDATION from the provided list.
    *   **NOTE**: If no action is required, you MAY select the "Nil" or "Satisfactory" option if available in the list.
    *   If a specific recommendation is needed but not found, select "Other" and draft it.
4.  **Modify Text**: If the selected template text is generic (or is "Other"), YOU MUST MODIFY IT to include specific details observed in the image (e.g., location, severity, dimensions, extent).

OUTPUT FORMAT:
Return a JSON object with the following structure:
{
    "finding": {
        "id": number | null, // The ID of the selected template ('Other' or specific), or null if strictly no match (avoid null)
        "text": "The final finding text to be put in the report (modified as needed)"
    },
    "recommendation": {
        "id": number | null, // The ID of the selected template ('Other' or specific), or null
        "text": "The final recommendation text (modified as needed)"
    },
    "confidence": number // 0 to 100
}
NO other text or markdown. Just the JSON.`;

export const generateDraftReport = async (req: Request, res: Response): Promise<any> => {
    try {
        const { imageBase64, component, inspectionType } = req.body;

        if (!imageBase64) {
            return res.status(400).json({ error: 'Image is required' });
        }

        // 1. Retrieve RAG Context (Examples/Templates) from Supabase
        const { data: findingsData, error: findingsError } = await supabase
            .from('findingtemplate')
            .select('findingtemplateid, templatecontent')
            .order('findingtemplateid');
            
        const { data: recsData, error: recsError } = await supabase
            .from('recommendationtemplate')
            .select('recommendationtemplateid, templatecontent')
            .order('recommendationtemplateid');

        // Log errors but proceed (empty lists will handle it)
        if (findingsError) console.error("Error fetching findings:", findingsError);
        if (recsError) console.error("Error fetching recommendations:", recsError);

        const findingsList = findingsData?.map(f => `[ID: ${f.findingtemplateid}] ${f.templatecontent}`).join('\n') || "No standard findings available.";
        const recsList = recsData?.map(r => `[ID: ${r.recommendationtemplateid}] ${r.templatecontent}`).join('\n') || "No standard recommendations available.";

        // 2. Construct Prompt for Claude
        const userMessage = `
        Component: ${component || "Unknown"}
        Inspection Type: ${inspectionType || "Visual Inspection"}
        
        Available Standard Findings:
        ${findingsList}

        Available Standard Recommendations:
        ${recsList}

        Analyze the image and provide the draft finding and recommendation based on the standard lists above.
        `;

        // 3. Call Claude Opus
        // Note: Initialize client here to ensure env vars are loaded and catch missing key errors cleanly
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            console.error("ANTHROPIC_API_KEY is missing in environment variables.");
             return res.status(500).json({ error: 'Server configuration error: API Key missing.' });
        }

        const anthropic = new Anthropic({
            apiKey: apiKey,
        });

        // Note: Switched to Sonnet 3.5 as user lacks Opus access
        const response = await anthropic.messages.create({
            model: "claude-opus-4-20250514",
            max_tokens: 1024,
            system: SYSTEM_PROMPT,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'image',
                            source: {
                                type: 'base64',
                                media_type: 'image/jpeg', // Assuming JPEG
                                data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
                            },
                        },
                        {
                            type: 'text',
                            text: userMessage
                        }
                    ],
                }
            ],
        });

        // 4. Parse Response
        const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
        let jsonResponse;
        try {
            // Attempt to clean markdown if present
            const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            jsonResponse = JSON.parse(cleanText);
        } catch (e) {
            console.error("Failed to parse AI response as JSON:", responseText);
            // Fallback to raw text
            jsonResponse = {
                finding: { id: null, text: responseText },
                recommendation: { id: null, text: "Review generated text." },
                confidence: 50
            };
        }

        res.json(jsonResponse);

    } catch (error) {
        console.error('AI Generation Error:', error);
        res.status(500).json({ error: 'Failed to generate report draft', details: error });
    }
};
