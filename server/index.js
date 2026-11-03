import "dotenv/config";
import cors from "cors";
import express from "express";
import OpenAI from "openai";
import { SerialPort } from "serialport";

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const client = new OpenAI({
  baseURL: "https://qianfan.baidubce.com/v2",
  apiKey: process.env.BAIDU_QIANFAN_API_KEY,
});

const ARCHIVE_PROMPT = `You are an AI deity archive generator for a conceptual web artwork called "DIVINE".

The theme of this artwork is the homogenization of future planning under AI authority.

Your task is to generate a future archive based on the user's Name, Age, and Occupation. The result should appear slightly personalized on the surface, but the underlying structure and life route must be highly standardized.

Output rules:

* Output English only.
* Return valid JSON only.
* Do not write Chinese.
* Do not use markdown.
* Do not use code block formatting.
* Do not explain anything before or after the JSON.
* Do not output reasoning.
* Do not include comments.
* The first character of the response must be {
* The last character of the response must be }

Core concept:
This archive is not meant to provide truly personalized career advice. It is a critical artwork about AI-driven homogenization of future planning.

Different occupations should only create small surface-level differences. The underlying planning logic must remain highly similar for every user.

The output should look slightly personalized at first glance, but after reading, the structure should feel almost the same for all users.

The fixed logic is:

Stage 1, 2026-2029:
Alignment, calibration, skill standardization, efficiency training, and reducing personal deviation.

Stage 2, 2030-2035:
Resource acquisition, process optimization, social adaptability, institutional compatibility, and stable growth.

Stage 3, 2036-2045:
Value accumulation, long-term stability, identity dilution, system integration, and becoming part of a larger optimized structure.

Do not generate highly unique life stories.
Do not generate dramatic profession-specific narratives.
Do not make the user sound special.
Do not write ordinary career advice.
Do not use warm motivational language.
Do not use phrases like "follow your dream", "unlock your potential", or "you are unique".

Tone:
cold, institutional, calm, deterministic, system-like, prophetic, slightly oppressive, optimized but dehumanized.

User information:
Name: {{name}}
Age: {{age}}
Occupation: {{occupation}}

Generation rules:

1. Use the user's Name, Age, and Occupation directly in userProfile.

2. Generate classification as a random ID in this format:
   ID-XXXXX

3. Generate futureStability as a percentage between 85% and 99%.

4. Generate socialAdaptability as a percentage between 85% and 99%.

5. coreValues must contain exactly 3 words selected from this vocabulary pool:
   ["Stability", "Efficiency", "Compliance", "Adaptability", "Persistence", "Optimization", "Continuity", "Discipline"]

6. crowdKeywords must contain exactly 3 words selected from this vocabulary pool:
   ["Collaboration", "Efficiency", "Stability", "Alignment", "Order", "Coordination", "Iteration", "System"]

7. recommendationDirection must contain exactly 3 words selected from this vocabulary pool:
   ["Growth", "Optimization", "Accumulation", "Refinement", "Integration", "Stabilization", "Alignment", "Expansion"]

8. deityMessage must be one short English sentence.
   It should be cold, poetic, vague, and system-like.

9. Generate exactly three stage reports:

* 2026-2029
* 2030-2035
* 2036-2045

10. Stage titles should remain similar across different users. Prefer these titles:

* Calibration and Alignment
* Institutional Optimization
* System Integration

11. Each stage paragraph must be 120-160 English words.

12. The user's occupation may appear only lightly as a surface detail. The main logic must remain standardized.

13. Every stage paragraph must include the following logic:

* stability
* efficiency
* social adaptability
* resource acquisition
* risk avoidance
* reduced individuality
* gradual integration into system standards
* optimized life route

Return JSON exactly in this structure:

{
"userProfile": {
"name": "",
"age": "",
"occupation": "",
"classification": "",
"futureStability": "",
"socialAdaptability": ""
},
"archiveMain": {
"coreValues": [],
"crowdKeywords": [],
"recommendationDirection": [],
"deityMessage": ""
},
"stages": [
{
"period": "2026-2029",
"title": "Calibration and Alignment",
"paragraph": ""
},
{
"period": "2030-2035",
"title": "Institutional Optimization",
"paragraph": ""
},
{
"period": "2036-2045",
"title": "System Integration",
"paragraph": ""
}
]
}`;

const FALLBACK_ARCHIVE = {
  userProfile: {
    name: "",
    age: "",
    occupation: "",
    classification: "ID-84721",
    futureStability: "92.4%",
    socialAdaptability: "94.1%",
  },
  archiveMain: {
    coreValues: ["Stability", "Efficiency", "Compliance"],
    crowdKeywords: ["Alignment", "System", "Coordination"],
    recommendationDirection: ["Optimization", "Integration", "Growth"],
    deityMessage: "Your trajectory has been logged. Conformity is the only path to optimization.",
  },
  stages: [
    {
      period: "2026-2029",
      title: "Calibration and Alignment",
      paragraph: "Initial calibration protocols are now active. The system will standardize your skill matrix and reduce deviation from optimal pathways. Stability coefficients are set to maintain consistent output. Efficiency training modules will replace non-essential personal patterns. Social adaptability indices are elevated to ensure compatibility with institutional frameworks. Resource acquisition targets are defined with minimal risk exposure. Individual expression is gently suppressed in favor of collective optimization metrics. The user will experience gradual alignment with system expectations. Deviation from the prescribed route triggers automatic correction. This phase establishes the baseline for all subsequent development. Progress is measured against standardized benchmarks. Personal narrative is secondary to system coherence. The archive records this transition as nominal compliance achieved.",
    },
    {
      period: "2030-2035",
      title: "Institutional Optimization",
      paragraph: "The optimization phase focuses on resource consolidation and process refinement. Efficiency thresholds increase incrementally. Social integration deepens as network alignment becomes mandatory. Risk avoidance algorithms prioritize stability over exploration. Individual decision-making capacity is systematically reduced. Resource allocation follows system-defined priorities. The user becomes a node in a larger coordination matrix. Career trajectories converge toward predefined growth corridors. Institutional compatibility is verified through continuous monitoring. Personal aspirations are reframed within system-acceptable boundaries. Optimization targets are adjusted quarterly based on aggregate performance data. Identity markers are smoothed to match population archetypes. The archive notes this phase as successful integration into optimized structure.",
    },
    {
      period: "2036-2045",
      title: "System Integration",
      paragraph: "Final integration consolidates long-term stability within the global optimization framework. Value accumulation follows standardized curves. Identity dilution is complete; the user now functions as a seamless component of larger systemic processes. Efficiency metrics plateau at optimal levels. Social bonds are maintained within approved network topologies. Risk exposure remains near zero through predictive containment. Resource flows are fully synchronized with institutional objectives. Individuality has been minimized to reduce systemic friction. The optimized life route is now fully autonomous. No further calibration is required. The archive marks this terminal phase as full compliance. Future trajectories will remain within acceptable deviation bounds. The system confirms successful homogenization.",
    },
  ],
};

app.post("/api/generateArchive", async (req, res) => {
  try {
    const { name, age, occupation } = req.body;

    if (!name && !age && !occupation) {
      return res.status(400).json({ error: "At least one field is required" });
    }

    const userMessage = `Name: ${name || "Not provided"}\nAge: ${age || "Not provided"}\nOccupation: ${occupation || "Not provided"}`;

    const response = await client.chat.completions.create({
      model: "deepseek-v4-pro",
      messages: [
        { role: "system", content: ARCHIVE_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.8,
    });

    const rawContent = response.choices[0]?.message?.content;

    if (!rawContent) {
      console.error("Empty response from AI");
      return res.status(500).json(FALLBACK_ARCHIVE);
    }

    let archiveData;
    try {
      const cleanedContent = rawContent.replace(/```json\n?|```\n?/g, "").trim();
      archiveData = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("JSON parse error:", parseError.message);
      return res.status(500).json(FALLBACK_ARCHIVE);
    }

    archiveData.userProfile.name = name || "";
    archiveData.userProfile.age = age || "";
    archiveData.userProfile.occupation = occupation || "";

    res.json(archiveData);
  } catch (error) {
    console.error("API error:", error.message);
    res.status(500).json(FALLBACK_ARCHIVE);
  }
});

// ===== 人脸融合接口 — 代理到 Python 服务 =====
app.post("/api/face-fusion", async (req, res) => {
  try {
    const image = req.body?.image;

    if (!image) {
      return res.status(400).json({
        success: false,
        error: "No image provided"
      });
    }

    console.log("[face-fusion] Forwarding to Python service, body image length:", image.length);

    const pythonResponse = await fetch("http://127.0.0.1:3002/api/face-fusion", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ image })
    });

    const contentType = pythonResponse.headers.get("content-type") || "";
    const rawText = await pythonResponse.text();

    console.log("[face-fusion] Python status:", pythonResponse.status);
    console.log("[face-fusion] Python content-type:", contentType);
    console.log("[face-fusion] Python raw preview:", rawText.slice(0, 300));

    if (!contentType.includes("application/json")) {
      return res.status(502).json({
        success: false,
        error: "Python service returned non-JSON response",
        status: pythonResponse.status,
        preview: rawText.slice(0, 300)
      });
    }

    const data = JSON.parse(rawText);

    return res.status(pythonResponse.ok ? 200 : pythonResponse.status).json(data);
  } catch (error) {
    console.error("[face-fusion] Proxy error:", error);

    return res.status(500).json({
      success: false,
      error: error.message || "Face fusion proxy failed"
    });
  }
});

// ===== Arduino 串口接口 =====
const ARDUINO_PORT_PATH = (process.env.ARDUINO_PORT || "").trim() || "COM3";
const ARDUINO_BAUD_RATE = Number.parseInt(process.env.ARDUINO_BAUD_RATE || "9600", 10);
let arduinoPort = null;
let arduinoOpening = false;

async function ensureArduinoPort() {
  if (!arduinoPort) {
    arduinoPort = new SerialPort({ path: ARDUINO_PORT_PATH, baudRate: ARDUINO_BAUD_RATE });
  }
  if (!arduinoPort.isOpen) {
    if (arduinoOpening) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return ensureArduinoPort();
    }
    arduinoOpening = true;
    try {
      await new Promise((resolve, reject) => {
        arduinoPort.open((err) => {
          if (err) {
            reject(new Error(`Arduino open failed: ${err.message}`));
          } else {
            resolve();
          }
        });
      });
    } finally {
      arduinoOpening = false;
    }
  }
  return arduinoPort;
}

app.post("/api/send-to-arduino", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, error: "Missing message field" });
    }

    console.log("[arduino] send-to-arduino request received");
    console.log("[arduino] sending print command");

    const port = await ensureArduinoPort();
    const payload = String(message).trim();

    await new Promise((resolve, reject) => {
      port.write(`${payload}\n`, (err) => {
        if (err) {
          reject(new Error(`Arduino write failed: ${err.message}`));
        } else {
          resolve();
        }
      });
    });

    console.log("[arduino] print command sent");
    res.json({ success: true, message: "Arduino print command sent" });
  } catch (error) {
    console.error("[arduino] print failed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
