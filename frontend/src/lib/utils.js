import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utilitário para mesclar classes Tailwind condicionalmente
 * sem conflito de especificidade.
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
