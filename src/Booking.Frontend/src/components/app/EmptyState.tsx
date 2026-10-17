import type { ComponentType, ReactNode } from 'react'

/** Estado vacío: icono, título, explicación y una acción opcional. */
export function EmptyState({ icon: Icon, title, text, action }: {
  icon: ComponentType<{ size?: number; className?: string }>
  title: string
  text?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="empty-icon mb-5 flex h-14 w-14 items-center justify-center rounded-2xl">
        <Icon size={22} className="text-violet-300" />
      </div>
      <p className="font-medium text-white">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-slate-400">{text}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
