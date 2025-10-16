import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import React, { useCallback, useMemo, useState } from 'react';
import { FormField } from './types';

interface ChatFormProps {
  fields: FormField[];
  onSubmit: (formData: Record<string, string>) => void;
  onCancel?: () => void;
  showCancelButton?: boolean;
}

export const ChatForm = ({ fields, onSubmit, onCancel, showCancelButton }: ChatFormProps) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = useCallback((name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  }, [errors]);

  // Memoize select options for better performance
  const memoizedSelectOptions = useMemo(() => {
    const selectFieldsOptions: Record<string, { value: string; label: string }[]> = {};
    fields.forEach(field => {
      if (field.type === 'select' && field.options) {
        selectFieldsOptions[field.name] = field.options;
      }
    });
    return selectFieldsOptions;
  }, [fields]);

  const validateField = (field: FormField, value: string): string | null => {
    if (field.required && !value.trim()) {
      return `${field.label} is required`;
    }

    if (field.validation?.pattern && value) {
      const regex = new RegExp(field.validation.pattern);
      if (!regex.test(value)) {
        return field.validation.message || `Invalid ${field.label.toLowerCase()}`;
      }
    }

    // Additional validations
    if (field.type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return 'Please enter a valid email address';
      }
    }

    if (field.type === 'tel' && value) {
      const phoneRegex = /^09\d{9}$/;
      if (!phoneRegex.test(value)) {
        return 'Please enter a valid 11-digit phone number starting with 09';
      }
    }

    if (field.type === 'date' && value) {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return 'Please enter a valid date';
      }
    }

    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: Record<string, string> = {};
    
    // Validate all fields
    fields.forEach(field => {
      const value = formData[field.name] || '';
      const error = validateField(field, value);
      if (error) {
        newErrors[field.name] = error;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit(formData);
  };

  const renderField = useCallback((field: FormField) => {
    const value = formData[field.name] || '';
    const error = errors[field.name];

    if (field.type === 'select' && field.options) {
      // Use memoized options for better performance
      const options = memoizedSelectOptions[field.name] || field.options;
      
      return (
        <div key={field.name} className="space-y-1">
          <Label htmlFor={field.name} className="text-sm font-medium">
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </Label>
          <Select value={value} onValueChange={(val) => handleInputChange(field.name, val)}>
            <SelectTrigger id={field.name} className={error ? 'border-red-500' : ''}>
              <SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {options.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      );
    }

    return (
      <div key={field.name} className="space-y-1">
        <Label htmlFor={field.name} className="text-sm font-medium">
          {field.label} {field.required && <span className="text-red-500">*</span>}
        </Label>
        <Input
          id={field.name}
          type={field.type}
          value={value}
          onChange={(e) => handleInputChange(field.name, e.target.value)}
          placeholder={field.placeholder}
          className={error ? 'border-red-500' : ''}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }, [formData, errors, memoizedSelectOptions, handleInputChange]);

  return (
    <div className="bg-gray-50 p-4 rounded-lg border my-2">
      <form onSubmit={handleSubmit} className="space-y-4">
        {fields.map(renderField)}
        <div className={`flex gap-2 ${showCancelButton ? 'flex-row' : ''}`}>
          <Button 
            type="submit" 
            className={`bg-[#79c942] hover:bg-[#6bb33a] text-white ${showCancelButton ? 'flex-1' : 'w-full'}`}
          >
            Submit Information
          </Button>
          {showCancelButton && onCancel && (
            <Button 
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};
