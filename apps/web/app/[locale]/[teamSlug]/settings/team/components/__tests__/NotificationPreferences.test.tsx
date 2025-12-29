import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotificationPreferences } from "../NotificationPreferences";

describe("NotificationPreferences", () => {
  const defaultProps = {
    emailDigest: false,
    slackWebhook: "",
    onEmailDigestChange: vi.fn().mockResolvedValue(undefined),
    onSlackWebhookChange: vi.fn().mockResolvedValue(undefined),
    canEdit: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders the notification preferences component", () => {
      render(<NotificationPreferences {...defaultProps} />);

      expect(screen.getByTestId("notification-preferences")).toBeInTheDocument();
    });

    it("displays email digest toggle", () => {
      render(<NotificationPreferences {...defaultProps} />);

      expect(screen.getByRole("checkbox", { name: /email digest/i })).toBeInTheDocument();
    });

    it("displays slack webhook input", () => {
      render(<NotificationPreferences {...defaultProps} />);

      expect(screen.getByLabelText(/slack webhook/i)).toBeInTheDocument();
    });

    it("shows correct initial state for email digest toggle", () => {
      render(<NotificationPreferences {...defaultProps} emailDigest={true} />);

      expect(screen.getByRole("checkbox", { name: /email digest/i })).toBeChecked();
    });

    it("shows correct initial value for slack webhook", () => {
      render(
        <NotificationPreferences
          {...defaultProps}
          slackWebhook="https://hooks.slack.com/services/T00/B00/xxx"
        />
      );

      expect(screen.getByLabelText(/slack webhook/i)).toHaveValue(
        "https://hooks.slack.com/services/T00/B00/xxx"
      );
    });
  });

  describe("email digest toggle", () => {
    it("calls onEmailDigestChange when toggled on", async () => {
      render(<NotificationPreferences {...defaultProps} emailDigest={false} />);

      const toggle = screen.getByRole("checkbox", { name: /email digest/i });
      fireEvent.click(toggle);

      await waitFor(() => {
        expect(defaultProps.onEmailDigestChange).toHaveBeenCalledWith(true);
      });
    });

    it("calls onEmailDigestChange when toggled off", async () => {
      render(<NotificationPreferences {...defaultProps} emailDigest={true} />);

      const toggle = screen.getByRole("checkbox", { name: /email digest/i });
      fireEvent.click(toggle);

      await waitFor(() => {
        expect(defaultProps.onEmailDigestChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe("slack webhook", () => {
    it("calls onSlackWebhookChange when save button is clicked", async () => {
      render(<NotificationPreferences {...defaultProps} />);

      const input = screen.getByLabelText(/slack webhook/i);
      fireEvent.change(input, {
        target: { value: "https://hooks.slack.com/services/T00/B00/xxx" },
      });

      const saveButton = screen.getByRole("button", { name: /save webhook/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(defaultProps.onSlackWebhookChange).toHaveBeenCalledWith(
          "https://hooks.slack.com/services/T00/B00/xxx"
        );
      });
    });

    it("validates slack webhook URL format", async () => {
      render(<NotificationPreferences {...defaultProps} />);

      const input = screen.getByLabelText(/slack webhook/i);
      fireEvent.change(input, { target: { value: "invalid-url" } });

      const saveButton = screen.getByRole("button", { name: /save webhook/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(/invalid slack webhook/i);
      });

      expect(defaultProps.onSlackWebhookChange).not.toHaveBeenCalled();
    });

    it("accepts valid Slack webhook URL", async () => {
      render(<NotificationPreferences {...defaultProps} />);

      const input = screen.getByLabelText(/slack webhook/i);
      fireEvent.change(input, {
        target: { value: "https://hooks.slack.com/services/T00000/B00000/xxxxxxx" },
      });

      const saveButton = screen.getByRole("button", { name: /save webhook/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(defaultProps.onSlackWebhookChange).toHaveBeenCalled();
      });
    });

    it("allows empty webhook URL to clear the setting", async () => {
      render(
        <NotificationPreferences
          {...defaultProps}
          slackWebhook="https://hooks.slack.com/services/T00/B00/xxx"
        />
      );

      const input = screen.getByLabelText(/slack webhook/i);
      fireEvent.change(input, { target: { value: "" } });

      const saveButton = screen.getByRole("button", { name: /save webhook/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(defaultProps.onSlackWebhookChange).toHaveBeenCalledWith("");
      });
    });
  });

  describe("permission control", () => {
    it("disables email digest toggle when canEdit is false", () => {
      render(<NotificationPreferences {...defaultProps} canEdit={false} />);

      expect(screen.getByRole("checkbox", { name: /email digest/i })).toBeDisabled();
    });

    it("disables slack webhook input when canEdit is false", () => {
      render(<NotificationPreferences {...defaultProps} canEdit={false} />);

      expect(screen.getByLabelText(/slack webhook/i)).toBeDisabled();
    });

    it("hides save button when canEdit is false", () => {
      render(<NotificationPreferences {...defaultProps} canEdit={false} />);

      expect(screen.queryByRole("button", { name: /save webhook/i })).not.toBeInTheDocument();
    });
  });

  describe("loading states", () => {
    it("shows loading state when email digest is saving", async () => {
      const slowSave = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      render(<NotificationPreferences {...defaultProps} onEmailDigestChange={slowSave} />);

      const toggle = screen.getByRole("checkbox", { name: /email digest/i });
      fireEvent.click(toggle);

      expect(await screen.findByTestId("email-digest-saving")).toBeInTheDocument();
    });

    it("shows loading state when slack webhook is saving", async () => {
      const slowSave = vi.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      render(<NotificationPreferences {...defaultProps} onSlackWebhookChange={slowSave} />);

      const input = screen.getByLabelText(/slack webhook/i);
      fireEvent.change(input, {
        target: { value: "https://hooks.slack.com/services/T00/B00/xxx" },
      });

      const saveButton = screen.getByRole("button", { name: /save webhook/i });
      fireEvent.click(saveButton);

      expect(await screen.findByTestId("slack-saving")).toBeInTheDocument();
    });
  });

  describe("error handling", () => {
    it("shows error when email digest save fails", async () => {
      const failingSave = vi.fn().mockRejectedValue(new Error("Save failed"));
      render(<NotificationPreferences {...defaultProps} onEmailDigestChange={failingSave} />);

      const toggle = screen.getByRole("checkbox", { name: /email digest/i });
      fireEvent.click(toggle);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(/save failed/i);
      });
    });

    it("shows error when slack webhook save fails", async () => {
      const failingSave = vi.fn().mockRejectedValue(new Error("Save failed"));
      render(<NotificationPreferences {...defaultProps} onSlackWebhookChange={failingSave} />);

      const input = screen.getByLabelText(/slack webhook/i);
      fireEvent.change(input, {
        target: { value: "https://hooks.slack.com/services/T00/B00/xxx" },
      });

      const saveButton = screen.getByRole("button", { name: /save webhook/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByRole("alert")).toHaveTextContent(/save failed/i);
      });
    });
  });

  describe("descriptions", () => {
    it("shows description for email digest", () => {
      render(<NotificationPreferences {...defaultProps} />);

      expect(screen.getByText(/weekly summary/i)).toBeInTheDocument();
    });

    it("shows description for slack webhook", () => {
      render(<NotificationPreferences {...defaultProps} />);

      expect(screen.getByText(/real-time notifications/i)).toBeInTheDocument();
    });
  });

  describe("accessibility", () => {
    it("email digest toggle is properly labeled", () => {
      render(<NotificationPreferences {...defaultProps} />);

      expect(screen.getByRole("checkbox", { name: /email digest/i })).toBeInTheDocument();
    });

    it("slack webhook input has proper label", () => {
      render(<NotificationPreferences {...defaultProps} />);

      expect(screen.getByLabelText(/slack webhook/i)).toBeInTheDocument();
    });
  });
});
