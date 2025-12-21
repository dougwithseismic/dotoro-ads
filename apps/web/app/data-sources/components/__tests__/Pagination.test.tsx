import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Pagination } from "../Pagination";

describe("Pagination", () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 5,
    totalItems: 50,
    pageSize: 10,
    onPageChange: vi.fn(),
    onPageSizeChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders pagination controls", () => {
    render(<Pagination {...defaultProps} />);

    expect(screen.getByRole("button", { name: /previous/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
  });

  it("displays 'Showing X-Y of Z' text correctly for first page", () => {
    render(<Pagination {...defaultProps} />);

    expect(screen.getByText(/showing 1-10 of 50/i)).toBeInTheDocument();
  });

  it("displays 'Showing X-Y of Z' text correctly for middle page", () => {
    render(<Pagination {...defaultProps} currentPage={3} />);

    expect(screen.getByText(/showing 21-30 of 50/i)).toBeInTheDocument();
  });

  it("displays 'Showing X-Y of Z' text correctly for last page with partial results", () => {
    render(<Pagination {...defaultProps} currentPage={5} totalItems={47} />);

    // Page 5 with 10 per page: 41-47 of 47
    expect(screen.getByText(/showing 41-47 of 47/i)).toBeInTheDocument();
  });

  it("disables Previous button on first page", () => {
    render(<Pagination {...defaultProps} currentPage={1} />);

    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
  });

  it("disables Next button on last page", () => {
    render(<Pagination {...defaultProps} currentPage={5} />);

    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  });

  it("enables both buttons on middle pages", () => {
    render(<Pagination {...defaultProps} currentPage={3} />);

    expect(screen.getByRole("button", { name: /previous/i })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: /next/i })).not.toBeDisabled();
  });

  it("calls onPageChange with previous page when Previous is clicked", async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();

    render(<Pagination {...defaultProps} currentPage={3} onPageChange={onPageChange} />);

    await user.click(screen.getByRole("button", { name: /previous/i }));

    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("calls onPageChange with next page when Next is clicked", async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();

    render(<Pagination {...defaultProps} currentPage={2} onPageChange={onPageChange} />);

    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it("renders page size selector with options 10, 25, 50", () => {
    render(<Pagination {...defaultProps} />);

    const selector = screen.getByRole("combobox", { name: /rows per page/i });
    expect(selector).toBeInTheDocument();

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveTextContent("10");
    expect(options[1]).toHaveTextContent("25");
    expect(options[2]).toHaveTextContent("50");
  });

  it("calls onPageSizeChange when page size is changed", async () => {
    const onPageSizeChange = vi.fn();
    const user = userEvent.setup();

    render(<Pagination {...defaultProps} onPageSizeChange={onPageSizeChange} />);

    const selector = screen.getByRole("combobox", { name: /rows per page/i });
    await user.selectOptions(selector, "25");

    expect(onPageSizeChange).toHaveBeenCalledWith(25);
  });

  it("shows current page size as selected", () => {
    render(<Pagination {...defaultProps} pageSize={25} />);

    const selector = screen.getByRole("combobox", { name: /rows per page/i }) as HTMLSelectElement;
    expect(selector.value).toBe("25");
  });

  it("hides pagination when there is only one page", () => {
    const { container } = render(
      <Pagination {...defaultProps} totalPages={1} totalItems={5} />
    );

    // Pagination controls should not be rendered
    expect(screen.queryByRole("button", { name: /previous/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /next/i })).not.toBeInTheDocument();
    // But page size selector should still be visible
    expect(screen.getByRole("combobox", { name: /rows per page/i })).toBeInTheDocument();
  });

  it("shows only 'Showing X of Z' when all items fit on one page", () => {
    render(<Pagination {...defaultProps} totalPages={1} totalItems={5} pageSize={10} />);

    expect(screen.getByText(/showing 1-5 of 5/i)).toBeInTheDocument();
  });

  it("has accessible labels for navigation", () => {
    render(<Pagination {...defaultProps} />);

    expect(screen.getByRole("navigation", { name: /pagination/i })).toBeInTheDocument();
  });
});
