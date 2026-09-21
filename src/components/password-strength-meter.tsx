import React from 'react';
import { cn } from '@/lib/utils';

export const STRENGTH_LABELS = ['Weak', 'Fair', 'Good', 'Strong', 'Very Strong'] as const;

export const STRENGTH_COLORS = [
  'bg-destructive',
  'bg-yellow-500',
  'bg-blue-500',
  'bg-green-500',
  'bg-emerald-500',
] as const;

/**
 * Calculates password strength score from 0 to 5 based on:
 * - Length >= 8
 * - Length >= 12
 * - Both lowercase and uppercase characters
 * - Numeric digits
 * - Special symbols
 */
export function calculatePasswordStrength(pwd: string): number {
  if (!pwd) return 0;
  let strength = 0;
  if (pwd.length >= 8) strength++;
  if (pwd.length >= 12) strength++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
  if (/\d/.test(pwd)) strength++;
  if (/[^a-zA-Z0-9]/.test(pwd)) strength++;
  return strength;
}

export interface PasswordStrengthMeterProps {
  password?: string;
  className?: string;
}

export function PasswordStrengthMeter({ password, className }: PasswordStrengthMeterProps) {
  if (!password) return null;

  const strength = calculatePasswordStrength(password);
  const label = STRENGTH_LABELS[Math.max(0, strength - 1)] || 'Very Weak';

  return (
    <div className={cn('space-y-1.5 pt-1', className)}>
      <div className="flex gap-1.5">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-all duration-200',
              i < strength ? STRENGTH_COLORS[strength - 1] : 'bg-muted',
            )}
          />
        ))}
      </div>
      <p className="text-[11px] font-medium text-muted-foreground">
        Strength: <span className="font-semibold text-foreground">{label}</span>
      </p>
    </div>
  );
}

export default PasswordStrengthMeter;
