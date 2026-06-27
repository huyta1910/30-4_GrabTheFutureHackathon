import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface DriverErrorStateProps {
  title?: string;
  message?: string;
  onRetry: () => void;
}

export function DriverErrorState({ title, message, onRetry }: DriverErrorStateProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title ?? "Something went wrong"}</CardTitle>
        <CardDescription>{message ?? "Please try again."}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" onClick={onRetry}>
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}
