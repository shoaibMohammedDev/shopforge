'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Home, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <Search className="h-10 w-10 text-muted-foreground" />
          </div>
          <CardTitle className="text-3xl font-bold">404</CardTitle>
          <p className="text-muted-foreground mt-2">Page not found</p>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button onClick={() => (window.location.href = '/')} className="gap-2">
            <Home className="h-4 w-4" />
            Back to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
