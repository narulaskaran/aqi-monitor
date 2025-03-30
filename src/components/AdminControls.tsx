import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import {
  ExclamationTriangleIcon,
  ReloadIcon,
  CheckCircledIcon,
} from "@radix-ui/react-icons";

const getBaseUrl = () => {
  // Check if we're running on Vercel
  if (
    typeof window !== "undefined" &&
    window.location.hostname.includes("vercel.app")
  ) {
    return window.location.origin;
  }

  // In development (localhost)
  if (
    typeof window !== "undefined" &&
    window.location.hostname === "localhost"
  ) {
    return "http://localhost:3000";
  }

  // Fallback to current origin
  return typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:3000";
};

/**
 * Admin panel for managing cron jobs and other administrative tasks
 */
export default function AdminControls() {
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleTriggerCronJob = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const baseUrl = getBaseUrl();
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      // Add authorization header if API key is provided
      if (apiKey.trim()) {
        headers["Authorization"] = `Bearer ${apiKey.trim()}`;
      }

      const response = await fetch(`${baseUrl}/api/cron/update-air-quality`, {
        method: "GET",
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to trigger cron job");
      }

      setResult({
        success: true,
        message: data.message || "Cron job triggered successfully",
      });
    } catch (error) {
      console.error("Error triggering cron job:", error);
      setResult({
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to trigger cron job",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Admin Controls</CardTitle>
        <CardDescription>
          Manually trigger cron jobs and other administrative tasks
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="apiKey" className="text-sm font-medium">
            API Key
          </label>
          <Input
            id="apiKey"
            type="password"
            placeholder="Enter CRON_SECRET"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
        </div>

        {result && (
          <Alert variant={result.success ? "default" : "destructive"}>
            {result.success ? (
              <CheckCircledIcon className="h-4 w-4" />
            ) : (
              <ExclamationTriangleIcon className="h-4 w-4" />
            )}
            <AlertTitle>{result.success ? "Success" : "Error"}</AlertTitle>
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
        )}
      </CardContent>

      <CardFooter>
        <Button
          onClick={handleTriggerCronJob}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <ReloadIcon className="mr-2 h-4 w-4" />
              Trigger Data Update
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
