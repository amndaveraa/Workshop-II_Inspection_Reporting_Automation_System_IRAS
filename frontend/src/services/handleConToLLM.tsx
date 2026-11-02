
interface AIResponse {
    finding: {
        id: number | null;
        text: string;
    };
    recommendation: {
        id: number | null;
        text: string;
    };
    confidence: number;
}

export default async function handleGenerateDraft(imageBase64: string, component: string, inspectionType: string = "Visual Inspection"): Promise<AIResponse | null> {
    try {
        const response = await fetch('http://localhost:5000/api/ai/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                imageBase64,
                component,
                inspectionType
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: AIResponse = await response.json();
        return data;

    } catch (error) {
        console.error("Error generating draft report:", error);
        return null; // Or throw, depending on how UI handles it
    }
}