export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!process.env.TELEGRAM_SETUP_SECRET || req.headers.authorization !== `Bearer ${process.env.TELEGRAM_SETUP_SECRET}`) {
    return res.status(401).json({ ok: false });
  }
  const base = process.env.APP_URL?.replace(/\/$/, '');
  const webhookUrl = `${base}/api/telegram`;
  const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/setWebhook`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: webhookUrl, allowed_updates: ['message', 'callback_query'] }),
  });
  const result = await response.json();
  if (!response.ok || !result.ok) return res.status(502).json(result);
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/setMyCommands`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ commands: [
      { command: 'start', description: 'Open Telecast' },
      { command: 'products', description: 'View products and memberships' },
      { command: 'access', description: 'Check paid access' },
      { command: 'referral', description: 'Get your referral link' },
      { command: 'help', description: 'Show help' },
    ] }),
  });
  return res.status(200).json({ ok: true, webhookUrl });
}
