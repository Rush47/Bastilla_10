// AI Studio's preview proxy can replace upstream 5xx JSON with an HTML error page.
// The first-party UI opts into an application error envelope; external clients keep HTTP errors.
export function sendChatError(req, res, status, error) {
  const uiEnvelope = req.get('X-Bastilla-UI') === '1' && status >= 500;
  res.setHeader('Cache-Control', 'no-store');
  return res.status(uiEnvelope ? 200 : status).json({ success: false, error, status });
}
