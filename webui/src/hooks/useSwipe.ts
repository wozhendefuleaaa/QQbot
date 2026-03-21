import { useCallback, useRef, useState } from 'react'

export interface SwipeHandlers {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
}

export interface SwipeState {
  isSwiping: boolean
  direction: 'left' | 'right' | 'up' | 'down' | null
  distance: number
  deltaX: number
  deltaY: number
}

export interface UseSwipeOptions {
  threshold?: number
  preventDefaultTouchMove?: boolean
  trackMouse?: boolean
}

const defaultOptions: UseSwipeOptions = {
  threshold: 50,
  preventDefaultTouchMove: false,
  trackMouse: false,
}

export function useSwipe(
  handlers: SwipeHandlers,
  options: UseSwipeOptions = {}
) {
  const { threshold = 50, preventDefaultTouchMove = false, trackMouse = false } = { ...defaultOptions, ...options }
  
  const [state, setState] = useState<SwipeState>({
    isSwiping: false,
    direction: null,
    distance: 0,
    deltaX: 0,
    deltaY: 0,
  })
  
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const isSwipingRef = useRef(false)

  const handleStart = useCallback((clientX: number, clientY: number) => {
    touchStartRef.current = {
      x: clientX,
      y: clientY,
      time: Date.now(),
    }
    isSwipingRef.current = false
    setState({
      isSwiping: false,
      direction: null,
      distance: 0,
      deltaX: 0,
      deltaY: 0,
    })
  }, [])

  const handleMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!touchStartRef.current) return

      const deltaX = clientX - touchStartRef.current.x
      const deltaY = clientY - touchStartRef.current.y
      const distanceX = Math.abs(deltaX)
      const distanceY = Math.abs(deltaY)

      // 判断是否开始滑动
      if (!isSwipingRef.current && (distanceX > 10 || distanceY > 10)) {
        isSwipingRef.current = true
        setState((prev) => ({ ...prev, isSwiping: true }))
      }

      if (isSwipingRef.current) {
        // 确定滑动方向
        let direction: SwipeState['direction'] = null
        if (distanceX > distanceY && distanceX > threshold) {
          direction = deltaX > 0 ? 'right' : 'left'
        } else if (distanceY > distanceX && distanceY > threshold) {
          direction = deltaY > 0 ? 'down' : 'up'
        }

        setState({
          isSwiping: true,
          direction,
          distance: Math.max(distanceX, distanceY),
          deltaX,
          deltaY,
        })
      }
    },
    [threshold]
  )

  const handleEnd = useCallback(() => {
    if (!touchStartRef.current || !isSwipingRef.current) {
      touchStartRef.current = null
      return
    }

    const { deltaX, deltaY, direction } = state
    const distanceX = Math.abs(deltaX)
    const distanceY = Math.abs(deltaY)

    // 触发回调
    if (distanceX > threshold || distanceY > threshold) {
      if (direction === 'left' && handlers.onSwipeLeft) {
        handlers.onSwipeLeft()
      } else if (direction === 'right' && handlers.onSwipeRight) {
        handlers.onSwipeRight()
      } else if (direction === 'up' && handlers.onSwipeUp) {
        handlers.onSwipeUp()
      } else if (direction === 'down' && handlers.onSwipeDown) {
        handlers.onSwipeDown()
      }
    }

    touchStartRef.current = null
    isSwipingRef.current = false
    setState({
      isSwiping: false,
      direction: null,
      distance: 0,
      deltaX: 0,
      deltaY: 0,
    })
  }, [state, handlers, threshold])

  // 触摸事件处理
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0]
      handleStart(touch.clientX, touch.clientY)
    },
    [handleStart]
  )

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (preventDefaultTouchMove && isSwipingRef.current) {
        e.preventDefault()
      }
      const touch = e.touches[0]
      handleMove(touch.clientX, touch.clientY)
    },
    [handleMove, preventDefaultTouchMove]
  )

  const onTouchEnd = useCallback(() => {
    handleEnd()
  }, [handleEnd])

  // 鼠标事件处理（可选）
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!trackMouse) return
      handleStart(e.clientX, e.clientY)
    },
    [handleStart, trackMouse]
  )

  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!trackMouse || !touchStartRef.current) return
      handleMove(e.clientX, e.clientY)
    },
    [handleMove, trackMouse]
  )

  const onMouseUp = useCallback(() => {
    if (!trackMouse) return
    handleEnd()
  }, [handleEnd, trackMouse])

  const onMouseLeave = useCallback(() => {
    if (!trackMouse) return
    handleEnd()
  }, [handleEnd, trackMouse])

  return {
    state,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      ...(trackMouse && {
        onMouseDown,
        onMouseMove,
        onMouseUp,
        onMouseLeave,
      }),
    },
  }
}

// 滑动返回 Hook
export function useSwipeBack(onBack: () => void, threshold = 80) {
  const [swipeProgress, setSwipeProgress] = useState(0)
  const [isSwipingBack, setIsSwipingBack] = useState(false)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    // 只在屏幕左边缘开始滑动才触发
    if (touch.clientX < 30) {
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
      }
      setIsSwipingBack(true)
    }
  }, [])

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current) return

      const touch = e.touches[0]
      const deltaX = touch.clientX - touchStartRef.current.x

      if (deltaX > 0) {
        const progress = Math.min(deltaX / threshold, 1)
        setSwipeProgress(progress)
      }
    },
    [threshold]
  )

  const onTouchEnd = useCallback(() => {
    if (swipeProgress > 0.5) {
      onBack()
    }
    setSwipeProgress(0)
    setIsSwipingBack(false)
    touchStartRef.current = null
  }, [swipeProgress, onBack])

  return {
    swipeProgress,
    isSwipingBack,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
  }
}

// 滑动删除 Hook
export function useSwipeDelete(onDelete: () => void, threshold = 100) {
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const touchStartRef = useRef<{ x: number } | null>(null)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX }
    setIsDeleting(false)
  }, [])

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current) return

      const touch = e.touches[0]
      const deltaX = touch.clientX - touchStartRef.current.x

      // 只允许向左滑动
      if (deltaX < 0) {
        setSwipeOffset(Math.max(deltaX, -threshold * 1.5))
      }
    },
    [threshold]
  )

  const onTouchEnd = useCallback(() => {
    if (swipeOffset < -threshold) {
      setIsDeleting(true)
      // 延迟执行删除，让动画有时间播放
      setTimeout(() => {
        onDelete()
        setSwipeOffset(0)
        setIsDeleting(false)
      }, 200)
    } else {
      setSwipeOffset(0)
    }
    touchStartRef.current = null
  }, [swipeOffset, threshold, onDelete])

  const resetSwipe = useCallback(() => {
    setSwipeOffset(0)
    setIsDeleting(false)
  }, [])

  return {
    swipeOffset,
    isDeleting,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
    resetSwipe,
  }
}

// 下拉刷新 Hook
export function usePullToRefresh(onRefresh: () => Promise<void>, threshold = 80) {
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const touchStartRef = useRef<{ y: number; scrollTop: number } | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const container = containerRef.current
    if (!container || container.scrollTop > 0) return

    const touch = e.touches[0]
    touchStartRef.current = {
      y: touch.clientY,
      scrollTop: container.scrollTop,
    }
  }, [])

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current || isRefreshing) return

      const container = containerRef.current
      if (!container || container.scrollTop > 0) return

      const touch = e.touches[0]
      const deltaY = touch.clientY - touchStartRef.current.y

      if (deltaY > 0) {
        setIsPulling(true)
        setPullDistance(Math.min(deltaY, threshold * 1.5))
      }
    },
    [threshold, isRefreshing]
  )

  const onTouchEnd = useCallback(async () => {
    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true)
      try {
        await onRefresh()
      } finally {
        setIsRefreshing(false)
      }
    }
    setIsPulling(false)
    setPullDistance(0)
    touchStartRef.current = null
  }, [pullDistance, threshold, isRefreshing, onRefresh])

  return {
    isPulling,
    pullDistance,
    isRefreshing,
    containerRef,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
  }
}
