import { ReactNode, useState } from 'react';
import { motion } from 'framer-motion';
import { useUICustomization } from '@/lib/ui-customization-context';
import { Button } from '@/components/ui/button';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger 
} from '@/components/ui/popover';
import { DraggableComponent } from './draggable-component';
import { StyleCustomizer } from './style-customizer';
import { ActionCustomizer } from './action-customizer';
import {
  Palette,
  Edit,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  RotateCw,
  Copy,
  Trash2
} from 'lucide-react';

interface CustomizableComponentProps {
  id: string;
  type: 'container' | 'text' | 'image' | 'button' | 'input' | 'custom';
  defaultContent?: ReactNode;
  className?: string;
  initialPosition?: { x: number; y: number; width?: number; height?: number };
  initialStyle?: Record<string, any>;
  initialActions?: Record<string, any>;
  isResizable?: boolean;
  actionKeys?: string[];
  children?: ReactNode;
}

export function CustomizableComponent({
  id,
  type,
  defaultContent,
  className = '',
  initialPosition = { x: 0, y: 0 },
  initialStyle = {},
  initialActions = {},
  isResizable = true,
  actionKeys = ['onClick', 'onHover', 'onLongPress'],
  children,
}: CustomizableComponentProps) {
  const { isEditMode, getComponent, updateComponent, removeComponent, addComponent } = useUICustomization();
  const component = getComponent(id) || {
    id,
    type,
    content: '',
    position: initialPosition,
    style: initialStyle,
    actions: initialActions,
    visible: true,
    locked: false,
  } as const;
  
  // Customization state
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [customizationType, setCustomizationType] = useState<'style' | 'action'>('style');
  const [activeActionKey, setActiveActionKey] = useState(actionKeys[0] || 'onClick');

  // Generate CSS styles from component style properties
  const getStyles = () => {
    if (!component?.style) return {};
    
    const { 
      backgroundColor, 
      textColor, 
      borderColor, 
      borderWidth, 
      borderRadius, 
      padding, 
      opacity, 
      fontSize, 
      fontWeight,
      shadow,
      ...rest 
    } = component.style;
    
    const styles: Record<string, any> = {
      ...rest
    };
    
    if (backgroundColor) styles.backgroundColor = backgroundColor;
    if (textColor) styles.color = textColor;
    if (borderColor) styles.borderColor = borderColor;
    if (typeof borderWidth === 'number') styles.borderWidth = `${borderWidth}px`;
    if (typeof borderRadius === 'number') styles.borderRadius = `${borderRadius}px`;
    if (typeof padding === 'number') styles.padding = `${padding}px`;
    if (typeof opacity === 'number') styles.opacity = opacity / 100;
    if (typeof fontSize === 'number') styles.fontSize = `${fontSize}px`;
    if (typeof fontWeight === 'number') styles.fontWeight = fontWeight;
    
    // Add shadow
    if (shadow && shadow !== 'none') {
      switch (shadow) {
        case 'sm': styles.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)'; break;
        case 'md': styles.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'; break;
        case 'lg': styles.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'; break;
        case 'xl': styles.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'; break;
        case 'inner': styles.boxShadow = 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)'; break;
      }
    }
    
    return styles;
  };

  // Select appropriate animation variant based on component style
  const getAnimationVariant = () => {
    switch (component.style.animation) {
      case "fadeIn":
        return {
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { duration: 0.5 } }
        };
      case "slideUp":
        return {
          hidden: { opacity: 0, y: 50 },
          visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
        };
      case "slideDown":
        return {
          hidden: { opacity: 0, y: -50 },
          visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
        };
      case "bounce":
        return {
          hidden: { scale: 0.8, opacity: 0 },
          visible: { 
            scale: 1, 
            opacity: 1, 
            transition: { 
              type: "spring", 
              stiffness: 300, 
              damping: 10 
            } 
          }
        };
      case "pulse":
        return {
          hidden: { scale: 1 },
          visible: { 
            scale: [1, 1.05, 1], 
            transition: { 
              duration: 0.5, 
              repeat: Infinity, 
              repeatType: "reverse" as "reverse"  // Explicitly typed as literal
            } 
          }
        };
      case "zoomIn":
        return {
          hidden: { scale: 0, opacity: 0 },
          visible: { scale: 1, opacity: 1, transition: { duration: 0.5 } }
        };
      case "rotate":
        return {
          hidden: { rotate: -180, opacity: 0 },
          visible: { 
            rotate: 0, 
            opacity: 1, 
            transition: { duration: 0.5 } 
          }
        };
      default:
        return {
          hidden: { opacity: 1 },
          visible: { opacity: 1 }
        };
    }
  };

  // Handle component action execution
  const executeAction = (actionKey: string) => {
    if (!isEditMode && component.actions[actionKey]) {
      const action = component.actions[actionKey];
      
      if (action.action === 'navigate' && action.target) {
        if (action.target.startsWith('http')) {
          window.open(action.target, '_blank');
        } else {
          window.location.href = action.target;
        }
      } else if (action.action === 'modal' && action.target) {
        // This would need to be connected to your modal system
        // For now, just console.log
        console.log(`Open modal: ${action.target}`);
      } else if (action.action === 'function' && action.target) {
        // This would need to be connected to a registry of available functions
        // For now, just console.log
        console.log(`Call function: ${action.target}`);
      }
    }
  };

  // Toggle component visibility
  const toggleVisibility = () => {
    updateComponent(id, {
      visible: !component.visible
    });
  };

  // Toggle component lock status
  const toggleLock = () => {
    updateComponent(id, {
      locked: !component.locked
    });
  };

  // Reset component to default
  const resetComponent = () => {
    updateComponent(id, {
      style: initialStyle,
      actions: initialActions,
      position: initialPosition,
      visible: true,
      locked: false
    });
  };

  // Delete this component
  const deleteComponent = () => {
    removeComponent(id);
  };

  // Duplicate this component
  const duplicateComponent = () => {
    const newId = `${id}_copy_${Date.now()}`;
    addComponent({
      ...component,
      id: newId,
      position: {
        ...component.position,
        x: component.position.x + 20,
        y: component.position.y + 20
      }
    });
  };

  // If component is hidden and not in edit mode, don't render it
  if (!component.visible && !isEditMode) {
    return null;
  }

  // Content to render - either children or component content
  const content = (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={getAnimationVariant()}
      style={{
        ...getStyles(),
        visibility: isEditMode && !component.visible ? 'visible' : undefined,
        opacity: isEditMode && !component.visible ? 0.5 : undefined
      }}
      className={`${className} ${isEditMode && !component.visible ? 'opacity-50' : ''}`}
      onClick={() => executeAction("onClick")}
      onMouseEnter={() => executeAction("onHover")}
      onContextMenu={(e) => {
        e.preventDefault();
        executeAction("onLongPress");
        return false;
      }}
    >
      {children || component.content || defaultContent}
    </motion.div>
  );

  // If in edit mode, wrap with edit controls
  return (
    <>
      {isEditMode ? (
        <DraggableComponent
          id={id}
          className={`${component.locked ? 'cursor-not-allowed opacity-60' : ''}`}
          initialPosition={component.position}
          resizable={isResizable && !component.locked}
        >
          {/* Edit toolbar (only shown in edit mode) */}
          <div className="absolute -top-10 left-0 right-0 flex justify-center z-50">
            <div className="bg-gray-800 rounded-full shadow-lg flex items-center space-x-1 p-1">
              <Popover open={isCustomizing && customizationType === "style"} onOpenChange={(open) => {
                if (!open) setIsCustomizing(false);
              }}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-gray-800 text-white hover:bg-gray-700"
                    onClick={() => {
                      setCustomizationType("style");
                      setIsCustomizing(true);
                    }}
                    disabled={component.locked}
                  >
                    <Palette className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="center" className="w-auto p-0">
                  <StyleCustomizer 
                    componentId={id} 
                    onClose={() => setIsCustomizing(false)} 
                  />
                </PopoverContent>
              </Popover>
              
              <Popover open={isCustomizing && customizationType === "action"} onOpenChange={(open) => {
                if (!open) setIsCustomizing(false);
              }}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full bg-gray-800 text-white hover:bg-gray-700"
                    onClick={() => {
                      setCustomizationType("action");
                      setIsCustomizing(true);
                    }}
                    disabled={component.locked}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="center" className="w-auto p-0">
                  <div>
                    <div className="flex justify-center mb-2">
                      {actionKeys.map((key) => (
                        <Button
                          key={key}
                          variant={key === activeActionKey ? "default" : "outline"}
                          size="sm"
                          className="text-xs mx-1"
                          onClick={() => setActiveActionKey(key)}
                        >
                          {key.replace("on", "")}
                        </Button>
                      ))}
                    </div>
                    <ActionCustomizer
                      componentId={id}
                      actionKey={activeActionKey}
                      onClose={() => setIsCustomizing(false)}
                    />
                  </div>
                </PopoverContent>
              </Popover>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full bg-gray-800 text-white hover:bg-gray-700"
                onClick={toggleVisibility}
              >
                {component.visible ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full bg-gray-800 text-white hover:bg-gray-700"
                onClick={toggleLock}
              >
                {component.locked ? (
                  <Lock className="h-4 w-4" />
                ) : (
                  <Unlock className="h-4 w-4" />
                )}
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full bg-gray-800 text-white hover:bg-gray-700"
                onClick={resetComponent}
                disabled={component.locked}
              >
                <RotateCw className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full bg-gray-800 text-white hover:bg-gray-700"
                onClick={duplicateComponent}
              >
                <Copy className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full bg-red-800 text-white hover:bg-red-700"
                onClick={deleteComponent}
                disabled={component.locked}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {content}
        </DraggableComponent>
      ) : (
        content
      )}
    </>
  );
}