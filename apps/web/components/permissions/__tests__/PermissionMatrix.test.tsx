import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { PermissionMatrix } from "../PermissionMatrix";

describe("PermissionMatrix", () => {
  describe("rendering", () => {
    it("renders the matrix container", () => {
      render(<PermissionMatrix currentRole="editor" />);

      expect(screen.getByTestId("permission-matrix")).toBeInTheDocument();
    });

    it("renders all four roles as columns", () => {
      render(<PermissionMatrix currentRole="editor" />);

      expect(screen.getByText("Viewer")).toBeInTheDocument();
      expect(screen.getByText("Editor")).toBeInTheDocument();
      expect(screen.getByText("Admin")).toBeInTheDocument();
      expect(screen.getByText("Owner")).toBeInTheDocument();
    });

    it("renders role levels in headers", () => {
      render(<PermissionMatrix currentRole="editor" />);

      expect(screen.getByText("Level 1")).toBeInTheDocument();
      expect(screen.getByText("Level 2")).toBeInTheDocument();
      expect(screen.getByText("Level 3")).toBeInTheDocument();
      expect(screen.getByText("Level 4")).toBeInTheDocument();
    });

    it("renders resource groups", () => {
      render(<PermissionMatrix currentRole="editor" />);

      expect(screen.getByText("Campaigns")).toBeInTheDocument();
      expect(screen.getByText("Data Sources")).toBeInTheDocument();
      expect(screen.getByText("Templates")).toBeInTheDocument();
      expect(screen.getByText("Team Settings")).toBeInTheDocument();
    });

    it("renders permission names", () => {
      render(<PermissionMatrix currentRole="editor" />);

      expect(screen.getByText("View Campaigns")).toBeInTheDocument();
      expect(screen.getByText("Create Campaigns")).toBeInTheDocument();
      expect(screen.getByText("Delete Team")).toBeInTheDocument();
    });
  });

  describe("current role highlighting", () => {
    it("highlights the current role column header", () => {
      render(<PermissionMatrix currentRole="editor" />);

      const headers = screen.getAllByRole("columnheader");
      const editorHeader = headers.find((h) =>
        h.textContent?.includes("Editor")
      );

      expect(editorHeader).toHaveAttribute("data-current", "true");
    });

    it("shows 'You' indicator for current role", () => {
      render(<PermissionMatrix currentRole="admin" />);

      const headers = screen.getAllByRole("columnheader");
      const adminHeader = headers.find((h) => h.textContent?.includes("Admin"));

      expect(adminHeader?.textContent).toContain("You");
    });
  });

  describe("dangerous permissions filter", () => {
    it("renders filter checkbox", () => {
      render(<PermissionMatrix currentRole="editor" />);

      expect(
        screen.getByLabelText("Show dangerous permissions only")
      ).toBeInTheDocument();
    });

    it("shows all permissions by default", () => {
      render(<PermissionMatrix currentRole="editor" />);

      // Should have safe permissions visible
      expect(screen.getByText("View Campaigns")).toBeInTheDocument();
      expect(screen.getByText("Create Campaigns")).toBeInTheDocument();
    });

    it("filters to dangerous permissions only when checked", async () => {
      const user = userEvent.setup();
      render(<PermissionMatrix currentRole="editor" />);

      const checkbox = screen.getByLabelText("Show dangerous permissions only");
      await user.click(checkbox);

      // Dangerous permissions should be visible
      expect(screen.getByText("Delete Team")).toBeInTheDocument();
      expect(screen.getByText("Manage Billing")).toBeInTheDocument();
      expect(screen.getByText("Remove Members")).toBeInTheDocument();

      // Safe permissions should not be visible
      expect(screen.queryByText("View Campaigns")).not.toBeInTheDocument();
    });
  });

  describe("permission cells", () => {
    it("renders permission cells with correct allowed state", () => {
      render(<PermissionMatrix currentRole="editor" />);

      // Find the View Campaigns row
      const viewCampaignsRow = screen
        .getByText("View Campaigns")
        .closest("tr");
      expect(viewCampaignsRow).toBeTruthy();

      // All roles should have check icons for View Campaigns
      const cells = within(viewCampaignsRow!).getAllByTestId("permission-cell");
      cells.forEach((cell) => {
        expect(cell).toHaveAttribute("data-allowed", "true");
      });
    });

    it("shows danger badge for dangerous permissions", () => {
      render(<PermissionMatrix currentRole="owner" />);

      // Find the Delete Team row
      const deleteTeamRow = screen.getByText("Delete Team").closest("tr");
      expect(deleteTeamRow).toBeTruthy();

      // Should have a danger badge
      expect(
        within(deleteTeamRow!).getByTestId("danger-badge")
      ).toBeInTheDocument();
    });
  });

  describe("showDangerousOnly prop", () => {
    it("respects initial showDangerousOnly prop", () => {
      render(<PermissionMatrix currentRole="editor" showDangerousOnly />);

      // Dangerous permissions should be visible
      expect(screen.getByText("Delete Team")).toBeInTheDocument();

      // Safe permissions should not be visible
      expect(screen.queryByText("View Campaigns")).not.toBeInTheDocument();
    });
  });
});
