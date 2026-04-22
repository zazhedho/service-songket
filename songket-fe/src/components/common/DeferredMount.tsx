import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'

type DeferredMountProps = {
  children: ReactNode
  fallback?: ReactNode
  minHeight?: CSSProperties['minHeight']
  rootMargin?: string
  style?: CSSProperties
}

export default function DeferredMount({
  children,
  fallback = null,
  minHeight,
  rootMargin = '200px 0px',
  style,
}: DeferredMountProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isVisible) return

    const container = containerRef.current
    if (!container) return

    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        setIsVisible(true)
        observer.disconnect()
      },
      { rootMargin },
    )

    observer.observe(container)
    return () => {
      observer.disconnect()
    }
  }, [isVisible, rootMargin])

  return (
    <div ref={containerRef} style={{ minHeight, ...style }}>
      {isVisible ? children : fallback}
    </div>
  )
}
