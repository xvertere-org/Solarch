'use client'

import { useUser, UserButton, SignInButton } from '@clerk/nextjs'
import { useTspoonbaseStore } from '@/lib/tspoonbase'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Settings, Link2, Link2Off, LogOut } from 'lucide-react'
import { useState } from 'react'

export default function UserMenu() {
  const { isSignedIn, user } = useUser()
  const { connection, disconnect } = useTspoonbaseStore()
  const [open, setOpen] = useState(false)

  return (
    <div className="flex items-center gap-2">
      {/* TspoonBase connection status */}
      <Tooltip>
        <TooltipTrigger
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] cursor-default transition-colors ${
            connection.connected
              ? 'bg-green-500/10 text-green-400'
              : 'bg-muted/30 text-muted-foreground'
          }`}
        >
          {connection.connected ? (
            <><Link2 className="size-2.5" /> TS</>
          ) : (
            <><Link2Off className="size-2.5" /> TS</>
          )}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-[10px]">
          {connection.connected
            ? `Connected to ${connection.url}`
            : 'Not connected to TspoonBase'}
        </TooltipContent>
      </Tooltip>

      {/* Clerk user */}
      {isSignedIn ? (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground hidden sm:inline truncate max-w-[100px]">
            {user?.primaryEmailAddress?.emailAddress}
          </span>
          <UserButton />
        </div>
      ) : (
        <SignInButton mode="modal">
          <Button variant="ghost" size="xs" className="text-[10px] h-6 gap-1">
            Sign in
          </Button>
        </SignInButton>
      )}
    </div>
  )
}
