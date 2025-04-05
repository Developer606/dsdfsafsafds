import { useState, useRef, ReactNode, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useUICustomization } from '@/lib/ui-customization-context';

interface DraggableComponentProps {
  id: string;
  className?: string;
  initialPosition?: { x: number; y: number; width?: number; height?: number };
  resizable?: boolean;
  children: ReactNode;
}

export function DraggableComponent({
  id,
  className = '',
  initialPosition = { x: 0, y: 0 },
  resizable = true,
  children,
}: DraggableComponentProps) {
  const { isEditMode, updateComponent, getComponent } = useUICustomization();
  const component = getComponent(id);
  const constraintsRef = useRef<HTMLDivElement>(null);
  const componentRef = useRef<HTMLDivElement>(null);
  
  // Current position state
  const [position, setPosition] = useState({
    x: initialPosition.x,
    y: initialPosition.y,
  });

  // Size state
  const [size, setSize] = useState({
    width: initialPosition.width || 'auto',
    height: initialPosition.height || 'auto',
  });

  // Resizing state
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStartPosition, setResizeStartPosition] = useState({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });

  // Update position when initialPosition changes
  useEffect(() => {
    setPosition({
      x: initialPosition.x,
      y: initialPosition.y,
    });
    
    if (initialPosition.width && initialPosition.height) {
      setSize({
        width: initialPosition.width,
        height: initialPosition.height,
      });
    }
  }, [initialPosition]);

  // Handle drag end (save position)
  const handleDragEnd = (_: any, info: any) => {
    const newPos = { 
      x: position.x + info.offset.x, 
      y: position.y + info.offset.y 
    };
    
    setPosition(newPos);
    
    // Update component position in context
    updateComponent(id, {
      position: {
        ...newPos,
        width: typeof size.width === 'number' ? size.width : undefined,
        height: typeof size.height === 'number' ? size.height : undefined,
      }
    });
  };

  // Start resizing
  const handleResizeStart = (e: React.MouseEvent) => {
    if (!resizable || component?.locked) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setIsResizing(true);
    setResizeStartPosition({ x: e.clientX, y: e.clientY });
    
    // Get current element size
    if (componentRef.current) {
      setInitialSize({
        width: componentRef.current.offsetWidth,
        height: componentRef.current.offsetHeight,
      });
    }
    
    // Add global mouse event listeners
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  // Handle resize movement
  const handleResizeMove = (e: MouseEvent) => {
    if (!isResizing) return;
    
    // Calculate new size
    const deltaX = e.clientX - resizeStartPosition.x;
    const deltaY = e.clientY - resizeStartPosition.y;
    
    const newWidth = Math.max(50, initialSize.width + deltaX);
    const newHeight = Math.max(50, initialSize.height + deltaY);
    
    setSize({
      width: newWidth,
      height: newHeight,
    });
  };

  // End resizing
  const handleResizeEnd = () => {
    setIsResizing(false);
    
    // Remove global listeners
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
    
    // Save new size
    updateComponent(id, {
      position: {
        ...position,
        width: typeof size.width === 'number' ? size.width : undefined,
        height: typeof size.height === 'number' ? size.height : undefined,
      }
    });
  };

  // Calculate style
  const style: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: size.width,
    height: size.height,
    touchAction: 'none',
  };

  return (
    <div ref={constraintsRef} className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        ref={componentRef}
        className={`${className} relative ${isEditMode && !component?.locked ? 'cursor-move' : ''}`}
        drag={isEditMode && !component?.locked}
        dragMomentum={false}
        dragConstraints={constraintsRef}
        onDragEnd={handleDragEnd}
        style={style}
        initial={{ x: position.x, y: position.y }}
        animate={{ x: position.x, y: position.y }}
        transition={{ type: 'spring', damping: 20 }}
      >
        {children}
        
        {/* Resize handle - only shown in edit mode */}
        {isEditMode && resizable && !component?.locked && (
          <div
            className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-se-resize rounded-bl-md"
            onMouseDown={handleResizeStart}
          />
        )}
      </motion.div>
    </div>
  );
}