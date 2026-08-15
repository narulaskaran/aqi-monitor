import { RouteObject } from "react-router-dom";
import App from "./App";
import { NotFoundPage } from "./pages/NotFoundPage";
import { RouteErrorBoundary } from "./pages/RouteErrorBoundary";
import { UnsubscribePage } from "./pages/UnsubscribePage";

export const routes: RouteObject[] = [
  {
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        path: "/",
        element: <App />,
      },
      {
        path: "/unsubscribe",
        element: <UnsubscribePage />,
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
];
