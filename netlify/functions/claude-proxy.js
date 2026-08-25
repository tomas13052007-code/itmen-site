exports.handler = async function (event) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };
  if (event.httpMethod !== "POST") return { statusCode: 405, headers, body: "Method Not Allowed" };

  try {
    const bodyData = JSON.parse(event.body || "{}");
    const { prompt, image, file } = bodyData;
    const imgObj = image || file;

    // RASMLI SO'ROV (Gemini API - Strict JSON response)
    if (imgObj && (imgObj.data || typeof imgObj === 'string')) {
      const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      if (!geminiKey) return { statusCode: 500, headers, body: JSON.stringify({ error: "GEMINI_API_KEY sozlanmagan." }) };

      let rawBase64 = typeof imgObj === 'string' ? imgObj : imgObj.data;
      let mimeType = imgObj.mediaType || imgObj.mimeType || "image/jpeg";

      if (rawBase64.includes(";base64,")) {
        const parts = rawBase64.split(";base64,");
        mimeType = parts[0].replace("data:", "");
        rawBase64 = parts[1];
      }

      const promptText = `Ushbu ovqatni tahlil qil va FAQAT quyidagi JSON formatida javob ber, ortiqcha so'z yozma:
{"kkal": 550, "oqsil": 25, "uglevod": 45, "yog": 20, "text": "Burger: yuqori kaloriyali va oqsilga boy taom."}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: promptText },
                { inline_data: { mime_type: mimeType, data: rawBase64 } }
              ]
            }]
          })
        }
      );

      const data = await response.json();
      let textResult = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      // JSON formatini tozalash
      textResult = textResult.replace(/```json/g, "").replace(/```/g, "").trim();

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          content: [{ type: "text", text: textResult }],
          text: textResult,
          result: textResult
        })
      };
    }

    // MATNLI SO'ROV (Groq Llama 3.1)
    const groqKey = process.env.GROQ_API_KEY;
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${groqKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt || "Fitnes reja." }]
      })
    });

    const groqData = await groqRes.json();
    const groqText = groqData.choices?.[0]?.message?.content || "";

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        content: [{ type: "text", text: groqText }],
        text: groqText,
        result: groqText
      })
    };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
