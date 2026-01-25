import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

type Loan = {
  id: string
  student: string
  book: string
  dueDate: string
  status: "ok" | "overdue"
}

const loans: Loan[] = [
  {
    id: "LN-1001",
    student: "Ana Silva",
    book: "Clean Code",
    dueDate: "2026-02-01",
    status: "ok",
  },
  {
    id: "LN-1002",
    student: "Bruno Costa",
    book: "The Pragmatic Programmer",
    dueDate: "2026-01-12",
    status: "overdue",
  },
]

function StatusBadge({ status }: { status: Loan["status"] }) {
  if (status === "overdue") return <Badge variant="secondary">Overdue</Badge>
  return <Badge>On time</Badge>
}

export default function LoansPage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Loans</h1>
        <p className="text-sm text-muted-foreground">
          Example list of current loans (static MVP data).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-semibold">{loans.length}</div>
              <div className="text-sm text-muted-foreground">
                active loans in this demo
              </div>
            </div>
            <Button variant="outline">New loan</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Overdue</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-semibold">
                {loans.filter((l) => l.status === "overdue").length}
              </div>
              <div className="text-sm text-muted-foreground">
                requiring attention
              </div>
            </div>
            <Button variant="secondary">Notify</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current loans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-30">ID</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Book</TableHead>
                  <TableHead className="w-30">Due</TableHead>
                  <TableHead className="w-30">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loans.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {l.id}
                    </TableCell>
                    <TableCell className="font-medium">{l.student}</TableCell>
                    <TableCell>{l.book}</TableCell>
                    <TableCell>{l.dueDate}</TableCell>
                    <TableCell>
                      <StatusBadge status={l.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
