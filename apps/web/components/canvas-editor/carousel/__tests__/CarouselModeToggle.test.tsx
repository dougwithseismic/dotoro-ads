import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CarouselModeToggle } from '../CarouselModeToggle';

describe('CarouselModeToggle', () => {
  const defaultProps = {
    mode: 'manual' as const,
    onModeChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders both mode options', () => {
    render(<CarouselModeToggle {...defaultProps} />);

    expect(screen.getByText('Data-Driven')).toBeInTheDocument();
    expect(screen.getByText('Manual')).toBeInTheDocument();
  });

  it('marks current mode as active', () => {
    render(<CarouselModeToggle {...defaultProps} mode="manual" />);

    const manualButton = screen.getByRole('radio', { name: /manual/i });
    expect(manualButton).toHaveAttribute('aria-checked', 'true');

    const dataDrivenButton = screen.getByRole('radio', { name: /data-driven/i });
    expect(dataDrivenButton).toHaveAttribute('aria-checked', 'false');
  });

  it('calls onModeChange when clicking different mode', () => {
    render(<CarouselModeToggle {...defaultProps} mode="manual" />);

    const dataDrivenButton = screen.getByRole('radio', { name: /data-driven/i });
    fireEvent.click(dataDrivenButton);

    expect(defaultProps.onModeChange).toHaveBeenCalledWith('data-driven');
  });

  it('does not call onModeChange when clicking same mode', () => {
    render(<CarouselModeToggle {...defaultProps} mode="manual" />);

    const manualButton = screen.getByRole('radio', { name: /manual/i });
    fireEvent.click(manualButton);

    expect(defaultProps.onModeChange).not.toHaveBeenCalled();
  });

  it('shows warning dialog when switching with existing content', () => {
    render(
      <CarouselModeToggle
        {...defaultProps}
        mode="manual"
        hasExistingContent={true}
      />
    );

    const dataDrivenButton = screen.getByRole('radio', { name: /data-driven/i });
    fireEvent.click(dataDrivenButton);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/switch carousel mode/i)).toBeInTheDocument();
  });

  it('confirms mode change after warning', () => {
    render(
      <CarouselModeToggle
        {...defaultProps}
        mode="manual"
        hasExistingContent={true}
      />
    );

    // Trigger warning
    const dataDrivenButton = screen.getByRole('radio', { name: /data-driven/i });
    fireEvent.click(dataDrivenButton);

    // Confirm
    const confirmButton = screen.getByRole('button', { name: /switch mode/i });
    fireEvent.click(confirmButton);

    expect(defaultProps.onModeChange).toHaveBeenCalledWith('data-driven');
  });

  it('cancels mode change on warning cancel', () => {
    render(
      <CarouselModeToggle
        {...defaultProps}
        mode="manual"
        hasExistingContent={true}
      />
    );

    // Trigger warning
    const dataDrivenButton = screen.getByRole('radio', { name: /data-driven/i });
    fireEvent.click(dataDrivenButton);

    // Cancel
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(defaultProps.onModeChange).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not switch modes when disabled', () => {
    render(<CarouselModeToggle {...defaultProps} mode="manual" disabled={true} />);

    const dataDrivenButton = screen.getByRole('radio', { name: /data-driven/i });
    expect(dataDrivenButton).toBeDisabled();

    fireEvent.click(dataDrivenButton);
    expect(defaultProps.onModeChange).not.toHaveBeenCalled();
  });

  it('displays mode descriptions', () => {
    render(<CarouselModeToggle {...defaultProps} />);

    expect(screen.getByText(/one template, data drives cards/i)).toBeInTheDocument();
    expect(screen.getByText(/design each card individually/i)).toBeInTheDocument();
  });
});
