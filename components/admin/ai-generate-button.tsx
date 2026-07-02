'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function AiGenerateButton({ storeId }: { storeId: string }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const router = useRouter()

  const generate = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: storeId }),
      })
      if (res.ok) {
        setDone(true)
        router.refresh()
      } else {
        const data = await res.json()
        alert(data.error ?? 'エラーが発生しました')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={generate} disabled={loading}>
      {loading ? (
        <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />生成中...</>
      ) : done ? (
        <><Sparkles className="h-3.5 w-3.5 mr-1.5 text-yellow-500" />生成済み</>
      ) : (
        <><Sparkles className="h-3.5 w-3.5 mr-1.5" />AI分析を生成</>
      )}
    </Button>
  )
}
