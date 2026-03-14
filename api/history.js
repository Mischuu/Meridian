/**
 * api/history.js — Vercel Serverless Function
 * Fetches 30-day daily price history from Yahoo Finance
 * Used for the price charts on stock detail and watchlist cards
 *
 * Usage: /api/history?ticker=AAPL
 */
import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();

export default async function handler(req, res) {
  const { ticker } = req.query;
  if (!ticker) return res.status(400).json({ error: 'ticker required' });

  try {
    const end   = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 31);

    const result = await yahooFinance.historical(ticker, {
      period1: start.toISOString().split('T')[0],
      period2: end.toISOString().split('T')[0],
      interval: '1d',
    });

    const history = result.map(d => ({
      date:  new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      price: +d.close.toFixed(2),
    }));

    res.json(history);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}