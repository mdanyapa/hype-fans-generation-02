import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Natural sort function for alphanumeric seat numbers (A1, A2, A10, B1, etc.)
export const naturalSort = (a: string, b: string): number => {
  const regex = /(\D*)(\d*)/g
  const aParts = a.match(regex) || []
  const bParts = b.match(regex) || []
  
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aPart = aParts[i] || ''
    const bPart = bParts[i] || ''
    
    // Extract letters and numbers
    const aLetters = aPart.replace(/\d/g, '')
    const bLetters = bPart.replace(/\d/g, '')
    const aNumbers = aPart.replace(/\D/g, '')
    const bNumbers = bPart.replace(/\D/g, '')
    
    // Compare letters first
    if (aLetters !== bLetters) {
      return aLetters.localeCompare(bLetters)
    }
    
    // Compare numbers
    if (aNumbers || bNumbers) {
      const aNum = parseInt(aNumbers) || 0
      const bNum = parseInt(bNumbers) || 0
      if (aNum !== bNum) return aNum - bNum
    }
  }
  return 0
}
