'use client';

import { useState, useCallback } from 'react';
import { ArrowRight, ArrowLeft, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import type { IntakeFormConfig, IntakeFormField } from './booking-types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface QuestionnaireStepProps {
  formConfig: IntakeFormConfig;
  initialValues?: Record<string, unknown>;
  onSubmit: (responses: Record<string, unknown>) => void;
  onBack: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuestionnaireStep({
  formConfig,
  initialValues,
  onSubmit,
  onBack,
}: QuestionnaireStepProps) {
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    for (const field of formConfig.fields) {
      if (initialValues && initialValues[field.id] !== undefined) {
        initial[field.id] = initialValues[field.id];
      } else if (field.type === 'MULTI_SELECT') {
        initial[field.id] = [];
      } else if (field.type === 'CHECKBOX') {
        initial[field.id] = false;
      } else {
        initial[field.id] = '';
      }
    }
    return initial;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    for (const field of formConfig.fields) {
      const value = values[field.id];

      if (field.required) {
        if (field.type === 'MULTI_SELECT') {
          if (!Array.isArray(value) || value.length === 0) {
            newErrors[field.id] = `${field.label} is required`;
          }
        } else if (field.type === 'CHECKBOX') {
          if (value !== true) {
            newErrors[field.id] = `${field.label} must be checked`;
          }
        } else {
          const strValue = String(value ?? '').trim();
          if (!strValue) {
            newErrors[field.id] = `${field.label} is required`;
          }
        }
      }

      // Type-specific validation
      if (field.type === 'EMAIL' && value) {
        const strValue = String(value).trim();
        if (strValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strValue)) {
          newErrors[field.id] = 'Please enter a valid email address';
        }
      }

      if (field.type === 'NUMBER' && value) {
        const strValue = String(value).trim();
        if (strValue && isNaN(Number(strValue))) {
          newErrors[field.id] = 'Please enter a valid number';
        }
        if (strValue && field.validation) {
          const num = Number(strValue);
          if (field.validation['min'] !== undefined && num < Number(field.validation['min'])) {
            newErrors[field.id] = `Minimum value is ${field.validation['min']}`;
          }
          if (field.validation['max'] !== undefined && num > Number(field.validation['max'])) {
            newErrors[field.id] = `Maximum value is ${field.validation['max']}`;
          }
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formConfig.fields, values]);

  // -------------------------------------------------------------------------
  // Field value updates
  // -------------------------------------------------------------------------

  const updateField = useCallback(
    (fieldId: string, value: unknown) => {
      setValues((prev) => ({ ...prev, [fieldId]: value }));
      if (errors[fieldId]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[fieldId];
          return next;
        });
      }
    },
    [errors],
  );

  const toggleMultiSelectOption = useCallback(
    (fieldId: string, option: string) => {
      setValues((prev) => {
        const current = (prev[fieldId] as string[]) ?? [];
        const next = current.includes(option)
          ? current.filter((o) => o !== option)
          : [...current, option];
        return { ...prev, [fieldId]: next };
      });
      if (errors[fieldId]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[fieldId];
          return next;
        });
      }
    },
    [errors],
  );

  // -------------------------------------------------------------------------
  // Submit
  // -------------------------------------------------------------------------

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  };

  // -------------------------------------------------------------------------
  // Render individual field
  // -------------------------------------------------------------------------

  function renderField(field: IntakeFormField) {
    const fieldError = errors[field.id];
    const errorClass = fieldError ? 'border-destructive' : '';

    switch (field.type) {
      case 'TEXT':
        return (
          <Input
            id={`q-${field.id}`}
            type="text"
            placeholder={field.placeholder ?? ''}
            value={String(values[field.id] ?? '')}
            onChange={(e) => updateField(field.id, e.target.value)}
            className={errorClass}
          />
        );

      case 'TEXTAREA':
        return (
          <Textarea
            id={`q-${field.id}`}
            placeholder={field.placeholder ?? ''}
            value={String(values[field.id] ?? '')}
            onChange={(e) => updateField(field.id, e.target.value)}
            className={errorClass}
          />
        );

      case 'SELECT':
        return (
          <Select
            value={String(values[field.id] ?? '') || undefined}
            onValueChange={(v) => updateField(field.id, v)}
          >
            <SelectTrigger id={`q-${field.id}`} className={`w-full ${errorClass}`}>
              <SelectValue placeholder={field.placeholder ?? 'Select an option'} />
            </SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'MULTI_SELECT': {
        const selected = (values[field.id] as string[]) ?? [];
        return (
          <div className="space-y-2">
            {(field.options ?? []).map((opt) => (
              <div key={opt} className="flex items-center gap-2">
                <Checkbox
                  id={`q-${field.id}-${opt}`}
                  checked={selected.includes(opt)}
                  onCheckedChange={() => toggleMultiSelectOption(field.id, opt)}
                />
                <Label
                  htmlFor={`q-${field.id}-${opt}`}
                  className="cursor-pointer text-sm font-normal"
                >
                  {opt}
                </Label>
              </div>
            ))}
          </div>
        );
      }

      case 'CHECKBOX':
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              id={`q-${field.id}`}
              checked={values[field.id] === true}
              onCheckedChange={(checked) => updateField(field.id, checked)}
            />
            <Label
              htmlFor={`q-${field.id}`}
              className="cursor-pointer text-sm font-normal"
            >
              {field.label}
            </Label>
          </div>
        );

      case 'NUMBER':
        return (
          <Input
            id={`q-${field.id}`}
            type="number"
            placeholder={field.placeholder ?? ''}
            value={String(values[field.id] ?? '')}
            onChange={(e) => updateField(field.id, e.target.value)}
            className={errorClass}
            min={field.validation?.['min'] !== undefined ? Number(field.validation['min']) : undefined}
            max={field.validation?.['max'] !== undefined ? Number(field.validation['max']) : undefined}
          />
        );

      case 'DATE':
        return (
          <Input
            id={`q-${field.id}`}
            type="date"
            value={String(values[field.id] ?? '')}
            onChange={(e) => updateField(field.id, e.target.value)}
            className={errorClass}
          />
        );

      case 'EMAIL':
        return (
          <Input
            id={`q-${field.id}`}
            type="email"
            placeholder={field.placeholder ?? 'you@example.com'}
            value={String(values[field.id] ?? '')}
            onChange={(e) => updateField(field.id, e.target.value)}
            className={errorClass}
          />
        );

      case 'PHONE':
        return (
          <Input
            id={`q-${field.id}`}
            type="tel"
            placeholder={field.placeholder ?? '+1 (555) 123-4567'}
            value={String(values[field.id] ?? '')}
            onChange={(e) => updateField(field.id, e.target.value)}
            className={errorClass}
          />
        );

      default:
        return (
          <Input
            id={`q-${field.id}`}
            type="text"
            placeholder={field.placeholder ?? ''}
            value={String(values[field.id] ?? '')}
            onChange={(e) => updateField(field.id, e.target.value)}
            className={errorClass}
          />
        );
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Additional Information
        </CardTitle>
        <CardDescription>
          Please answer the following questions to help us prepare for your
          appointment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {formConfig.fields.map((field) => (
          <div key={field.id} className="space-y-2">
            {/* Don't show label separately for standalone checkbox */}
            {field.type !== 'CHECKBOX' && (
              <Label htmlFor={`q-${field.id}`}>
                {field.label}
                {field.required && (
                  <span className="text-destructive"> *</span>
                )}
              </Label>
            )}
            {renderField(field)}
            {errors[field.id] && (
              <p className="text-sm text-destructive">{errors[field.id]}</p>
            )}
          </div>
        ))}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" onClick={onBack} disabled={isSubmitting}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              backgroundColor: 'var(--brand-color)',
              borderColor: 'var(--brand-color)',
            }}
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                Saving...
              </span>
            ) : (
              <>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
