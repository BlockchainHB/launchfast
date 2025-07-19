import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { IconLayoutColumns, IconDownload, IconChevronDown } from "@tabler/icons-react"

export function MarketTableSkeleton() {
  return (
    <div className="w-full px-4 lg:px-6">
      {/* Filter and buttons row */}
      <div className="flex items-center justify-between py-4">
        <div className="animate-pulse bg-muted rounded h-10 w-72"></div>
        <div className="flex items-center space-x-2">
          <div className="animate-pulse bg-muted rounded h-9 w-24"></div>
          <div className="animate-pulse bg-muted rounded h-9 w-20"></div>
        </div>
      </div>
      
      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table className="data-table">
          <TableHeader>
            <TableRow className="bg-muted/50">
              {/* Market Keyword (sticky) */}
              <TableHead className="sticky left-0 z-30 bg-muted backdrop-blur-sm shadow-lg border-r w-80">
                <div className="animate-pulse bg-muted-foreground/20 rounded h-4 w-32"></div>
              </TableHead>
              {/* Other columns */}
              {Array.from({ length: 17 }, (_, i) => (
                <TableHead key={i} className="text-center w-24">
                  <div className="animate-pulse bg-muted-foreground/20 rounded h-4 w-16 mx-auto"></div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }, (_, rowIndex) => (
              <TableRow key={rowIndex} className="hover:bg-muted/30">
                {/* Market Keyword cell (sticky) */}
                <TableCell className="sticky left-0 z-30 bg-background backdrop-blur-sm shadow-lg border-r">
                  <div className="flex items-center space-x-4">
                    <div className="animate-pulse bg-muted rounded h-4 w-4"></div>
                    <div className="flex items-center space-x-3 min-w-[300px]">
                      <div className="animate-pulse bg-muted rounded-md h-12 w-12"></div>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <div className="animate-pulse bg-muted rounded h-4 w-24"></div>
                          <div className="animate-pulse bg-muted rounded-full h-5 w-12"></div>
                        </div>
                        <div className="animate-pulse bg-muted rounded h-6 w-20"></div>
                      </div>
                    </div>
                  </div>
                </TableCell>
                {/* Other cells */}
                {Array.from({ length: 17 }, (_, cellIndex) => (
                  <TableCell key={cellIndex} className="text-center">
                    <div className="animate-pulse bg-muted rounded h-4 w-12 mx-auto"></div>
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      {/* Pagination */}
      <div className="flex items-center justify-between pt-4">
        <div className="animate-pulse bg-muted rounded h-4 w-40"></div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <div className="animate-pulse bg-muted rounded h-4 w-20"></div>
            <div className="animate-pulse bg-muted rounded h-8 w-16"></div>
          </div>
          <div className="animate-pulse bg-muted rounded h-4 w-24"></div>
          <div className="flex items-center space-x-2">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="animate-pulse bg-muted rounded h-8 w-8"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}