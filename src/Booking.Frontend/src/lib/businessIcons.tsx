import { Scissors, Dumbbell, Stethoscope, Building2, Coffee, Sparkles } from 'lucide-react'

export interface BusinessConfig {
  icon: React.ComponentType<{ size?: number; className?: string }>
  color: string
  bg: string
  border: string
  label: string
}

export const businessConfigs: Record<string, BusinessConfig> = {
  'peluquería': {
    icon: Scissors,
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
    label: 'Peluquería'
  },
  'peluqueria': {
    icon: Scissors,
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
    label: 'Peluquería'
  },
  'gimnasio': {
    icon: Dumbbell,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    label: 'Gimnasio'
  },
  'clínica': {
    icon: Stethoscope,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    label: 'Clínica'
  },
  'clinica': {
    icon: Stethoscope,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    label: 'Clínica'
  },
  'coworking': {
    icon: Coffee,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    label: 'Coworking'
  },
  'spa': {
    icon: Sparkles,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    label: 'Spa'
  },
}

export function getBusinessConfig(category: string): BusinessConfig {
  return businessConfigs[category.toLowerCase()] ?? {
    icon: Building2,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    label: category
  }
}