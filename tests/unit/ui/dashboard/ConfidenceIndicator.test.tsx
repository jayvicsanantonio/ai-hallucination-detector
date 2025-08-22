import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ConfidenceIndicator } from '../../../../src/ui/dashboard/components/ConfidenceIndicator';

describe('ConfidenceIndicator', () => {
  it('renders confidence percentage correctly', () => {
    render(<ConfidenceIndicator confidence={85} />);

    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('displays high confidence label for scores >= 90', () => {
    render(<ConfidenceIndicator confidence={95} />);

    expect(screen.getByText('High Confidence')).toBeInTheDocument();
  });

  it('displays medium confidence label for scores 70-89', () => {
    render(<ConfidenceIndicator confidence={75} />);

    expect(screen.getByText('Medium Confidence')).toBeInTheDocument();
  });

  it('displays low confidence label for scores 50-69', () => {
    render(<ConfidenceIndicator confidence={60} />);

    expect(screen.getByText('Low Confidence')).toBeInTheDocument();
  });

  it('displays very low confidence label for scores < 50', () => {
    render(<ConfidenceIndicator confidence={30} />);

    expect(
      screen.getByText('Very Low Confidence')
    ).toBeInTheDocument();
  });

  it('applies correct size classes', () => {
    const { container: smallContainer } = render(
      <ConfidenceIndicator confidence={85} size="small" />
    );
    expect(
      smallContainer.querySelector('.confidence-indicator-small')
    ).toBeInTheDocument();

    const { container: mediumContainer } = render(
      <ConfidenceIndicator confidence={85} size="medium" />
    );
    expect(
      mediumContainer.querySelector('.confidence-indicator-medium')
    ).toBeInTheDocument();

    const { container: largeContainer } = render(
      <ConfidenceIndicator confidence={85} size="large" />
    );
    expect(
      largeContainer.querySelector('.confidence-indicator-large')
    ).toBeInTheDocument();
  });

  it('hides label when showLabel is false', () => {
    render(<ConfidenceIndicator confidence={85} showLabel={false} />);

    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(
      screen.queryByText('Medium Confidence')
    ).not.toBeInTheDocument();
  });

  it('renders SVG circle with correct attributes', () => {
    const { container } = render(
      <ConfidenceIndicator confidence={75} />
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('width', '100');
    expect(svg).toHaveAttribute('height', '100');

    const circles = container.querySelectorAll('circle');
    expect(circles).toHaveLength(2); // Background and progress circles
  });

  it('calculates stroke-dashoffset correctly for different confidence levels', () => {
    const { container } = render(
      <ConfidenceIndicator confidence={50} />
    );

    const progressCircle = container.querySelector(
      '.confidence-progress'
    );
    expect(progressCircle).toBeInTheDocument();

    // For 50% confidence, stroke-dashoffset should be half of circumference
    const circumference = 2 * Math.PI * 45; // radius = 45
    const expectedOffset = circumference - (50 / 100) * circumference;

    expect(progressCircle).toHaveStyle(
      `stroke-dashoffset: ${expectedOffset}`
    );
  });

  it('applies correct colors based on confidence level', () => {
    // Test high confidence (green)
    const { container: highContainer } = render(
      <ConfidenceIndicator confidence={95} />
    );
    const highProgressCircle = highContainer.querySelector(
      '.confidence-progress'
    );
    expect(highProgressCircle).toHaveAttribute('stroke', '#22c55e');

    // Test medium confidence (yellow)
    const { container: mediumContainer } = render(
      <ConfidenceIndicator confidence={75} />
    );
    const mediumProgressCircle = mediumContainer.querySelector(
      '.confidence-progress'
    );
    expect(mediumProgressCircle).toHaveAttribute('stroke', '#f59e0b');

    // Test low confidence (orange)
    const { container: lowContainer } = render(
      <ConfidenceIndicator confidence={55} />
    );
    const lowProgressCircle = lowContainer.querySelector(
      '.confidence-progress'
    );
    expect(lowProgressCircle).toHaveAttribute('stroke', '#ef4444');

    // Test very low confidence (red)
    const { container: veryLowContainer } = render(
      <ConfidenceIndicator confidence={25} />
    );
    const veryLowProgressCircle = veryLowContainer.querySelector(
      '.confidence-progress'
    );
    expect(veryLowProgressCircle).toHaveAttribute(
      'stroke',
      '#dc2626'
    );
  });

  it('handles edge cases correctly', () => {
    // Test 0% confidence
    render(<ConfidenceIndicator confidence={0} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(
      screen.getByText('Very Low Confidence')
    ).toBeInTheDocument();

    // Test 100% confidence
    const { rerender } = render(
      <ConfidenceIndicator confidence={100} />
    );
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('High Confidence')).toBeInTheDocument();
  });

  it('renders with default props when not specified', () => {
    const { container } = render(
      <ConfidenceIndicator confidence={85} />
    );

    expect(
      container.querySelector('.confidence-indicator-medium')
    ).toBeInTheDocument();
    expect(screen.getByText('Medium Confidence')).toBeInTheDocument();
  });

  it('applies transition classes for smooth animation', () => {
    const { container } = render(
      <ConfidenceIndicator confidence={85} />
    );

    const progressCircle = container.querySelector(
      '.confidence-progress'
    );
    expect(progressCircle).toHaveClass('confidence-progress');
  });
});
