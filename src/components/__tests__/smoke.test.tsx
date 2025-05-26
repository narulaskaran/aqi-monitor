import { render, screen } from "@testing-library/react";
import React from "react";

describe("Smoke test", () => {
  it("renders a div", () => {
    render(<div data-testid="smoke">Hello</div>);
    expect(screen.getByTestId("smoke")).toBeInTheDocument();
  });
});
