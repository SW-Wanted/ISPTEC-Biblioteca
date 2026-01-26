"use client"

import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const mediaQueryList = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`) 

    const handleChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }

    handleChange()

    mediaQueryList.addEventListener("change", handleChange)
    return () => mediaQueryList.removeEventListener("change", handleChange)
  }, [])

  return isMobile
}
