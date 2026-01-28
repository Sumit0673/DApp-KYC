'use client';

import React from "react"

import { useState } from 'react';
import { FileText, User, Calendar, Globe, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { KYCData, DocumentType } from '@/lib/types/kyc';

interface KYCFormProps {
  onSubmit: (data: KYCData) => void;
  isDisabled?: boolean;
}

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'passport', label: 'Passport' },
  { value: 'national_id', label: 'National ID' },
  { value: 'driving_license', label: 'Driving License' },
  { value: 'aadhaar', label: 'Aadhaar Card' },
  { value: 'pan_card', label: 'PAN Card' },
];

const NATIONALITIES = [
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Germany',
  'France',
  'India',
  'Japan',
  'Singapore',
  'Other',
];

export function KYCForm({ onSubmit, isDisabled }: KYCFormProps) {
  const [formData, setFormData] = useState<Partial<KYCData>>({
    documentType: 'passport',
    nationality: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.documentType) {
      newErrors.documentType = 'Please select a document type';
    }
    if (!formData.documentNumber || formData.documentNumber.length < 5) {
      newErrors.documentNumber = 'Please enter a valid document number';
    }
    if (!formData.fullName || formData.fullName.length < 2) {
      newErrors.fullName = 'Please enter your full name';
    }
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Please enter your date of birth';
    } else {
      const birthDate = new Date(formData.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 18) {
        newErrors.dateOfBirth = 'You must be at least 18 years old';
      }
    }
    if (!formData.nationality) {
      newErrors.nationality = 'Please select your nationality';
    }
    if (!formData.expiryDate) {
      newErrors.expiryDate = 'Please enter document expiry date';
    } else {
      const expiry = new Date(formData.expiryDate);
      const today = new Date();
      if (expiry < today) {
        newErrors.expiryDate = 'Document has expired';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData as KYCData);
    }
  };

  const updateField = (field: keyof KYCData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <FileText className="w-5 h-5" />
          Identity Information
        </CardTitle>
        <CardDescription>
          Enter your identity details. This data will be encrypted and processed
          securely in a Trusted Execution Environment (TEE).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="documentType" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                Document Type
              </Label>
              <Select
                value={formData.documentType}
                onValueChange={(value) => updateField('documentType', value)}
                disabled={isDisabled}
              >
                <SelectTrigger id="documentType">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((doc) => (
                    <SelectItem key={doc.value} value={doc.value}>
                      {doc.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.documentType && (
                <p className="text-sm text-destructive">{errors.documentType}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentNumber" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-muted-foreground" />
                Document Number
              </Label>
              <Input
                id="documentNumber"
                placeholder="Enter document number"
                value={formData.documentNumber || ''}
                onChange={(e) => updateField('documentNumber', e.target.value)}
                disabled={isDisabled}
                className={errors.documentNumber ? 'border-destructive' : ''}
              />
              {errors.documentNumber && (
                <p className="text-sm text-destructive">{errors.documentNumber}</p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="fullName" className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                Full Name (as on document)
              </Label>
              <Input
                id="fullName"
                placeholder="Enter your full name"
                value={formData.fullName || ''}
                onChange={(e) => updateField('fullName', e.target.value)}
                disabled={isDisabled}
                className={errors.fullName ? 'border-destructive' : ''}
              />
              {errors.fullName && (
                <p className="text-sm text-destructive">{errors.fullName}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateOfBirth" className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                Date of Birth
              </Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth || ''}
                onChange={(e) => updateField('dateOfBirth', e.target.value)}
                disabled={isDisabled}
                className={errors.dateOfBirth ? 'border-destructive' : ''}
              />
              {errors.dateOfBirth && (
                <p className="text-sm text-destructive">{errors.dateOfBirth}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiryDate" className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                Document Expiry Date
              </Label>
              <Input
                id="expiryDate"
                type="date"
                value={formData.expiryDate || ''}
                onChange={(e) => updateField('expiryDate', e.target.value)}
                disabled={isDisabled}
                className={errors.expiryDate ? 'border-destructive' : ''}
              />
              {errors.expiryDate && (
                <p className="text-sm text-destructive">{errors.expiryDate}</p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="nationality" className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                Nationality
              </Label>
              <Select
                value={formData.nationality}
                onValueChange={(value) => updateField('nationality', value)}
                disabled={isDisabled}
              >
                <SelectTrigger id="nationality">
                  <SelectValue placeholder="Select nationality" />
                </SelectTrigger>
                <SelectContent>
                  {NATIONALITIES.map((nat) => (
                    <SelectItem key={nat} value={nat}>
                      {nat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.nationality && (
                <p className="text-sm text-destructive">{errors.nationality}</p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-border">
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isDisabled}
            >
              Start Verification
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-3">
              Your data is encrypted client-side and never stored in plain text.
              Only the verification result is recorded on-chain.
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
