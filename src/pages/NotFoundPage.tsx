import { Link } from "react-router-dom";
import { RouteShell } from "../components/RouteShell";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";

interface ErrorScreenProps {
  title: string;
  description: string;
  message: string;
}

export function ErrorScreen({ title, description, message }: ErrorScreenProps) {
  return (
    <RouteShell>
      <Card className="route-card">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="route-message">{message}</p>
          <Button asChild>
            <Link to="/">Return to Home Page</Link>
          </Button>
        </CardContent>
      </Card>
    </RouteShell>
  );
}

export function NotFoundPage() {
  return (
    <ErrorScreen
      title="Page not found"
      description="404"
      message="The page you're looking for doesn't exist or may have been moved."
    />
  );
}
