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
import { deleteVaultItem } from '../actions/vault.action';
import { toast } from 'sonner';
import { useState } from 'react';
import LoadingButton from '@/components/loading-button';
import { useRouter } from 'next/navigation';

interface DeleteVaultProps {
  id: string;
  onSuccess?: () => void;
}

export default function DeleteVault({ id, onSuccess }: DeleteVaultProps) {
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
      toast.success('Vault deleted successfully');
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
        <Button variant="destructive">
          <Trash2 />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete vault?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this vault item with ID{' '}
            <span className="text-destructive">{id}</span>? This action cannot be undone, and the
            item will be permanently removed from your vault.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="outline">Cancel</AlertDialogCancel>
          <LoadingButton variant="destructive" onClick={deleteVault} loading={loading}>
            Delete
          </LoadingButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
