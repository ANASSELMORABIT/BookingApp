import { AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

/** Diálogo para confirmar una acción que no se puede deshacer. */
export function ConfirmDialog({
  open, onOpenChange, title, description, confirmLabel = 'Confirmar', cancelLabel = 'Volver', loading, onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="app-dialog max-w-sm">
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl border border-rose-500/20 bg-rose-500/10">
            <AlertTriangle size={18} className="text-rose-300" />
          </div>
          <DialogTitle className="text-white">{title}</DialogTitle>
          <DialogDescription className="text-slate-400">{description}</DialogDescription>
        </DialogHeader>
        <div className="mt-2 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 rounded-xl border-white/10 bg-transparent text-slate-300 hover:bg-white/5 hover:text-white"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="h-10 rounded-xl bg-rose-600 text-white hover:bg-rose-500"
          >
            {loading ? 'Un momento…' : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
