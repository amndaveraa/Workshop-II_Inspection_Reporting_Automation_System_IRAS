import React, { useRef, useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface DraggableTextProps {
    id: string | number;
    x: number;
    y: number;
    text: string;
    width: number;
    height: number;
    onUpdate: (id: string | number, state: { x: number; y: number; text: string; width: number; height: number }) => void;
    containerRef: React.RefObject<HTMLDivElement | null>;
    isSelected: boolean;
    onSelect: (id: string | number) => void;
    onDelete: (id: string | number) => void;
}

const DraggableText: React.FC<DraggableTextProps> = ({
    id,
    x,
    y,
    text,
    width,
    height,
    onUpdate, // (id, { x, y, text, width, height })
    containerRef,
    isSelected,
    onSelect,
    onDelete
}) => {
    // Local state for smooth dragging
    const [localState, setLocalState] = useState({ x, y, width, height, text });
    const [isDragging, setIsDragging] = useState(false);

    // Sync local state when props change externally (initially or parent updates)
    useEffect(() => {
        if (!isDragging) {
            setLocalState(prev => ({ ...prev, x, y, width, height, text }));
        }
    }, [x, y, width, height, text, isDragging]); // Added isDragging to dependency
    const dragStartRef = useRef({ x: 0, y: 0 });
    const initialRectRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (!containerRef.current || !isDragging) return;

            const containerRect = containerRef.current.getBoundingClientRect();

            const dx = e.clientX - dragStartRef.current.x;
            const dy = e.clientY - dragStartRef.current.y;

            let newX = initialRectRef.current.x + dx;
            let newY = initialRectRef.current.y + dy;

            // Boundary checks
            // For text, width might be auto, but let's assume some reasonable bounds or use the ref
            // Using a simple approximation or allowing partial overlap for now.
            newX = Math.max(0, Math.min(newX, containerRect.width - 20));
            newY = Math.max(0, Math.min(newY, containerRect.height - 20));

            setLocalState(prev => ({ ...prev, x: newX, y: newY }));
        };

        const handleGlobalMouseUp = () => {
            if (isDragging) {
                onUpdate(id, localState);
            }
            setIsDragging(false);
            document.body.style.cursor = 'default';
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleGlobalMouseMove);
            window.addEventListener('mouseup', handleGlobalMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [isDragging, containerRef, id, onUpdate, localState]);


    const handleMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        // Allow interaction with input if clicking directly on it? 
        // Usually we want a drag handle or hold to drag. 
        // Let's assume clicking border or non-input area starts drag, 
        // but since it's small, maybe just drag everywhere except when editing.
        // For simplicity: If focused, don't drag? Or use a handle.
        // Let's try: Drag on plain mousedown. If user wants to type, they might need to double click or click specifically?
        // Actually, for inputs, browser behavior on mousedown is to focus.
        // We need to prevent drag if target is the input and we want to edit.
        // Strategy: Drag if `e.target` is the container div. 

        if ((e.target as HTMLElement).tagName === "INPUT") return; // Let input handle focus/typing

        e.preventDefault();
        if (e.button !== 0) return;

        onSelect(id);
        setIsDragging(true);
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        initialRectRef.current = { x: localState.x, y: localState.y };
        document.body.style.cursor = 'move';
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setLocalState(prev => ({ ...prev, text: val }));
        // Note: For text content updates, we might want to push to parent immediately or onBlur. 
        // Pushing onBlur is safer for performance, but `onUpdate` is available.
        // Let's update parent onBlur.
    };

    const handleBlur = () => {
        onUpdate(id, localState);
    };

    return (
        <div
            style={{
                position: 'absolute',
                left: localState.x,
                top: localState.y,
                // height: localState.height, // Auto height for text
                // width: localState.width,   // Auto width or fixed?
                padding: '4px',
                backgroundColor: 'white',
                border: isSelected ? '2px solid blue' : '1px solid black',
                cursor: 'move',
                zIndex: 20
            }}
            onMouseDown={handleMouseDown}
            onClick={(e) => {
                e.stopPropagation();
                onSelect(id);
            }}
        >
            {/* Delete Button */}
            {isSelected && (
                <div
                    style={{
                        position: 'absolute',
                        right: -10,
                        top: -10,
                        width: 18,
                        height: 18,
                        background: 'white',
                        borderRadius: '50%',
                        border: '1px solid gray',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 30, // Higher than text
                        boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                    }}
                    onMouseDown={(e) => {
                        e.stopPropagation();
                        onDelete(id);
                    }}
                >
                    <X size={12} color="red" />
                </div>
            )}

            <input
                type="text"
                value={localState.text}
                onChange={handleChange}
                onBlur={handleBlur}
                style={{
                    border: 'none',
                    outline: 'none',
                    backgroundColor: 'transparent',
                    color: 'black',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    width: '150px', // Fixed width for now, or dynamic
                    cursor: 'text'
                }}
                onMouseDown={(e) => e.stopPropagation()} // Allow input focus
            />
        </div>
    );
};

export default DraggableText;