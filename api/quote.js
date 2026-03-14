import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();

export default async function handler(req, res) {
  const { ticker } = req.query;
  if (!ticker) return res.status(400).json({ error: 'ticker required' });

  try {
    const quote = await yahooFinance.quote(ticker);
    res.json({
      ticker:    quote.symbol,
      name:      quote.longName || quote.shortName,
      price:     quote.regularMarketPrice,
      change:    quote.regularMarketChange,
      pct:       quote.regularMarketChangePercent,
      open:      quote.regularMarketOpen,
      high:      quote.regularMarketDayHigh,
      low:       quote.regularMarketDayLow,
      vol:       quote.regularMarketVolume?.toLocaleString(),
      mktCap:    quote.marketCap,
      pe:        quote.trailingPE ?? null,
      eps:       quote.epsTrailingTwelveMonths ?? null,
      w52h:      quote.fiftyTwoWeekHigh,
      w52l:      quote.fiftyTwoWeekLow,
      sector:    quote.sector ?? "—",
      beta:      quote.beta ?? null,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}