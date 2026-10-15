import { HttpConnector } from './http.connector';

describe('HttpConnector', () => {
  let connector: HttpConnector;
  let fetchMock: jest.SpyInstance;

  beforeEach(() => {
    connector = new HttpConnector();
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it('should return error when URL is missing', async () => {
    const action = connector.getAction('request')!;
    const result = await action.execute({ input: {} });

    expect(result.success).toBe(false);
    expect(result.error).toContain('URL is required');
  });

  it('should return error for invalid URL syntax', async () => {
    const action = connector.getAction('request')!;
    const result = await action.execute({ input: { url: 'not-a-valid-url' } });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid URL');
  });

  it('should execute GET request with query parameters and parse JSON response', async () => {
    const mockResponseData = { items: [1, 2, 3], count: 3 };
    const mockHeaders = new Headers({ 'content-type': 'application/json' });

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: mockHeaders,
      text: jest.fn().mockResolvedValue(JSON.stringify(mockResponseData)),
    });

    const action = connector.getAction('request')!;
    const result = await action.execute({
      input: {
        url: 'https://api.example.com/items',
        method: 'GET',
        queryParams: { limit: 10, search: 'test' },
      },
    });

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/items?limit=10&search=test',
      expect.objectContaining({
        method: 'GET',
      }),
    );
    expect(result.data.status).toBe(200);
    expect(result.data.data).toEqual(mockResponseData);
  });

  it('should execute POST request with body and Bearer token auth', async () => {
    const mockHeaders = new Headers({ 'content-type': 'application/json' });
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 201,
      statusText: 'Created',
      headers: mockHeaders,
      text: jest.fn().mockResolvedValue(JSON.stringify({ id: 'item_123' })),
    });

    const action = connector.getAction('request')!;
    const result = await action.execute({
      input: {
        url: 'https://api.example.com/items',
        method: 'POST',
        body: { name: 'New Widget', price: 99 },
      },
      credentials: {
        token: 'secret-bearer-token',
      },
      connection: {
        id: 'conn_1',
        name: 'My API',
        authType: 'BEARER_TOKEN',
      },
    });

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.com/items',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer secret-bearer-token',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ name: 'New Widget', price: 99 }),
      }),
    );
  });

  it('should handle HTTP error status correctly (e.g. 404 Not Found)', async () => {
    const mockHeaders = new Headers({ 'content-type': 'application/json' });
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: mockHeaders,
      text: jest.fn().mockResolvedValue(JSON.stringify({ error: 'Item not found' })),
    });

    const action = connector.getAction('request')!;
    const result = await action.execute({
      input: {
        url: 'https://api.example.com/missing',
      },
    });

    expect(result.success).toBe(false);
    expect(result.data.status).toBe(404);
    expect(result.error).toContain('404 (Not Found)');
  });
});
