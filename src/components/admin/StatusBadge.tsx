import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
    active: "default",
    inactive: "secondary",
    archived: "outline",
    draft: "secondary",
    confirmed: "default",
    pending: "secondary",
    cancelled: "destructive",
    delivered: "default",
    returned: "destructive",
  };
  return <Badge variant={map[status] ?? "outline"}>{status}</Badge>;
}