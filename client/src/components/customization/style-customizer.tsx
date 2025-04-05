import { useEffect, useState } from 'react';
import { useUICustomization } from '@/lib/ui-customization-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

interface StyleCustomizerProps {
  componentId: string;
  onClose?: () => void;
}

export function StyleCustomizer({ componentId, onClose }: StyleCustomizerProps) {
  const { getComponent, updateComponent } = useUICustomization();
  const component = getComponent(componentId);
  
  const [activeTab, setActiveTab] = useState('colors');
  const [styleState, setStyleState] = useState(component?.style || {
    backgroundColor: '',
    textColor: '',
    borderColor: '',
    borderWidth: 0,
    borderRadius: 0,
    padding: 0,
    opacity: 100,
    fontSize: 16,
    fontWeight: 400,
    animation: 'none',
    shadow: 'none',
  });

  // Initialize from component
  useEffect(() => {
    if (component && component.style) {
      setStyleState(component.style);
    }
  }, [component]);

  // Save changes to context
  const saveChanges = () => {
    updateComponent(componentId, {
      style: styleState
    });
    
    if (onClose) {
      onClose();
    }
  };

  // Handle input change
  const handleChange = (key: string, value: any) => {
    setStyleState({
      ...styleState,
      [key]: value
    });
  };

  return (
    <div className="p-4 w-[300px] max-h-[400px] overflow-y-auto">
      <h3 className="text-lg font-semibold mb-4">Style Customizer</h3>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full mb-4">
          <TabsTrigger value="colors" className="flex-1">Colors</TabsTrigger>
          <TabsTrigger value="layout" className="flex-1">Layout</TabsTrigger>
          <TabsTrigger value="text" className="flex-1">Text</TabsTrigger>
          <TabsTrigger value="effects" className="flex-1">Effects</TabsTrigger>
        </TabsList>
        
        <TabsContent value="colors" className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="backgroundColor">Background Color</Label>
            <div className="flex gap-2">
              <Input 
                id="backgroundColor" 
                type="color" 
                value={styleState.backgroundColor || '#ffffff'} 
                onChange={(e) => handleChange('backgroundColor', e.target.value)}
                className="w-12 h-8 p-1"
              />
              <Input 
                type="text" 
                value={styleState.backgroundColor || ''} 
                onChange={(e) => handleChange('backgroundColor', e.target.value)}
                className="flex-1"
                placeholder="#ffffff or transparent"
              />
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="textColor">Text Color</Label>
            <div className="flex gap-2">
              <Input 
                id="textColor" 
                type="color" 
                value={styleState.textColor || '#000000'} 
                onChange={(e) => handleChange('textColor', e.target.value)}
                className="w-12 h-8 p-1"
              />
              <Input 
                type="text" 
                value={styleState.textColor || ''} 
                onChange={(e) => handleChange('textColor', e.target.value)}
                className="flex-1"
                placeholder="#000000"
              />
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="borderColor">Border Color</Label>
            <div className="flex gap-2">
              <Input 
                id="borderColor" 
                type="color" 
                value={styleState.borderColor || '#000000'} 
                onChange={(e) => handleChange('borderColor', e.target.value)}
                className="w-12 h-8 p-1"
              />
              <Input 
                type="text" 
                value={styleState.borderColor || ''} 
                onChange={(e) => handleChange('borderColor', e.target.value)}
                className="flex-1"
                placeholder="#000000"
              />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="layout" className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="borderWidth">Border Width ({styleState.borderWidth}px)</Label>
            <Slider 
              id="borderWidth"
              min={0} 
              max={10} 
              step={1}
              value={[styleState.borderWidth || 0]}
              onValueChange={(value) => handleChange('borderWidth', value[0])}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="borderRadius">Border Radius ({styleState.borderRadius}px)</Label>
            <Slider 
              id="borderRadius"
              min={0} 
              max={50} 
              step={1}
              value={[styleState.borderRadius || 0]}
              onValueChange={(value) => handleChange('borderRadius', value[0])}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="padding">Padding ({styleState.padding}px)</Label>
            <Slider 
              id="padding"
              min={0} 
              max={50} 
              step={1}
              value={[styleState.padding || 0]}
              onValueChange={(value) => handleChange('padding', value[0])}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="opacity">Opacity ({styleState.opacity}%)</Label>
            <Slider 
              id="opacity"
              min={0} 
              max={100} 
              step={1}
              value={[styleState.opacity || 100]}
              onValueChange={(value) => handleChange('opacity', value[0])}
            />
          </div>
        </TabsContent>
        
        <TabsContent value="text" className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="fontSize">Font Size ({styleState.fontSize}px)</Label>
            <Slider 
              id="fontSize"
              min={8} 
              max={72} 
              step={1}
              value={[styleState.fontSize || 16]}
              onValueChange={(value) => handleChange('fontSize', value[0])}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="fontWeight">Font Weight</Label>
            <Select 
              value={String(styleState.fontWeight || 400)}
              onValueChange={(value) => handleChange('fontWeight', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Font Weight" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="300">Light (300)</SelectItem>
                <SelectItem value="400">Regular (400)</SelectItem>
                <SelectItem value="500">Medium (500)</SelectItem>
                <SelectItem value="600">Semi Bold (600)</SelectItem>
                <SelectItem value="700">Bold (700)</SelectItem>
                <SelectItem value="800">Extra Bold (800)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TabsContent>
        
        <TabsContent value="effects" className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="animation">Animation</Label>
            <Select 
              value={styleState.animation || 'none'}
              onValueChange={(value) => handleChange('animation', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Animation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="fadeIn">Fade In</SelectItem>
                <SelectItem value="slideUp">Slide Up</SelectItem>
                <SelectItem value="slideDown">Slide Down</SelectItem>
                <SelectItem value="bounce">Bounce</SelectItem>
                <SelectItem value="pulse">Pulse</SelectItem>
                <SelectItem value="zoomIn">Zoom In</SelectItem>
                <SelectItem value="rotate">Rotate</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="shadow">Shadow</Label>
            <Select 
              value={styleState.shadow || 'none'}
              onValueChange={(value) => handleChange('shadow', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Shadow" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="sm">Small</SelectItem>
                <SelectItem value="md">Medium</SelectItem>
                <SelectItem value="lg">Large</SelectItem>
                <SelectItem value="xl">Extra Large</SelectItem>
                <SelectItem value="inner">Inner</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-end space-x-2 mt-6">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={saveChanges}>Apply</Button>
      </div>
    </div>
  );
}