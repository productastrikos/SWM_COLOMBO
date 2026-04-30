const serverless = require('serverless-http');
const { app } = require('../../server/index');

const handler = serverless(app);

exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const rawPath = event.path || '';
  const normalizedPath = rawPath.startsWith('/.netlify/functions/api')
    ? `/api${rawPath.slice('/.netlify/functions/api'.length) || ''}`
    : rawPath.startsWith('/api')
      ? rawPath
      : `/api${rawPath}`;

  const normalizedEvent = {
    ...event,
    path: normalizedPath,
    rawUrl: event.rawUrl
      ? event.rawUrl.replace('/.netlify/functions/api', '/api')
      : event.rawUrl,
  };

  return handler(normalizedEvent, context);
};