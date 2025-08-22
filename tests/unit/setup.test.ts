// Basic setup test to verify the testing infrastructure works

describe('Project Setup', () => {
  it('should have TypeScript compilation working', () => {
    expect(true).toBe(true);
  });

  it('should have access to test utilities', () => {
    expect((global as any).testUtils).toBeDefined();
    expect(
      (global as any).testUtils.createMockVerificationRequest
    ).toBeDefined();
  });

  it('should be able to create mock verification request', () => {
    const mockRequest = (
      global as any
    ).testUtils.createMockVerificationRequest();

    expect(mockRequest).toBeDefined();
    expect(mockRequest.content).toBeDefined();
    expect(mockRequest.domain).toBe('legal');
    expect(mockRequest.urgency).toBe('medium');
  });
});
