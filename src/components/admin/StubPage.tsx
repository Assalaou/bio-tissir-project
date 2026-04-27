import { PageHeader } from "./PageHeader";
import { Card, CardContent } from "@/components/ui/card";

export function StubPage({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <Card>
        <CardContent className="py-16 text-center text-sm text-muted-foreground">
          Module en construction · قيد الإنشاء
        </CardContent>
      </Card>
    </div>
  );
}