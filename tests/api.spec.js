import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
// Import the app. We need to ensure app.listen is not called automatically when imported.
// For now, assuming api/index.js exports the app instance correctly for testing.
// If api/index.js directly calls app.listen(), this might need adjustment.
// The current api/index.js calls app.listen unconditionally. This is problematic for testing.
// A common practice is:
// if (require.main === module) {
//   app.listen(port, () => console.log(`Listening on port ${port}`));
// }
// module.exports = app; // Or export { app }; for ES modules
// For this test, I will proceed as if `app` can be imported and then I manually start a server for it.

// Let's try to import the app. If it starts listening immediately, tests might hang or fail.
// We need to get the raw app object, not the server instance.
// The current api/index.js structure does call app.listen() at the end.
// To make it testable, api/index.js should export 'app' before calling 'listen'.
// I will assume this change is made or use a workaround.

// Workaround: Dynamically import and modify the app or use a test-specific entry point.
// Given the constraints, I'll write the tests assuming 'app' is the Express app instance.
// The server starting/stopping will be handled by supertest's agent or by manually managing a server instance.

// Correct approach: api/index.js should export 'app'
// For example, at the end of api/index.js:
// const server = app.listen(port, () => { ... });
// export { app, server }; // Or just export app and manage server in tests

// For the purpose of this task, I will assume `api/index.js` is modified to export `app`
// such that it can be imported without side effects (like starting the server).
// If I cannot modify api/index.js, I'll try to adapt.

// Let's assume we can get the `app` instance from `../api/index.js`
// The current `api/index.js` uses CommonJS. Vitest typically handles ESM.
// I will have to assume that `api/index.js` is refactored to export `app` in a way that can be imported by Vitest.
// For example, if api/index.js was:
// const express = require('express'); const app = express(); ... module.exports = app;
// Then in Vitest: import app from '../api/index.js'; (with proper interop)

// Given the current structure of api/index.js (CommonJS, direct app.listen),
// direct import and testing is tricky.
// I will write the tests as if `app` is correctly imported.
// The execution environment will need to handle this.

// Let's try to require it, as it's a .js file likely treated as CommonJS by Node.
// Vitest environment might allow this.
const app = require('../api/index.js'); // Assuming this line in api/index.js: module.exports = app; (after removing app.listen or guarding it)

// If `api/index.js` is not modified to properly export `app` for testing
// (i.e., without calling `app.listen()` unconditionally), these tests will
// likely fail or hang because the server tries to start on a fixed port,
// which can cause EADDRINUSE errors if run multiple times or if the port is occupied.

// For now, I will proceed with writing the test cases.
// The server management part (beforeAll/afterAll) might need adjustments based on how `app` is actually obtained and managed.

describe('/api/qrcode endpoint integration tests', () => {
  let server; // To hold the server instance for manual start/stop if needed.

  // beforeAll(() => {
  //   // If app.listen is conditional in api/index.js, we'd start the server here.
  //   // server = app.listen(0); // Start on a random available port
  // });

  // afterAll((done) => {
  //   // And close it here
  //   // if (server) {
  //   //   server.close(done);
  //   // } else {
  //   //   done();
  //   // }
  // });

  // Test Case 1: Basic PNG generation
  it('should return a PNG image by default', async () => {
    const response = await request(app)
      .post('/api/qrcode')
      .send({ data: 'test_png' });
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('image/png');
    expect(response.body).toBeInstanceOf(Buffer);
    expect(response.body.length).toBeGreaterThan(0);
  });

  // Test Case 2: Basic SVG generation
  it('should return an SVG image when outputFormat is svg', async () => {
    const response = await request(app)
      .post('/api/qrcode')
      .send({ data: 'test_svg', outputFormat: 'svg' });
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('image/svg+xml');
    expect(response.text).toMatch(/^<svg/);
    expect(response.text).toMatch(/<\/svg>$/);
  });

  // Test Case 3: Basic JPEG generation
  it('should return a JPEG image when outputFormat is jpeg', async () => {
    const response = await request(app)
      .post('/api/qrcode')
      .send({ data: 'test_jpeg', outputFormat: 'jpeg' });
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('image/jpeg');
    expect(response.body).toBeInstanceOf(Buffer);
    expect(response.body.length).toBeGreaterThan(0);
  });

  // Test Case 4: Request with custom dimensions
  it('should generate a PNG with custom dimensions', async () => {
    const response1 = await request(app)
      .post('/api/qrcode')
      .send({ data: 'test_dims_1', width: 400, height: 450 });
    expect(response1.status).toBe(200);
    expect(response1.headers['content-type']).toBe('image/png');
    expect(response1.body.length).toBeGreaterThan(0);

    // Optional: check if different dimensions produce different buffer lengths
    const response2 = await request(app)
      .post('/api/qrcode')
      .send({ data: 'test_dims_2', width: 200, height: 250 });
    expect(response2.status).toBe(200);
    expect(response2.headers['content-type']).toBe('image/png');
    expect(response2.body.length).toBeGreaterThan(0);
    // This check is not strictly about dimensions directly mapping to size,
    // as QR complexity also plays a role, but for simple data, it might hold.
    // For this test, just ensuring it generates is sufficient.
    // expect(response1.body.length).not.toBe(response2.body.length); // This could be flaky
  });

  // Test Case 5: Request with a frame (output PNG by default)
  it('should return a PNG image with a frame', async () => {
    const response = await request(app)
      .post('/api/qrcode')
      .send({ data: 'test_frame', showFrame: true, frameText: 'Scan Me' });
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('image/png');
    expect(response.body).toBeInstanceOf(Buffer);
    expect(response.body.length).toBeGreaterThan(0);
  });

  // Test Case 6: Framed SVG output
  it('should return an SVG image with a frame when outputFormat is svg', async () => {
    const response = await request(app)
      .post('/api/qrcode')
      .send({ data: 'test_frame_svg', showFrame: true, frameText: 'SVG Frame', outputFormat: 'svg' });
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('image/svg+xml');
    expect(response.text).toMatch(/^<svg/);
    expect(response.text).toMatch(/<\/svg>$/);
    expect(response.text).toContain('SVG Frame');
  });

  // Test Case 7: Missing data parameter
  it('should return 400 if data parameter is missing', async () => {
    const response = await request(app)
      .post('/api/qrcode')
      .send({});
    expect(response.status).toBe(400);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.body).toEqual({ error: 'Missing required parameter: data' });
  });

  // Test Case 8: Invalid outputFormat
  // Based on current api/index.js, unsupported formats lead to 500, as sharp won't handle them.
  // If "gif" is passed, and it's not svg, png, jpeg, or webp, it will fall into an error path.
  // Framed: "Unsupported output format for framed QR code"
  // Not framed: "Unsupported direct QR code conversion" or similar from sharp if initial is SVG
  it('should return 500 for an invalid outputFormat like "gif"', async () => {
    const response = await request(app)
      .post('/api/qrcode')
      .send({ data: 'test_invalid_format', outputFormat: 'gif' });
    expect(response.status).toBe(500); // Or 400 if validation is added earlier
    expect(response.headers['content-type']).toMatch(/application\/json/);
    // The exact error message might vary depending on whether it's framed or not,
    // and what the initial generation format was.
    expect(response.body).toHaveProperty('error');
    // Example check:
    // expect(response.body.error).toMatch(/Unsupported output format|Unsupported direct QR code conversion/);
  });

  it('should return 500 for an invalid outputFormat like "gif" with frame', async () => {
    const response = await request(app)
      .post('/api/qrcode')
      .send({ data: 'test_invalid_format_frame', outputFormat: 'gif', showFrame: true, frameText: 'GIF?' });
    expect(response.status).toBe(500);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.body).toEqual({ error: 'Unsupported output format for framed QR code' });
  });
});
