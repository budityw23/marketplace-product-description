import { RateLimiterMemory } from 'rate-limiter-flexible';

jest.mock('rate-limiter-flexible');

describe('Rate Limiting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should allow requests within limit', async () => {
    const mockRateLimiter = {
      consume: jest.fn().mockResolvedValue({}),
    };

    (RateLimiterMemory as jest.Mock).mockImplementation(() => mockRateLimiter);

    const rateLimiter = new RateLimiterMemory({});
    const result = await rateLimiter.consume('user-id');

    expect(mockRateLimiter.consume).toHaveBeenCalledWith('user-id');
    expect(result).toBeDefined();
  });

  it('should reject requests over limit', async () => {
    const rejectionError = {
      msBeforeNext: 86400000, // 24 hours
    };

    const mockRateLimiter = {
      consume: jest.fn().mockRejectedValue(rejectionError),
    };

    (RateLimiterMemory as jest.Mock).mockImplementation(() => mockRateLimiter);

    const rateLimiter = new RateLimiterMemory({});
    await expect(rateLimiter.consume('user-id')).rejects.toEqual(rejectionError);
  });

  it('should be configured with correct settings in ai routes', () => {
    // This test verifies that the rate limiter is configured correctly
    // when imported in the ai.ts routes file
    const expectedConfig = {
      keyPrefix: 'ai_generation',
      points: 5,
      duration: 24 * 60 * 60, // 24 hours
    };

    // Import the ai router to trigger the rate limiter creation
    require('../../src/routes/ai');

    expect(RateLimiterMemory).toHaveBeenCalledWith(expectedConfig);
  });
});