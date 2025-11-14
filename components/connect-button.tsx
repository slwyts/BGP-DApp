'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { Button } from '@/components/ui/button'
import { Wallet } from 'lucide-react'

export function ConnectButton() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  if (isConnected && address) {
    return (
      <Button
        variant="outline"
        onClick={() => disconnect()}
        className="gap-2"
      >
        <Wallet className="h-4 w-4" />
        {address.slice(0, 6)}...{address.slice(-4)}
      </Button>
    )
  }

  return (
    <Button 
      onClick={() => {
        const connector = connectors[0]
        if (connector) connect({ connector })
      }} 
      className="gap-2"
    >
      <Wallet className="h-4 w-4" />
      Connect Wallet
    </Button>
  )
}
