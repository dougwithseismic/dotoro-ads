import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { PermissionCell } from "../PermissionCell";

describe("PermissionCell", () => {
  describe("rendering states", () => {
    it("renders check icon when allowed", () => {
      render(<PermissionCell allowed={true} tooltip="Test permission" />);

      const cell = screen.getByTestId("permission-cell");
      expect(cell).toHaveAttribute("data-allowed", "true");
      expect(screen.getByTestId("check-icon")).toBeInTheDocument();
    });

    it("renders X icon when denied", () => {
      render(<PermissionCell allowed={false} tooltip="Test permission" />);

      const cell = screen.getByTestId("permission-cell");
      expect(cell).toHaveAttribute("data-allowed", "false");
      expect(screen.getByTestId("x-icon")).toBeInTheDocument();
    });

    it("renders warning icon for dangerous allowed permissions", () => {
      render(
        <PermissionCell allowed={true} tooltip="Dangerous action" dangerous />
      );

      const cell = screen.getByTestId("permission-cell");
      expect(cell).toHaveAttribute("data-dangerous", "true");
      expect(screen.getByTestId("warning-icon")).toBeInTheDocument();
    });

    it("does not render warning icon for dangerous denied permissions", () => {
      render(
        <PermissionCell allowed={false} tooltip="Dangerous action" dangerous />
      );

      expect(screen.queryByTestId("warning-icon")).not.toBeInTheDocument();
    });
  });

  describe("tooltip behavior", () => {
    it("shows tooltip on hover", async () => {
      const user = userEvent.setup();
      render(
        <PermissionCell allowed={true} tooltip="This is a test tooltip" />
      );

      const cell = screen.getByTestId("permission-cell");
      await user.hover(cell);

      expect(screen.getByRole("tooltip")).toHaveTextContent(
        "This is a test tooltip"
      );
    });

    it("hides tooltip when not hovering", () => {
      render(
        <PermissionCell allowed={true} tooltip="This is a test tooltip" />
      );

      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("has accessible label for allowed state", () => {
      render(<PermissionCell allowed={true} tooltip="Create campaigns" />);

      const cell = screen.getByTestId("permission-cell");
      expect(cell).toHaveAttribute("aria-label", "Allowed: Create campaigns");
    });

    it("has accessible label for denied state", () => {
      render(<PermissionCell allowed={false} tooltip="Create campaigns" />);

      const cell = screen.getByTestId("permission-cell");
      expect(cell).toHaveAttribute("aria-label", "Denied: Create campaigns");
    });

    it("includes danger warning in accessible label", () => {
      render(
        <PermissionCell allowed={true} tooltip="Delete team" dangerous />
      );

      const cell = screen.getByTestId("permission-cell");
      expect(cell).toHaveAttribute(
        "aria-label",
        "Warning - Dangerous permission allowed: Delete team"
      );
    });
  });

  describe("styling", () => {
    it("applies correct CSS class based on allowed state", () => {
      const { rerender } = render(
        <PermissionCell allowed={true} tooltip="Test" />
      );

      let cell = screen.getByTestId("permission-cell");
      expect(cell.className).toMatch(/allowed/);

      rerender(<PermissionCell allowed={false} tooltip="Test" />);
      cell = screen.getByTestId("permission-cell");
      expect(cell.className).toMatch(/denied/);
    });

    it("applies danger class when dangerous and allowed", () => {
      render(<PermissionCell allowed={true} tooltip="Test" dangerous />);

      const cell = screen.getByTestId("permission-cell");
      expect(cell.className).toMatch(/dangerous/);
    });
  });
});
