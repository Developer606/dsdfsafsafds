import { useState } from 'react';
import { useUICustomization, CustomizableComponentType } from '@/lib/ui-customization-context';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from '@/components/ui/tooltip';

import {
  Save,
  Undo,
  PlusCircle,
  Eye,
  EyeOff,
  Download,
  Upload,
  RotateCcw
} from 'lucide-react';

export function CustomizationToolbar() {
  const { 
    isEditMode, 
    toggleEditMode, 
    addComponent, 
    saveCustomizations, 
    loadCustomizations,
    resetAllCustomizations,
    components 
  } = useUICustomization();
  
  const [showHiddenComponents, setShowHiddenComponents] = useState(false);

  // Add a new component
  const handleAddComponent = (type: CustomizableComponentType['type']) => {
    addComponent({
      id: `${type}_${Date.now()}`,
      type,
      content: type === 'text' ? 'New Text Component' : undefined,
      position: { x: 100, y: 100 },
      style: {
        backgroundColor: type === 'container' ? 'rgba(255, 255, 255, 0.7)' : undefined,
        padding: type === 'container' ? 16 : undefined,
        borderRadius: type === 'container' ? 8 : undefined,
        fontSize: type === 'text' ? 16 : undefined,
        textColor: type === 'text' ? '#000000' : undefined,
      },
      actions: {},
      visible: true,
      locked: false,
    });
  };

  // Export customizations to JSON
  const exportCustomizations = () => {
    const dataStr = JSON.stringify(components, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', 'ui-customizations.json');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import customizations from JSON file
  const importCustomizations = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          loadCustomizations(json);
        } catch (error) {
          console.error('Failed to parse customization file:', error);
          alert('Invalid customization file format');
        }
      };
      reader.readAsText(file);
    };
    
    input.click();
  };

  if (!isEditMode) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                onClick={() => toggleEditMode()} 
                className="rounded-full w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg"
              >
                <Eye className="h-6 w-6 text-white" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Enter Edit Mode</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <div className="fixed top-0 right-0 bg-gray-900 bg-opacity-90 text-white p-4 shadow-lg rounded-bl-lg z-50 w-64">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-lg">UI Customizer</h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-full"
            onClick={() => toggleEditMode()}
          >
            <EyeOff className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-2">
          <p className="text-sm font-medium">Add Component</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-blue-900/30 hover:bg-blue-800/50 border-blue-700"
              onClick={() => handleAddComponent('container')}
            >
              <PlusCircle className="h-4 w-4 mr-1" />
              Container
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-green-900/30 hover:bg-green-800/50 border-green-700"
              onClick={() => handleAddComponent('text')}
            >
              <PlusCircle className="h-4 w-4 mr-1" />
              Text
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-purple-900/30 hover:bg-purple-800/50 border-purple-700"
              onClick={() => handleAddComponent('image')}
            >
              <PlusCircle className="h-4 w-4 mr-1" />
              Image
            </Button>
          </div>
        </div>
        
        <div className="space-y-2">
          <p className="text-sm font-medium">Options</p>
          <div className="flex items-center space-x-2">
            <Switch
              id="show-hidden"
              checked={showHiddenComponents}
              onCheckedChange={setShowHiddenComponents}
            />
            <Label htmlFor="show-hidden" className="text-sm">Show hidden components</Label>
          </div>
        </div>
        
        <div className="pt-2 border-t border-gray-700 space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full bg-emerald-900/30 hover:bg-emerald-800/50 border-emerald-700"
            onClick={saveCustomizations}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 bg-amber-900/30 hover:bg-amber-800/50 border-amber-700"
              onClick={exportCustomizations}
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="flex-1 bg-blue-900/30 hover:bg-blue-800/50 border-blue-700"
              onClick={importCustomizations}
            >
              <Upload className="h-4 w-4 mr-1" />
              Import
            </Button>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            className="w-full bg-red-900/30 hover:bg-red-800/50 border-red-700"
            onClick={resetAllCustomizations}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset All
          </Button>
        </div>
      </div>
    </div>
  );
}