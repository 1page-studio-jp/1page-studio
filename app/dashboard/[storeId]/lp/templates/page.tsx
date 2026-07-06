'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { INDUSTRIES } from '@/lib/lp-templates'

export default function LpTemplatePage({ params }: { params: { storeId: string } }) {
  const router = useRouter()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/${params.storeId}/lp`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            戻る
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">業種テンプレートを選択</h1>
          <p className="text-sm text-gray-500 mt-1">
            業種を選ぶと、最適なLP文章が自動で入力されます
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {INDUSTRIES.map((industry) => (
          <button
            key={industry.id}
            onClick={() =>
              router.push(
                `/dashboard/${params.storeId}/lp/new?template=${industry.id}`
              )
            }
            className="text-left w-full"
          >
            <Card className="h-full hover:shadow-md transition-all cursor-pointer border-2 hover:border-blue-400 hover:-translate-y-0.5">
              <CardContent className="p-4 flex flex-col items-start gap-3">
                <span
                  className={`inline-flex items-center justify-center w-12 h-12 rounded-xl text-2xl ${industry.color}`}
                >
                  {industry.emoji}
                </span>
                <div>
                  <p className={`font-semibold text-sm ${industry.textColor}`}>
                    {industry.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    {industry.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <div className="flex justify-center pt-2">
        <Link href={`/dashboard/${params.storeId}/lp/new`}>
          <Button variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            テンプレートを使わず空白から作成
          </Button>
        </Link>
      </div>
    </div>
  )
}
