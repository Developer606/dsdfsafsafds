import { useEffect, useState } from 'react';
import { useUICustomization } from '@/lib/ui-customization-context';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

interface ActionCustomizerProps {
  componentId: string;
  actionKey: string;
  onClose?: () => void;
}

export function ActionCustomizer({ componentId, actionKey, onClose }: ActionCustomizerProps) {
  const { getComponent, updateComponent } = useUICustomization();
  const component = getComponent(componentId);
  
  const initialAction = component?.actions?.[actionKey] || { action: 'none', target: '' };
  const [actionType, setActionType] = useState<'none' | 'navigate' | 'modal' | 'function'>(initialAction.action || 'none');
  const [actionTarget, setActionTarget] = useState(initialAction.target || '');

  // Initialize from component when actionKey changes
  useEffect(() => {
    if (component?.actions?.[actionKey]) {
      setActionType(component.actions[actionKey].action || 'none');
      setActionTarget(component.actions[actionKey].target || '');
    } else {
      setActionType('none');
      setActionTarget('');
    }
  }, [component, actionKey]);

  // Save changes to context
  const saveChanges = () => {
    const updatedActions = {
      ...component?.actions,
      [actionKey]: {
        action: actionType,
        target: actionTarget
      }
    };
    
    updateComponent(componentId, {
      actions: updatedActions
    });
    
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="p-4 w-[300px]">
      <h3 className="text-lg font-semibold mb-4">Action Customizer</h3>
      <p className="text-sm text-gray-500 mb-4">
        Configure what happens when this event is triggered: <strong>{actionKey}</strong>
      </p>
      
      <div className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="actionType">Action Type</Label>
          <Select 
            value={actionType}
            onValueChange={(value: 'none' | 'navigate' | 'modal' | 'function') => setActionType(value)}
          >
            <SelectTrigger id="actionType">
              <SelectValue placeholder="Select an action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No Action</SelectItem>
              <SelectItem value="navigate">Navigate To</SelectItem>
              <SelectItem value="modal">Open Modal</SelectItem>
              <SelectItem value="function">Call Function</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {actionType !== 'none' && (
          <div className="grid gap-2">
            <Label htmlFor="actionTarget">
              {actionType === 'navigate' && 'URL or Path'}
              {actionType === 'modal' && 'Modal ID'}
              {actionType === 'function' && 'Function Name'}
            </Label>
            <Input 
              id="actionTarget"
              value={actionTarget}
              onChange={(e) => setActionTarget(e.target.value)}
              placeholder={
                actionType === 'navigate' 
                  ? '/chat or https://example.com' 
                  : actionType === 'modal'
                    ? 'settings-modal'
                    : 'handleSubmit'
              }
            />
            
            {actionType === 'navigate' && (
              <div className="text-xs text-gray-500 mt-1">
                Use absolute URLs for external sites (https://...) or paths (/path) for internal navigation
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="flex justify-end space-x-2 mt-6">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={saveChanges}>Apply</Button>
      </div>
    </div>
  );
}