import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { getApiUrl } from "../lib/api";
import { ThemeToggle } from "../components/ThemeToggle";

export function UnsubscribePage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const unsubscribe = async () => {
      const token = searchParams.get("token");
      const subscription_id = searchParams.get("subscription_id");

      if (!token || !subscription_id) {
        setStatus("error");
        setMessage(
          "Invalid unsubscribe link. Please try again or contact support."
        );
        return;
      }

      try {
        console.log("Making unsubscribe request...");

        const response = await fetch(getApiUrl("/unsubscribe"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ subscription_id }),
          credentials: "include", // Important for CORS
        });

        console.log("Response status:", response.status);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Response data:", data);

        if (data.success) {
          setStatus("success");
          setMessage(
            "You have been successfully unsubscribed from air quality alerts."
          );
        } else {
          setStatus("error");
          setMessage(
            data.error ||
              "Failed to unsubscribe. Please try again or contact support."
          );
        }
      } catch (error) {
        console.error("Error unsubscribing:", error);
        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "An error occurred. Please try again or contact support."
        );
      }
    };

    unsubscribe();
  }, [searchParams]);

  return (
    <div className="container mx-auto px-4 py-8">
      <ThemeToggle />
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Unsubscribe Status</CardTitle>
          <CardDescription>
            {status === "loading" && "Processing your unsubscribe request..."}
            {status === "success" && "Successfully Unsubscribed"}
            {status === "error" && "Unsubscribe Failed"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-6">{message}</p>

          {status === "success" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                If you change your mind, you can always sign up for air quality
                alerts again from our main page.
              </p>
              <Button asChild>
                <a href="/">Return to Home Page</a>
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                If you're having trouble unsubscribing, please contact our
                support team.
              </p>
              <Button asChild>
                <a href="/">Return to Home Page</a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
