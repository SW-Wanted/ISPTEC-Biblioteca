import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Biblioteca Universitária
          </h1>
          <Badge variant="secondary">MVP</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Simple UI scaffold with Next.js + Tailwind + shadcn/ui.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="sm:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 sm:flex-row">
            <Button asChild>
              <Link href="/catalog">Browse catalog</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/loans">View loans</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/about">About MVP</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Next steps</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Add backend integration (auth, search, loans) when ready.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
