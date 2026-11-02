
interface FirstPageInput {
    reportId?: string | number; // Added for DB fetch
    findings: any[];
    recommendations: any[];
    ndtResults?: string;
    equipmentDetails?: any;
}

interface FirstPageOutput {
    generatedText: string;
}

export interface FirstPageParsed {
    external: string;
    internal: string;
    ndt: string;
    recommendations: string;
}

const parseAIOutput = (text: string): FirstPageParsed => {
    console.log("📝 Parsing AI Raw Text:", text); // Debug log

    const result = {
        external: 'Nil',
        internal: 'Nil',
        ndt: 'Nil',
        recommendations: 'Nil'
    };

    try {
        // Normalize newlines
        const cleanText = text.replace(/\r\n/g, '\n');
        // Regex patterns - Robust "Until Next Header" strategy
        // We capture until we see one of the other headers, or end of text.

        // headers pattern to look ahead for:
        const nextHeaderPattern = "(?:Internal Findings|NON-DESTRUCTIVE|RECOMMENDATIONS|$)";

        // 1. External
        // Look for "External Findings", capture until "Internal Findings", "NDT", "Recs" or End
        const extMatch = cleanText.match(new RegExp(`External Findings[:\\s-]*\\n([\\s\\S]*?)(?=\\n\\s*(?:-|\\d+\\.|[A-Z]\\.)?\\s*${nextHeaderPattern})`, 'i'));
        if (extMatch && extMatch[1]) result.external = extMatch[1].trim();

        // 2. Internal
        // Look for "Internal Findings", capture until "NDT", "Recs" or End
        const intMatch = cleanText.match(new RegExp(`Internal Findings[:\\s-]*\\n([\\s\\S]*?)(?=\\n\\s*(?:-|\\d+\\.|[A-Z]\\.)?\\s*(?:NON-DESTRUCTIVE|RECOMMENDATIONS|$))`, 'i'));
        if (intMatch && intMatch[1]) result.internal = intMatch[1].trim();

        // 3. NDT
        // Look for "NON-DESTRUCTIVE...", capture until "Recs" or End
        const ndtMatch = cleanText.match(new RegExp(`NON-DESTRUCTIVE(?: TESTINGS)?[:\\s-]*\\n([\\s\\S]*?)(?=\\n\\s*(?:-|\\d+\\.|[A-Z]\\.)?\\s*(?:RECOMMENDATIONS|$))`, 'i'));
        if (ndtMatch && ndtMatch[1]) result.ndt = ndtMatch[1].trim();

        // 4. Recommendations
        // Capture everything after Recommendations
        const recMatch = cleanText.match(/RECOMMENDATIONS[:\s-]*\n([\s\S]*)/i);
        if (recMatch && recMatch[1]) result.recommendations = recMatch[1].trim();

    } catch (e) {
        console.error("Error parsing AI text", e);
    }
    
    console.log("✅ Parsed Result:", result);
    return result;
};

const handleFirstPageAI = async (input: FirstPageInput): Promise<FirstPageParsed | null> => {
    try {
        const response = await fetch('http://localhost:5000/api/ai/first-page', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(input),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: FirstPageOutput = await response.json();
        // Parse the raw text into structured fields
        return parseAIOutput(data.generatedText);

    } catch (error) {
        console.error("Error generating first page summary:", error);
        return null; // Return null on failure so caller can handle fallback
    }
};

export default handleFirstPageAI;