import { apiClient } from '../config/apiConfig';

describe('apiClient helpers', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    jest.clearAllMocks();
  });

  test('adds Content-Type header and parses JSON on success', async () => {
    const mockJson = { ok: true };
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockJson,
    });

    const result = await apiClient.get('/test');

    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/test'), expect.objectContaining({
      method: 'GET',
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      credentials: 'include',
    }));
    expect(result).toEqual(mockJson);
  });

  test('throws with message when response not ok and body has message', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Bad' }),
    });

    await expect(apiClient.get('/fail')).rejects.toThrow('Bad');
  });

  test('throws generic HTTP status when parsing error body fails', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => { throw new Error('parse fail'); },
      status: 500,
    });

    await expect(apiClient.get('/fail2')).rejects.toThrow('HTTP 500');
  });
});
