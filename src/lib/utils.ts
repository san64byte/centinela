import { clsx, type ClassValue } from 'clsx';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | number) {
  const parseDate = typeof date === 'string' ? parseISO(date) : new Date(date);

  if (isNaN(parseDate.getTime())) {
    return '-';
  }

  const formatted = format(parseDate, "d MMMM yyyy 'at' HH:mm");

  // return format dari 08:30 -> 08.30
  return formatted.replace(/(\d{2}):(\d{2})$/, '$1.$2');
}

export function formatRelativeDate(
  date: string | Date | number,
  options?: { fallbackAfterDays?: number },
): string {
  const fallbackAfterDays = options?.fallbackAfterDays ?? 30;

  const parsedDate = typeof date === 'string' ? parseISO(date) : new Date(date);

  if (isNaN(parsedDate.getTime())) {
    return '-';
  }

  const diffMs = Date.now() - parsedDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (fallbackAfterDays > 0 && diffDays > fallbackAfterDays) {
    return formatDate(parsedDate);
  }

  return formatDistanceToNow(parsedDate, { addSuffix: true });
}

export function slugifyUsername(name: string, maxLength = 12) {
  const slug = name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // hilangkan aksen
    .replace(/[^a-z0-9\s_]/g, '') // buang karakter di luar huruf kecil/angka/spasi/underscore
    .replace(/\s+/g, '_') // spasi -> underscore
    .replace(/_+/g, '_') // underscore ganda -> satu
    .replace(/^_|_$/g, ''); // buang underscore di awal/akhir

  return slug.slice(0, maxLength).replace(/_$/, ''); // potong ke maxLength, buang trailing _ sisa potongan
}
