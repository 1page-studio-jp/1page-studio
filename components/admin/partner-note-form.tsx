'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function PartnerNoteForm({ storeId }: { storeId: string }) {
  const [content, setContent] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const submit = async () => {
    if (!content.trim()) return
    setLoading(true)
    await fetch('/api/admin/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ store_id: storeId, content, is_private: isPrivate }),
    })
    setContent('')
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="space-y-2">
      <Textarea
        placeholder="メモを入力..."
        className="min-h-[80px] text-sm"
        value={content}
        onChange={e => setContent(e.target.value)}
      />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={e => setIsPrivate(e.target.checked)}
            className="h-3 w-3"
          />
          管理者のみ表示
        </label>
        <Button size="sm" onClick={submit} disabled={loading || !content.trim()}>
          <Send className="h-3.5 w-3.5 mr-1.5" />
          メモを追加
        </Button>
      </div>
    </div>
  )
}
