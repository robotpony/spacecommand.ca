const request = require('supertest');
const app = require('../bin/server');

describe('Server', () => {
  test('should serve HTML on root path', async () => {
    const response = await request(app)
      .get('/')
      .expect(200);
    
    expect(response.text).toContain('<title>SpaceCommand.ca</title>');
  });

  test('should respond with server running message on API status', async () => {
    const response = await request(app)
      .get('/api/status')
      .expect(200);
    
    expect(response.text).toBe('SpaceCommand.ca Server Running');
  });

  test('should respond with health status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);
    
    expect(response.body.status).toBe('OK');
    expect(response.body.timestamp).toBeDefined();
  });
});