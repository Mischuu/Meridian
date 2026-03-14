import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();

export default async function handler(req, res) {
  const { ticker } = req.query;
  if (!ticker) return res.status(400).json({ error: 'ticker required' });

  try {
    const result = await yahooFinance.search(ticker, { newsCount: 5 });
    const news = (result.news || []).map((item, i) => ({
      id: i,
      title: item.title,
      source: item.publisher,
      time: new Date(item.providerPublishTime * 1000).toLocaleDateString(),
      summary: item.title, // Yahoo free tier doesn't give full body
      url: item.link,
    }));
    res.json(news);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
