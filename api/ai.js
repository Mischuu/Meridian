export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
 
  const { system, message } = req.body;
 
  if (!message) {
    return res.status(400).json({ error: "message is required" });
  }
 
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not configured. Add it to your Vercel environment variables." });
  }
 
  try {
    
    const fullPrompt = system
      ? `${system}\n\n---\n\n${message}`
      : message;
 
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
            
              parts: [{ text: fullPrompt }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 1000,
            temperature: 0.4, // Lower = more factual, less creative — good for finance
          },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          ],
        }),
      }
    );
 
    const data = await response.json();
 
    // Handle Gemini API errors
    if (data.error) {
      console.error("Gemini API error:", data.error);
      return res.status(500).json({ error: data.error.message || "Gemini API error" });
    }
 
    
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
 
    if (!text) {
      // Check if content was blocked by safety filters
      const blockReason = data.candidates?.[0]?.finishReason;
      if (blockReason === "SAFETY") {
        return res.status(200).json({ text: "Response was filtered by safety settings. Please rephrase your question." });
      }
      return res.status(500).json({ error: "No response text received from Gemini" });
    }
 
    // Return in the same shape the frontend expects
    return res.status(200).json({ text });
 
  } catch (err) {
    console.error("ai.js handler error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
 
