import { isRouteErrorResponse, useRouteError } from "react-router-dom";
import { ErrorScreen, NotFoundPage } from "./NotFoundPage";

export function RouteErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundPage />;
  }

  return (
    <ErrorScreen
      title="Something went wrong"
      description="An unexpected error occurred."
      message="Please try again, or return to the home page."
    />
  );
}
