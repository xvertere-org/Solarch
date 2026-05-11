'use client'

import { useEffect, useState } from 'react'
import { driver, type DriveStep } from 'driver.js'
import 'driver.js/dist/driver.css'

const TOUR_KEY = 'torque-tour-completed'

export default function CanvasTour() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const completed = localStorage.getItem(TOUR_KEY)
    if (completed === 'true') return
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return

    const steps: DriveStep[] = [
      {
        element: '#tour-palette',
        popover: {
          title: 'Node Palette',
          description: 'Browse 48 node types across 6 categories. Click or drag any node onto the canvas to start building your workflow.',
          side: 'right',
          align: 'center',
        },
      },
      {
        element: '#tour-canvas',
        popover: {
          title: 'Workflow Canvas',
          description: 'Drop nodes here and connect them by dragging between handles. Each node has colored input/output ports for wiring.',
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '#tour-config',
        popover: {
          title: 'Node Configuration',
          description: 'Click any node on the canvas to configure it here. Each node type has its own form — models, prompts, URLs, conditions, and more.',
          side: 'left',
          align: 'center',
        },
      },
      {
        element: '#tour-export',
        popover: {
          title: 'Export Your Workflow',
          description: 'Export as TypeScript (.ts) to run locally, as JSON for portability, or connect TspoonBase to push directly to your backend.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '#tour-connect',
        popover: {
          title: 'Connect TspoonBase',
          description: 'Link your TspoonBase instance from Settings to push workflows for production execution with API endpoints, scheduling, and observability.',
          side: 'bottom',
          align: 'center',
        },
      },
    ]

    const tour = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      steps,
      onDestroyed: () => {
        localStorage.setItem(TOUR_KEY, 'true')
      },
    })

    const timer = setTimeout(() => {
      tour.drive()
    }, 600)

    return () => {
      clearTimeout(timer)
      tour.destroy()
    }
  }, [ready])

  return null
}
