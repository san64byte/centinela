import { PasswordField, SelectField, TextareaField, TextField } from '@/components/form-field';
import { createFormHook } from '@tanstack/react-form';
import { fieldContext, formContext } from '@/hooks/use-form-field';

export const { useAppForm } = createFormHook({
  fieldComponents: {
    TextField,
    PasswordField,
    TextareaField,
    SelectField,
  },
  formComponents: {},
  fieldContext,
  formContext,
});
