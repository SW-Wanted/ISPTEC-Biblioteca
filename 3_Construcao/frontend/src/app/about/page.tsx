import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AboutPage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">About</h1>
        <p className="text-sm text-muted-foreground">
          MVP UI scaffold for the biblioteca-universitaria frontend.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What’s included</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>- Next.js App Router + TypeScript</p>
          <p>- Tailwind CSS + shadcn/ui components</p>
          <p>- Simple pages and navigation to expand later</p>
        </CardContent>
      </Card>
    </div>
  )
}
