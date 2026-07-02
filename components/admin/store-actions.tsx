'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Settings, ChevronDown, PowerOff, Power, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
  storeId: string
  currentStatus: string
}

export function AdminStoreActions({ storeId, currentStatus }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const changeStatus = async (status: string) => {
    setLoading(true)
    setOpen(false)
    await fetch(`/api/admin/stores/${storeId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(o => !o)}
        disabled={loading}
      >
        <Settings className="h-3.5 w-3.5 mr-1.5" />
        管理
        <ChevronDown className="h-3 w-3 ml-1" />
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 w-48 rounded-xl border bg-card shadow-lg overflow-hidden">
            {currentStatus !== 'active' && (
              <button
                onClick={() => changeStatus('active')}
                className="flex w-full items-center gap-2 px-4 py-3 text-sm hover:bg-accent"
              >
                <Power className="h-4 w-4 text-green-600" />
                稼働中に変更
              </button>
            )}
            {currentStatus !== 'inactive' && (
              <button
                onClick={() => changeStatus('inactive')}
                className="flex w-full items-center gap-2 px-4 py-3 text-sm hover:bg-accent"
              >
                <PowerOff className="h-4 w-4 text-yellow-600" />
                停止に変更
              </button>
            )}
            {currentStatus !== 'trial' && (
              <button
                onClick={() => changeStatus('trial')}
                className="flex w-full items-center gap-2 px-4 py-3 text-sm hover:bg-accent"
              >
                <Settings className="h-4 w-4 text-blue-600" />
                トライアルに変更
              </button>
            )}
            <button
              onClick={() => {
                if (confirm('この店舗を削除しますか？（論理削除）')) changeStatus('canceled')
              }}
              className="flex w-full items-center gap-2 px-4 py-3 text-sm text-destructive hover:bg-destructive/10 border-t"
            >
              <Trash2 className="h-4 w-4" />
              解約処理
            </button>
          </div>
        </>
      )}
    </div>
  )
}
