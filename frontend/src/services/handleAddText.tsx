interface TextAnnotation {
    x: number;
    y: number;
    text: string;
}

export const mergeAnnotationsWithText = (imageSrc: string, annotations: TextAnnotation[]): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!annotations || annotations.length === 0) {
            resolve(imageSrc);
            return;
        }

        const img = new Image();
        img.crossOrigin = "Anonymous"; // Enable CORS if needed
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
                reject(new Error("Could not get canvas context"));
                return;
            }

            // Draw original image
            ctx.drawImage(img, 0, 0);

            // We need to know the scale factor between the displayed image (where annotations were placed)
            // and the actual natural image size.
            // CAUTION: The 'annotations' currently store x,y relative to the *displayed* size.
            // We don't have the displayed size here directly.

            // OPTION 1: Pass container dimensions to this function.
            // OPTION 2: Normalizing coordinates (0-1) is better practice but requires refactoring DraggableBox.

            // Given the current implementation in App.jsx, 'annotations' contains absolute pixel values
            // based on the *rendered* image size in the DOM at the moment of interaction.
            // We need to pass the render dimensions to this function to scale correctly.

            // However, to keep it simple for now, we will simply resolve with a PLACEHOLDER implementation
            // that assumes 1:1 scale or simply draws them as is, 
            // BUT looking at the plan: "Calculate scale factor (Image Natural Size / Container Size)"
            // I need to update App.jsx to pass the container size OR update this function to accept it.

            resolve(imageSrc); // Temporary resolve to avoid breaking, will update in next step with proper scaling logic.
        };
        img.onerror = reject;
        img.src = imageSrc;
    });
};

export const mergeAnnotationsWithTextWithScale = (imageSrc: string, textAnnotations: TextAnnotation[], containerWidth: number, containerHeight: number): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!textAnnotations || textAnnotations.length === 0) {
            resolve(imageSrc);
            return;
        }

        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                reject(new Error("Could not get canvas context"));
                return;
            }

            ctx.drawImage(img, 0, 0);

            const scaleX = img.naturalWidth / containerWidth;
            const scaleY = img.naturalHeight / containerHeight;
            const avgScale = (scaleX + scaleY) / 2;

            textAnnotations.forEach(ann => {
                if (!ann.text) return;

                const x = ann.x * scaleX;
                const y = ann.y * scaleY;

                // Styling based on request (White box, black text)
                const fontSize = 30 * avgScale; // Scale font size
                ctx.font = `bold ${fontSize}px sans-serif`;

                // Measure text for background box
                const textMetrics = ctx.measureText(ann.text);
                const textHeight = fontSize; // Approx
                const padding = 4 * avgScale;
                const boxWidth = textMetrics.width + (padding * 2);
                const boxHeight = textHeight + (padding * 2);

                // Draw White Background Box
                ctx.fillStyle = 'white';
                ctx.fillRect(x, y, boxWidth, boxHeight);

                // Draw Black Border (Matches UI)
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1 * avgScale;
                ctx.strokeRect(x, y, boxWidth, boxHeight);

                // Draw Text
                ctx.fillStyle = 'black';
                ctx.textBaseline = 'top';
                ctx.fillText(ann.text, x + padding, y + padding);
            });

            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = (err) => {
            console.error("Error loading image for text merger:", err);
            reject(err);
        };
        img.src = imageSrc;
    });
};