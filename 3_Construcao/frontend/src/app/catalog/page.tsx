import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

type Book = {
  id: string
  title: string
  author: string
  year: number
  status: "available" | "borrowed"
}

const books: Book[] = [
  {
    id: "BK-001",
    title: "Clean Code",
    author: "Robert C. Martin",
    year: 2008,
    status: "borrowed",
  },
  {
    id: "BK-002",
    title: "Designing Data-Intensive Applications",
    author: "Martin Kleppmann",
    year: 2017,
    status: "available",
  },
  {
    id: "BK-003",
    title: "Introduction to Algorithms",
    author: "Cormen, Leiserson, Rivest, Stein",
    year: 2009,
    status: "available",
  },
  {
    id: "BK-004",
    title: "The Pragmatic Programmer",
    author: "Andrew Hunt, David Thomas",
    year: 1999,
    status: "borrowed",
  },
]

function StatusBadge({ status }: { status: Book["status"] }) {
  if (status === "available") {
    return <Badge>Available</Badge>
  }

  return <Badge variant="secondary">Borrowed</Badge>
}

export default function CatalogPage() {
  const available = books.filter((b) => b.status === "available")
  const borrowed = books.filter((b) => b.status === "borrowed")

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Catalog</h1>
        <p className="text-sm text-muted-foreground">
          Simple, static catalog for the MVP (no backend yet).
        </p>
      </div>

      <Card>
        <CardHeader className="gap-2">
          <CardTitle className="text-base">Search</CardTitle>
          <Input placeholder="Search by title, author, or id (mock UI)" />
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="available">Available</TabsTrigger>
              <TabsTrigger value="borrowed">Borrowed</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="pt-4">
              <BooksTable rows={books} />
            </TabsContent>
            <TabsContent value="available" className="pt-4">
              <BooksTable rows={available} />
            </TabsContent>
            <TabsContent value="borrowed" className="pt-4">
              <BooksTable rows={borrowed} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

function BooksTable({ rows }: { rows: Book[] }) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[110px]">ID</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Author</TableHead>
            <TableHead className="w-[90px]">Year</TableHead>
            <TableHead className="w-[110px]">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((b) => (
            <TableRow key={b.id}>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {b.id}
              </TableCell>
              <TableCell className="font-medium">{b.title}</TableCell>
              <TableCell>{b.author}</TableCell>
              <TableCell>{b.year}</TableCell>
              <TableCell>
                <StatusBadge status={b.status} />
              </TableCell>
            </TableRow>
          ))}

          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-sm">
                No results.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  )
}
