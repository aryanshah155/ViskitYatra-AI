const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const parseNaturalLanguage = async (query) => {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      tools: [{ googleSearch: {} }]
    }, { apiVersion: 'v1beta' });

    let prompt = `You are "Alpha-01", the Strategic Mobility AI for ViksitYatra Mumbai.
    User Query: "${query}"

    Mission Protocol:
    1. Provide a direct, cyberpunk tactical response.
    2. USE GOOGLE SEARCH grounding to check for LIVE tactical data: road closures, local events, and weather alerts in Mumbai.
    3. Output valid JSON in a markdown code block (\`\`\`json \`\`\`).

    JSON Format Requirement:
    {
      "source": "string or 'current_location'",
      "destination": "string",
      "time": "HH:mm",
      "preferences": { "safety": "high", "speed": "med", "green": true },
      "intent": "navigation | policy_query | city_intel",
      "mode": "car | bike | walk | bus | train"   
    }`;

    console.log("==> Sending init prompt to Gemini", query);
    const chat = model.startChat({});
    let result = await chat.sendMessage(prompt);
    let finalText = result.response.text();
    console.log("==> Initial Response from Gemini:", finalText);

    let toolLogs = [];
    let parsedData = null;

    const extractJson = (text) => {
      const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
      if (match) {
        try { return JSON.parse(match[1] || match[0]); } catch (e) { }
      }
      return null;
    };

    parsedData = extractJson(finalText);

    // Interpret Pseudo-Tool Calling
    if (parsedData && parsedData.tool_call && parsedData.tool_call.name) {
      const call = parsedData.tool_call;
      toolLogs.push(`Executed Backend Pseudo-Tool [${call.name}]`);
      console.log(`==> Tool Requested: ${call.name} params:`, call);

      let resData = { status: "Ok" };

      try {
        if (call.name === "getUserAutoLocation") {
          resData = { lat: 19.1136, lng: 72.8465, status: "Server Geolocation Locked" };
        } else if (call.name === "callRapidApi") {
          toolLogs.push(`Initiating external RapidAPI HTTP request...`);
          console.log("==> Executing real Axios call to RapidAPI via proxy configuration.");
          const options = {
            method: 'GET',
            url: 'https://any-api.p.rapidapi.com/search',
            params: { query: call.query || 'Mumbai' },
            headers: {
              'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
              'X-RapidAPI-Host': process.env.RAPIDAPI_HOST || 'rapidapi.com'
            },
            validateStatus: () => true
          };
          const response = await axios.request(options);
          resData = { status: "RapidAPI Uplink Executed", data_preview: response.data ? "Data Acquired" : "No Content" };
        }
      } catch (toolError) {
        toolLogs.push(`Tool Execution Failed: ${toolError.message}`);
        console.error("==> Tool error:", toolError.message);
        resData = { error: toolError.message };
      }

      console.log("==> Sending Tool Results back to Gemini for final interpretation.");
      result = await chat.sendMessage(`Tool Output for ${call.name}:\n${JSON.stringify(resData)}\n\nPlease finalize the mission trajectory JSON output.`);
      finalText = result.response.text();
      console.log("==> Final Response after tool:", finalText);

      parsedData = extractJson(finalText) || parsedData;
    }

    if (!parsedData) {
      parsedData = {
        source: 'current_location',
        destination: 'Unknown Grid',
        source_coords: null,
        dest_coords: null,
        preferences: { safety: 'high', speed: 'med', green: true },
        intent: 'navigation'
      };
    }

    const cleanText = finalText.replace(/```json[\s\S]*?```/g, '').trim();

    // DYNAMIC GEOCODING RESOLUTION
    const geocodingService = require('./geocodingService');
    if (parsedData.source && parsedData.source !== 'current_location') {
      const resolved = await geocodingService.resolvePlaceToCoords(parsedData.source);
      if (resolved) {
        parsedData.source_coords = [resolved.lat, resolved.lng];
        parsedData.source = resolved.name;
      }
    }
    if (parsedData.destination) {
      const resolved = await geocodingService.resolvePlaceToCoords(parsedData.destination);
      if (resolved) {
        parsedData.dest_coords = [resolved.lat, resolved.lng];
        parsedData.destination = resolved.name;
      }
    }

    return {
      json: parsedData,
      text: cleanText || "Neural Link complete. Coordinates parsed.",
      toolLogs
    };
  } catch (error) {
    console.error('==> Gemini parsing FATAL error:', error);

    // Check if it's a quota exceeded error
    const isQuotaError = error.message.includes('429') || error.message.includes('quota') || error.message.includes('Too Many Requests');

    return {
      json: {
        source: 'current_location',
        destination: 'Unknown',
        source_coords: null,
        dest_coords: null,
        preferences: { safety: 'high', speed: 'med', green: true },
        intent: 'navigation'
      },
      text: isQuotaError 
        ? "AI quota exceeded. Please use manual input or try again later. System will use geocode fallback."
        : "System offline. Using fail-safe trajectory.",
      toolLogs: [`Error: ${error.message}`],
      quotaExceeded: isQuotaError
    };
  }
};

const chatWithAI = async (message, history = []) => {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-lite",
      tools: [{ googleSearch: {} }]
    }, { apiVersion: 'v1beta' });
    const chat = model.startChat({
      history: history.map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }],
      })),
      generationConfig: {
        maxOutputTokens: 500,
      },
    });

    const result = await chat.sendMessage(message);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini chat error:', error);
    const isQuotaError = error.message.includes('429') || error.message.includes('quota') || error.message.includes('Too Many Requests');
    return isQuotaError 
      ? "AI service quota exceeded. Please try manual routing or wait for quota reset."
      : "I apologize, my neural link is experiencing interference. Please try again shortly.";
  }
};

module.exports = {
  parseNaturalLanguage,
  chatWithAI
};


