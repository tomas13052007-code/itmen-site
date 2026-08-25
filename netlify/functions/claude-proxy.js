exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const bodyData = JSON.parse(event.body || "{}");
    const { prompt, image } = bodyData;

    // 1. RASMLI SO'ROV (Gemini 1.5 Flash ishlatiladi)
    if (image && image.data && image.mediaType) {
      const geminiKey = process.env.GEMINI_API_KEY;
      if (!geminiKey) {
        return { statusCode: 500, body: JSON.stringify({ error: "GEMINI_API_KEY topilmadi." }) };
      }

      const parts = [
        { text: prompt || "Ushbu ovqatning kaloriyasi (kkal), oqsillari (g), uglevodlari (g) va yog'larini (g) aniqlab ber." },
        { inline_data: { mime_type: image.mediaType, data: image.data } }
      ];

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts }] })
        }
      );

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          content: [{ type: "text", text: rawText }],
          text: rawText,
          result: rawText,
          candidates: data.candidates
        })
      };
    } 
    
    // 2. ODDY MATNLI SO'ROV / AI REJA (Groq Llama 3.1 ishlatiladi)
    else {
      const groqKey = process.env.GROQ_API_KEY;
      if (!groqKey) {
        return { statusCode: 500, body: JSON.stringify({ error: "GROQ_API_KEY topilmadi." }) };
      }

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${groqKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: prompt || "Fitnes reja tuzib ber." }]
        })
      });

      const data = await response.json();
      const textResponse = data.choices?.[0]?.message?.content || "";

      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          content: [{ type: "text", text: textResponse }],
          text: textResponse,
          result: textResponse
        })
      };
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
