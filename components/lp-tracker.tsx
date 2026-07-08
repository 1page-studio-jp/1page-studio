'use client'
import { useEffect } from 'react'

export function LpViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    fetch('/api/lp/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, type: 'view' }),
    }).catch(() => {})
  }, [slug])
  return null
}

export function LpLineButton({
  slug,
  href,
  className,
  children,
}: {
  slug: string
  href: string
  className?: string
  children: React.ReactNode
}) {
  const handleClick = () => {
    fetch('/api/lp/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, type: 'line_click' }),
    }).catch(() => {})
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} onClick={handleClick}>
      {children}
    </a>
  )
}
