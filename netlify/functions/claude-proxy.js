// Netlify Function: securely proxies requests to the Google Gemini API (free tier).
// The API key lives only here (as an environment variable on Netlify),
// never in the browser code, so it can't be stolen from the site's source.

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "GEMINI_API_KEY sozlanmagan. Netlify saytida Environment Variables bo'limiga qo'shing." })
    };
  }

  try {
    const { prompt, image } = JSON.parse(event.body);

    const parts = [{ text: prompt }];
    if (image && image.data && image.mediaType) {
      parts.push({ inline_data: { mime_type: image.mediaType, data: image.data } });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts }] })
      }
    );

    const data = await response.json();

    if (data.error) {
      return { statusCode: 500, body: JSON.stringify({ error: data.error.message }) };
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
