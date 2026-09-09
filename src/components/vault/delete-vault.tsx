import { Trash2 } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { deleteVaultItem } from '@/actions/vault.action';
import { toast } from 'sonner';
import { useState } from 'react';
import LoadingButton from '@/components/loading-button';
import { useRouter } from 'next/navigation';

import { cn } from '@/lib/utils';

interface DeleteVaultProps {
  id: string;
  title?: string;
  onSuccess?: () => void;
  className?: string;
}

export default function DeleteVault({ id, title, onSuccess, className }: DeleteVaultProps) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  if (!id) return null;

  async function deleteVault() {
    setLoading(true);
    try {
      const res = await deleteVaultItem(id);
      if (!res.success) {
        toast.error(res.error || 'Failed to delete vault');
        return;
      }
      toast.success('Vault item deleted');
      setOpen(false);
      onSuccess?.();
      router.refresh();
    } catch {
      toast.error('Failed to delete vault');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className={cn('gap-1.5', className)}>
          <Trash2 className="size-4" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
            <Trash2 className="size-5" />
          </AlertDialogMedia>
          <AlertDialogTitle className="text-base font-semibold tracking-tight text-foreground">
            Delete vault item?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs leading-relaxed font-normal text-muted-foreground">
            Are you sure you want to delete{' '}
            {title ? (
              <strong className="font-semibold text-foreground">{title}</strong>
            ) : (
              'this item'
            )}
            ? This action is permanent and cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="outline">Cancel</AlertDialogCancel>
          <LoadingButton variant="destructive" onClick={deleteVault} loading={loading}>
            Delete Item
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
