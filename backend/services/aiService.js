const axios = require("axios")

// Simple cache: key -> { result, expiresAt }
const responseCache = new Map()
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

// Use gemini-1.5-flash — much faster and cheaper than gemini-pro
const GEMINI_MODEL = "gemini-1.5-flash-latest"

/**
 * Analyze appliance issue using Google Gemini API
 * @param {string} text - user description
 * @param {string} imageUrl - optional image URL
 * @returns {{ issue, severity, solution }}
 */
const analyzeIssue = async (text, imageUrl) => {
  const apiKey = process.env.GEMINI_API_KEY;
  
  // Check if API key is configured properly
  if (!apiKey || apiKey.includes('your-') || apiKey.includes('Demo') || apiKey.length < 20) {
    console.warn("⚠️  Gemini API key not configured, using mock response");
    return getMockResponse(text);
  }

  // Cache key based on text + imageUrl (skip cache if image present — unique each time)
  const cacheKey = !imageUrl ? `text:${(text || "").toLowerCase().trim()}` : null
  if (cacheKey) {
    const cached = responseCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) return cached.result
  }

  try {
    const prompt = `You are an expert home appliance technician. Analyze the following issue and respond ONLY with valid JSON in this exact format: { "issue": "...", "severity": "low|medium|high", "solution": "..." }

User's description: ${text || "No description provided"}

Be concise. Provide issue summary, severity, and practical solution.`

    const parts = [{ text: prompt }]

    // Add image if provided (with size guard)
    if (imageUrl) {
      try {
        const imageResponse = await axios.get(imageUrl, {
          responseType: "arraybuffer",
          timeout: 8000,
          maxContentLength: 4 * 1024 * 1024, // 4MB max
        })

        // Validate content type
        const contentType = imageResponse.headers["content-type"] || ""
        if (!contentType.startsWith("image/")) {
          console.warn("Invalid content type for image:", contentType)
        } else {
          parts.push({
            inline_data: {
              mime_type: contentType,
              data: Buffer.from(imageResponse.data).toString("base64"),
            },
          })
        }
      } catch (imgError) {
        console.error("Failed to fetch image:", imgError.message)
        // Continue without image instead of failing
      }
    }

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      { contents: [{ parts }] },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 20000, // reduced from 30s
      }
    )

    if (!response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error("Invalid response from Gemini API: missing text content")
    }

    const raw = response.data.candidates[0].content.parts[0].text.trim()
    const cleaned = raw.replace(/```json|```/g, "").trim()
    
    let result
    try {
      result = JSON.parse(cleaned)
    } catch (parseErr) {
      console.error("Failed to parse Gemini response:", cleaned)
      throw new Error("Invalid JSON response from Gemini API")
    }

    // Validate response structure
    if (!result.issue || !result.severity || !result.solution) {
      throw new Error("Gemini response missing required fields")
    }

    // Normalize severity to match Appliance model enum
    result.severity = result.severity ? result.severity.charAt(0).toUpperCase() + result.severity.slice(1).toLowerCase() : 'Medium'
    if (!['Low', 'Medium', 'High'].includes(result.severity)) {
      result.severity = 'Medium'
    }

    // Cache text-only results
    if (cacheKey) {
      responseCache.set(cacheKey, { result, expiresAt: Date.now() + CACHE_TTL })
    }

    return result
  } catch (error) {
    console.error("Gemini API Error:", error.response?.data || error.message)
    return getMockResponse(text)
  }
}

/**
 * Generate a mock response when Gemini is unavailable
 */
  const getMockResponse = (text) => {
  const lowerText = (text || "").toLowerCase()

  if (lowerText.includes("noise") || lowerText.includes("sound")) {
    return { issue: "Unusual noise detected", severity: "Medium", solution: "Check for loose parts or debris. Ensure the appliance is on a level surface. Contact a technician if noise persists." }
  } else if (lowerText.includes("leak") || lowerText.includes("water")) {
    return { issue: "Water leakage detected", severity: "High", solution: "Turn off immediately. Check hoses and door seals. Contact a technician for repair." }
  } else if (lowerText.includes("not cooling") || lowerText.includes("not cold")) {
    return { issue: "Cooling system not functioning", severity: "High", solution: "Clean air filters and vents. Ensure proper ventilation. Refrigerant may need recharging." }
  } else if (lowerText.includes("not heating")) {
    return { issue: "Heating element not working", severity: "High", solution: "Check power supply and circuit breaker. Contact a technician if heating element needs replacement." }
  } else if (lowerText.includes("smell") || lowerText.includes("odor")) {
    return { issue: "Unusual odor from appliance", severity: "Medium", solution: "Clean thoroughly. Check for burnt components. Contact technician if smell persists." }
  }

  return {
    issue: "Appliance issue detected",
    severity: "Medium",
    solution: "Check the appliance manual and ensure proper maintenance. Contact a technician if the issue persists.",
  }
}

module.exports = { analyzeIssue }
