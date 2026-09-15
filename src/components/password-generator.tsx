'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Copy, RefreshCw, ShieldCheck, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { generateSecurePassword } from '@/lib/crypto/password-generator';

export interface PasswordGeneratorProps {
  onApply: (password: string) => void;
  onClose?: () => void;
  className?: string;
  variant?: 'default' | 'master';
  defaultLength?: number;
}

export default function PasswordGenerator({
  onApply,
  onClose,
  className,
  variant = 'default',
  defaultLength,
}: PasswordGeneratorProps) {
  const isMaster = variant === 'master';
  const initialLength = defaultLength ?? (isMaster ? 20 : 16);

  const [length, setLength] = useState(initialLength);
  const [useUppercase, setUseUppercase] = useState(true);
  const [useLowercase, setUseLowercase] = useState(true);
  const [useNumbers, setUseNumbers] = useState(true);
  const [useSymbols, setUseSymbols] = useState(true);
  const [password, setPassword] = useState(() => generateSecurePassword(initialLength));
  const [copied, setCopied] = useState(false);

  const generateWithSettings = (
    len = length,
    uc = useUppercase,
    lc = useLowercase,
    num = useNumbers,
    sym = useSymbols,
  ) => {
    const pwd = generateSecurePassword(len, {
      uppercase: uc,
      lowercase: lc,
      numbers: num,
      symbols: sym,
    });
    setPassword(pwd);
    return pwd;
  };

  const handleCopy = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      toast.success(isMaster ? 'Master password copied to clipboard' : 'Generated password copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(isMaster ? 'Failed to copy master password' : 'Failed to copy');
    }
  };

  const handleApply = () => {
    onApply(password);
    toast.success(isMaster ? 'Master password generated and applied' : 'Password applied');
    onClose?.();
  };

  return (
    <div
      className={cn(
        'space-y-3 rounded-xl border border-border/70 p-3.5 text-xs shadow-2xs transition-all',
        isMaster ? 'bg-card' : 'mt-2.5 bg-muted/20',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 pb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold tracking-tight text-foreground">
          {isMaster ? (
            <ShieldCheck className="size-4 text-primary" />
          ) : (
            <Wrench className="size-3.5 text-primary" />
          )}
          <span>{isMaster ? 'Master Password Generator' : 'Password Generator'}</span>
        </div>
        {onClose && (
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={onClose}
            className="h-6 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Close
          </Button>
        )}
      </div>

      {isMaster && (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Generate a high-entropy key for zero-knowledge vault derivation. Store this securely.
        </p>
      )}

      {/* Generated password display */}
      <div
        className={cn(
          'flex min-h-10 items-center justify-between gap-2.5 rounded-lg border border-border/70 px-3 py-2 shadow-2xs',
          isMaster ? 'bg-muted/20' : 'bg-background',
        )}
      >
        <span className="font-mono text-xs font-semibold tracking-wide break-all text-foreground">
          {password}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            onClick={() => generateWithSettings()}
            title={isMaster ? 'Generate new master password' : 'Generate new password'}
            aria-label={isMaster ? 'Generate new master password' : 'Generate new password'}
            className="size-7 rounded-md text-muted-foreground shadow-2xs hover:bg-background hover:text-foreground"
          >
            <RefreshCw className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            onClick={handleCopy}
            title={isMaster ? 'Copy master password' : 'Copy password'}
            aria-label={isMaster ? 'Copy master password' : 'Copy password'}
            className="size-7 rounded-md text-muted-foreground shadow-2xs hover:bg-background hover:text-foreground"
          >
            {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
          </Button>
        </div>
      </div>

      {/* Length selector */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium">Length</span>
          <span className="font-mono text-xs font-semibold text-foreground tabular-nums">
            {length}
          </span>
        </div>
        <input
          type="range"
          min={8}
          max={48}
          value={length}
          onChange={(e) => {
            const next = Number(e.target.value);
            setLength(next);
            generateWithSettings(next, useUppercase, useLowercase, useNumbers, useSymbols);
          }}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
        />
      </div>

      {/* Character toggles */}
      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <label className="flex cursor-pointer items-center gap-2 text-foreground/85 select-none hover:text-foreground">
          <input
            type="checkbox"
            checked={useUppercase}
            onChange={(e) => {
              const next = e.target.checked;
              setUseUppercase(next);
              generateWithSettings(length, next, useLowercase, useNumbers, useSymbols);
            }}
            className="rounded accent-primary"
          />
          <span>Uppercase (A-Z)</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-foreground/85 select-none hover:text-foreground">
          <input
            type="checkbox"
            checked={useLowercase}
            onChange={(e) => {
              const next = e.target.checked;
              setUseLowercase(next);
              generateWithSettings(length, useUppercase, next, useNumbers, useSymbols);
            }}
            className="rounded accent-primary"
          />
          <span>Lowercase (a-z)</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-foreground/85 select-none hover:text-foreground">
          <input
            type="checkbox"
            checked={useNumbers}
            onChange={(e) => {
              const next = e.target.checked;
              setUseNumbers(next);
              generateWithSettings(length, useUppercase, useLowercase, next, useSymbols);
            }}
            className="rounded accent-primary"
          />
          <span>Numbers (0-9)</span>
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-foreground/85 select-none hover:text-foreground">
          <input
            type="checkbox"
            checked={useSymbols}
            onChange={(e) => {
              const next = e.target.checked;
              setUseSymbols(next);
              generateWithSettings(length, useUppercase, useLowercase, useNumbers, next);
            }}
            className="rounded accent-primary"
          />
          <span>Symbols (!@#$)</span>
        </label>
      </div>

      {/* Apply Button */}
      <Button
        type="button"
        size="sm"
        onClick={handleApply}
        className="w-full gap-1.5 font-medium shadow-2xs"
      >
        <Check className="size-3.5" />
        {isMaster ? 'Use This Master Password' : 'Use This Password'}
      </Button>
    </div>
  );
}
