import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { AQIIcon } from "../components/AQIIcon";
import { ThemeToggle } from "../components/ThemeToggle";

interface ErrorScreenProps {
  title: string;
  description: string;
  message: string;
}

export function ErrorScreen({ title, description, message }: ErrorScreenProps) {
  return (
    <div className="min-h-screen p-4 transition-colors duration-300 bg-background flex flex-col">
      <ThemeToggle />
      <div className="container mx-auto px-4 py-8 flex-1 flex items-center">
        <Card className="max-w-md mx-auto w-full">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <AQIIcon className="w-8 h-8" />
              <span className="text-lg font-semibold">AQI Monitor</span>
            </div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-6 text-sm text-muted-foreground">{message}</p>
            <Button asChild>
              <Link to="/">Return to Home Page</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
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
