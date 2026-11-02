import React, { useRef, useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface DraggableBoxProps {
    id: string | number;
    x: number;
    y: number;
    width: number;
    height: number;
    onUpdate: (id: string | number, rect: { x: number; y: number; width: number; height: number }) => void;
    containerRef: React.RefObject<HTMLDivElement | null>;
    isSelected: boolean;
    onSelect: (id: string | number) => void;
    onDelete: (id: string | number) => void;
}

const DraggableBox: React.FC<DraggableBoxProps> = ({
    id,
    x,
    y,
    width,
    height,
    onUpdate,
    containerRef,
    isSelected,
    onSelect,
    onDelete
}) => {
    const [localRect, setLocalRect] = useState({ x, y, width, height });
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);

    // Refs
    const resizeHandleRef = useRef<string | null>(null);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const initialRectRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

    // Sync local state with props when NOT manipulation
    useEffect(() => {
        if (!isDragging && !isResizing) {
            setLocalRect({ x, y, width, height });
        }
    }, [x, y, width, height, isDragging, isResizing]);

    useEffect(() => {
        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const containerRect = containerRef.current.getBoundingClientRect();

            if (isDragging) {
                const dx = e.clientX - dragStartRef.current.x;
                const dy = e.clientY - dragStartRef.current.y;

                let newX = initialRectRef.current.x + dx;
                let newY = initialRectRef.current.y + dy;

                newX = Math.max(0, Math.min(newX, containerRect.width - initialRectRef.current.width));
                newY = Math.max(0, Math.min(newY, containerRect.height - initialRectRef.current.height));

                setLocalRect(prev => ({ ...prev, x: newX, y: newY }));

            } else if (isResizing && resizeHandleRef.current) {
                const dx = e.clientX - dragStartRef.current.x;
                const dy = e.clientY - dragStartRef.current.y;

                const initial = initialRectRef.current;
                let newReq = { ...initial };

                if (resizeHandleRef.current.includes('e')) {
                    newReq.width = Math.max(20, initial.width + dx);
                }
                if (resizeHandleRef.current.includes('s')) {
                    newReq.height = Math.max(20, initial.height + dy);
                }
                if (resizeHandleRef.current.includes('w')) {
                    const wDiff = Math.min(initial.width - 20, dx);
                    newReq.x = initial.x + wDiff;
                    newReq.width = initial.width - wDiff;
                    if (newReq.x < 0) {
                        newReq.width += newReq.x;
                        newReq.x = 0;
                    }
                }
                if (resizeHandleRef.current.includes('n')) {
                    const hDiff = Math.min(initial.height - 20, dy);
                    newReq.y = initial.y + hDiff;
                    newReq.height = initial.height - hDiff;
                    if (newReq.y < 0) {
                        newReq.height += newReq.y;
                        newReq.y = 0;
                    }
                }

                setLocalRect(newReq);
            }
        };

        const handleGlobalMouseUp = () => {
            if (isDragging || isResizing) {
                onUpdate(id, localRect);
            }
            setIsDragging(false);
            setIsResizing(false);
            resizeHandleRef.current = null;
            document.body.style.cursor = 'default';
        };

        if (isDragging || isResizing) {
            window.addEventListener('mousemove', handleGlobalMouseMove);
            window.addEventListener('mouseup', handleGlobalMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [isDragging, isResizing, containerRef, id, onUpdate, localRect]);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (e.button !== 0) return;

        onSelect(id);
        setIsDragging(true);
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        initialRectRef.current = { ...localRect };
        document.body.style.cursor = 'move';
    };

    const handleResizeStart = (e: React.MouseEvent, handle: string) => {
        e.stopPropagation();
        e.preventDefault();
        onSelect(id);
        setIsResizing(true);
        resizeHandleRef.current = handle;
        dragStartRef.current = { x: e.clientX, y: e.clientY };
        initialRectRef.current = { ...localRect };
    };

    return (
        <div
            style={{
                position: 'absolute',
                left: localRect.x,
                top: localRect.y,
                width: localRect.width,
                height: localRect.height,
                border: '3px solid red',
                cursor: 'move',
                boxShadow: isSelected ? '0 0 0 1px rgba(255, 0, 0, 0.5)' : 'none',
                zIndex: 10
            }}
            onMouseDown={handleMouseDown}
        >
            {isSelected && (
                <>
                    <div
                        style={{
                            position: 'absolute',
                            right: -12,
                            top: -12,
                            width: 20,
                            height: 20,
                            background: 'white',
                            borderRadius: '50%',
                            border: '1px solid gray',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            zIndex: 20,
                            boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                        }}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            onDelete(id);
                        }}
                    >
                        <X size={14} color="red" />
                    </div>

                    <div
                        style={{
                            position: 'absolute',
                            right: -5,
                            bottom: -5,
                            width: 10,
                            height: 10,
                            background: 'white',
                            border: '1px solid red',
                            cursor: 'se-resize'
                        }}
                        onMouseDown={(e) => handleResizeStart(e, 'se')}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            left: -5,
                            bottom: -5,
                            width: 10,
                            height: 10,
                            background: 'white',
                            border: '1px solid red',
                            cursor: 'sw-resize'
                        }}
                        onMouseDown={(e) => handleResizeStart(e, 'sw')}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            right: -5,
                            top: -5,
                            width: 10,
                            height: 10,
                            background: 'white',
                            border: '1px solid red',
                            cursor: 'ne-resize'
                        }}
                        onMouseDown={(e) => handleResizeStart(e, 'ne')}
                    />
                    <div
                        style={{
                            position: 'absolute',
                            left: -5,
                            top: -5,
                            width: 10,
                            height: 10,
                            background: 'white',
                            border: '1px solid red',
                            cursor: 'nw-resize'
                        }}
                        onMouseDown={(e) => handleResizeStart(e, 'nw')}
                    />
                </>
            )}
        </div>
    );
};

export default DraggableBox;