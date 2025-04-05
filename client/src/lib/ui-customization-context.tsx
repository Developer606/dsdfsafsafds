import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';

// Type definitions
export type CustomizableComponentType = {
  id: string;
  type: 'container' | 'text' | 'image' | 'button' | 'input' | 'custom';
  content?: ReactNode;
  position: {
    x: number;
    y: number;
    width?: number;
    height?: number;
  };
  style: {
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
    borderWidth?: number;
    borderRadius?: number;
    padding?: number;
    opacity?: number;
    fontSize?: number;
    fontWeight?: number;
    animation?: string;
    shadow?: string;
    [key: string]: any;
  };
  actions: Record<string, {
    action: 'none' | 'navigate' | 'modal' | 'function';
    target?: string;
    [key: string]: any;
  }>;
  visible: boolean;
  locked: boolean;
};

export type UICustomizationContextType = {
  isEditMode: boolean;
  toggleEditMode: () => void;
  components: Record<string, CustomizableComponentType>;
  getComponent: (id: string) => CustomizableComponentType | undefined;
  addComponent: (component: CustomizableComponentType) => void;
  updateComponent: (id: string, updates: Partial<CustomizableComponentType>) => void;
  removeComponent: (id: string) => void;
  saveCustomizations: () => void;
  loadCustomizations: (data: Record<string, CustomizableComponentType>) => void;
  resetAllCustomizations: () => void;
};

// Create context with default values
const UICustomizationContext = createContext<UICustomizationContextType>({
  isEditMode: false,
  toggleEditMode: () => {},
  components: {},
  getComponent: () => undefined,
  addComponent: () => {},
  updateComponent: () => {},
  removeComponent: () => {},
  saveCustomizations: () => {},
  loadCustomizations: () => {},
  resetAllCustomizations: () => {}
});

// Storage keys
const STORAGE_KEY = 'ui_customizations';
const EDIT_MODE_KEY = 'ui_edit_mode';

// Provider component
export function UICustomizationProvider({ children }: { children: ReactNode }) {
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [components, setComponents] = useState<Record<string, CustomizableComponentType>>({});
  
  // Load saved customizations and edit mode status on mount
  useEffect(() => {
    try {
      // Load edit mode status
      const savedEditMode = localStorage.getItem(EDIT_MODE_KEY);
      if (savedEditMode) {
        setIsEditMode(JSON.parse(savedEditMode));
      }
      
      // Load customizations
      const savedCustomizations = localStorage.getItem(STORAGE_KEY);
      if (savedCustomizations) {
        setComponents(JSON.parse(savedCustomizations));
      }
    } catch (error) {
      console.error('Failed to load UI customizations:', error);
    }
  }, []);
  
  // Toggle edit mode
  const toggleEditMode = () => {
    const newMode = !isEditMode;
    setIsEditMode(newMode);
    
    // Save edit mode status
    localStorage.setItem(EDIT_MODE_KEY, JSON.stringify(newMode));
  };
  
  // Get a specific component
  const getComponent = (id: string) => {
    return components[id];
  };
  
  // Add a new component
  const addComponent = (component: CustomizableComponentType) => {
    setComponents((prev) => ({
      ...prev,
      [component.id]: component
    }));
  };
  
  // Update an existing component
  const updateComponent = (id: string, updates: Partial<CustomizableComponentType>) => {
    setComponents((prev) => {
      if (!prev[id]) return prev;
      
      return {
        ...prev,
        [id]: {
          ...prev[id],
          ...updates,
          // Handle nested objects
          style: updates.style ? { ...prev[id].style, ...updates.style } : prev[id].style,
          actions: updates.actions ? { ...prev[id].actions, ...updates.actions } : prev[id].actions,
          position: updates.position ? { ...prev[id].position, ...updates.position } : prev[id].position,
        }
      };
    });
  };
  
  // Remove a component
  const removeComponent = (id: string) => {
    setComponents((prev) => {
      const newComponents = { ...prev };
      delete newComponents[id];
      return newComponents;
    });
  };
  
  // Save customizations to local storage
  const saveCustomizations = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(components));
      alert('Customizations saved successfully!');
    } catch (error) {
      console.error('Failed to save customizations:', error);
      alert('Failed to save customizations.');
    }
  };
  
  // Load customizations from external data
  const loadCustomizations = (data: Record<string, CustomizableComponentType>) => {
    setComponents(data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };
  
  // Reset all customizations
  const resetAllCustomizations = () => {
    if (window.confirm('Are you sure you want to reset all customizations? This cannot be undone.')) {
      setComponents({});
      localStorage.removeItem(STORAGE_KEY);
    }
  };
  
  // Value object for the context provider
  const value: UICustomizationContextType = {
    isEditMode,
    toggleEditMode,
    components,
    getComponent,
    addComponent,
    updateComponent,
    removeComponent,
    saveCustomizations,
    loadCustomizations,
    resetAllCustomizations
  };
  
  return (
    <UICustomizationContext.Provider value={value}>
      {children}
    </UICustomizationContext.Provider>
  );
}

// Custom hook for consuming the context
export function useUICustomization() {
  return useContext(UICustomizationContext);
}