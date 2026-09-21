import { useFieldContext } from '@/hooks/use-form-field';
import { Field, FieldDescription, FieldError, FieldLabel } from './ui/field';
import { Input } from './ui/input';
import { InputPassword } from './input-password';
import { InputGroup, InputGroupAddon, InputGroupInput } from './ui/input-group';
import { Spinner } from './ui/spinner';
import { Check, X } from 'lucide-react';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from './ui/select';

type UsernameCheckState = {
  checking: boolean;
  available: boolean | null;
  checkError: string | null;
  checkUsername: (value: string) => void;
  setUsernameTouched?: (touched: boolean) => void;
};

export function TextField({
  label,
  labelSlot,
  variant = 'default',
  dataVariantGroup,
  description,
  others,
  onChange,
  ...inputProps
}: {
  label: string;
  labelSlot?: React.ReactNode;
  variant?: 'default' | 'group';
  dataVariantGroup?: UsernameCheckState;
  description?: React.ReactNode;
  others?: React.ReactNode;
} & React.ComponentProps<typeof Input>) {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
  const isGroup = variant === 'group';
  const isFormSubmitting = Boolean(field.form?.state?.isSubmitting);
  const isChecking =
    isGroup &&
    !isFormSubmitting &&
    (field.state.meta.isValidating || Boolean(dataVariantGroup?.checking));

  const hasValue = Boolean(field.state.value && field.state.value.trim().length > 0);
  const isAvailable =
    isGroup &&
    (dataVariantGroup
      ? dataVariantGroup.available === true
      : hasValue && !isChecking && field.state.meta.isValid && field.state.meta.isDirty);

  const isTaken =
    isGroup &&
    (dataVariantGroup
      ? dataVariantGroup.available === false
      : hasValue && !isChecking && !field.state.meta.isValid);

  return (
    <Field data-invalid={isInvalid} className="text-start">
      <div className="flex items-center">
        <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
        {labelSlot}
      </div>
      {variant === 'default' ? (
        <Input
          id={field.name}
          name={field.name}
          value={field.state.value}
          onBlur={field.handleBlur}
          onChange={(e) => {
            if (onChange) {
              onChange(e);
            } else {
              field.handleChange(e.target.value);
            }
          }}
          {...inputProps}
        />
      ) : (
        <InputGroup>
          <InputGroupInput
            id={field.name}
            name={field.name}
            value={field.state.value}
            onBlur={field.handleBlur}
            onChange={(e) => {
              if (onChange) {
                onChange(e);
              } else {
                field.handleChange(e.target.value);
              }
              dataVariantGroup?.setUsernameTouched?.(true);
              dataVariantGroup?.checkUsername(e.target.value);
            }}
            autoComplete="username"
            {...inputProps}
          />
          <InputGroupAddon align="inline-end">
            {isChecking && <Spinner />}
            {!isChecking && isAvailable && <Check className="text-green-800" />}
            {!isChecking && isTaken && <X className="text-destructive" />}
          </InputGroupAddon>
        </InputGroup>
      )}
      {description && <FieldDescription>{description}</FieldDescription>}
      {others}
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
      {isGroup && !isChecking && isAvailable && (
        <FieldDescription className="text-green-800">Username is available</FieldDescription>
      )}
      {isGroup && dataVariantGroup?.available === false && !isInvalid && (
        <FieldDescription className="text-destructive">Username is already taken</FieldDescription>
      )}
      {isGroup && dataVariantGroup?.checkError && (
        <FieldDescription className="text-destructive">
          {dataVariantGroup.checkError}
        </FieldDescription>
      )}
    </Field>
  );
}

export function PasswordField({
  label,
  labelSlot,
  description,
  children,
  ...inputProps
}: {
  label: string;
  labelSlot?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
} & React.ComponentProps<typeof InputPassword>) {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <Field data-invalid={isInvalid} className="text-start">
      <div className="flex items-center">
        <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
        {labelSlot}
      </div>
      <InputPassword
        id={field.name}
        name={field.name}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        {...inputProps}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
      {children}
    </Field>
  );
}

export function TextareaField({
  label,
  labelSlot,
  description,
  children,
  ...textareaProps
}: {
  label: string;
  labelSlot?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
} & React.ComponentProps<typeof Textarea>) {
  const field = useFieldContext<string>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <Field data-invalid={isInvalid} className="text-start">
      <div className="flex items-center">
        <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
        {labelSlot}
      </div>
      <Textarea
        id={field.name}
        name={field.name}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        {...textareaProps}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
      {children}
    </Field>
  );
}

export function SelectField<T extends string>({
  label,
  placeholder,
  groupLabel,
  options,
  onValueChange,
  ...selectProps
}: {
  label: string;
  placeholder?: string;
  groupLabel?: string;
  options: { value: T; label: string }[];
  onValueChange?: (value: T) => void;
} & React.ComponentProps<typeof Select>) {
  const field = useFieldContext<T>();
  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

  return (
    <Field data-invalid={isInvalid} className="text-start">
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Select
        value={field.state.value}
        onValueChange={(value) => {
          field.handleChange(value as T);
          onValueChange?.(value as T);
        }}
        {...selectProps}
      >
        <SelectTrigger className="w-full" id={field.name}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {groupLabel && <SelectLabel>{groupLabel}</SelectLabel>}
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {isInvalid && <FieldError errors={field.state.meta.errors} />}
    </Field>
  );
}
