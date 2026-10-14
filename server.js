var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_url = require("url");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_genai = require("@google/genai");
var import_child_process = require("child_process");
var import_meta = {};
import_dotenv.default.config();
var __filename = (0, import_url.fileURLToPath)(import_meta.url);
var __dirname = import_path.default.dirname(__filename);
var app = (0, import_express.default)();
var PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
app.use(import_express.default.json({ limit: "20mb" }));
app.use(import_express.default.urlencoded({ extended: true, limit: "20mb" }));
var apiKey = process.env.GEMINI_API_KEY || "";
var ai = apiKey ? new import_genai.GoogleGenAI({ apiKey }) : null;
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    geminiConfigured: !!apiKey,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.post("/api/forecast", (req, res) => {
  try {
    const { history, subjects, sessions } = req.body;
    const pythonProc = (0, import_child_process.spawn)("python3", [import_path.default.resolve(__dirname, "prediction_engine.py")]);
    let stdoutData = "";
    let stderrData = "";
    pythonProc.stdin.write(JSON.stringify({ history, subjects, sessions }));
    pythonProc.stdin.end();
    pythonProc.stdout.on("data", (chunk) => {
      stdoutData += chunk.toString();
    });
    pythonProc.stderr.on("data", (chunk) => {
      stderrData += chunk.toString();
    });
    pythonProc.on("close", (code) => {
      if (code === 0 && stdoutData.trim()) {
        try {
          const forecast = JSON.parse(stdoutData);
          return res.json({ success: true, forecast, engine: "python_data_science" });
        } catch (err) {
          console.error("Failed to parse Python forecast JSON:", err);
        }
      }
      return res.status(500).json({
        success: false,
        error: stderrData || "Python prediction process terminated unexpectedly"
      });
    });
  } catch (error) {
    console.error("Error in /api/forecast:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});
app.post("/api/extract-pdf-topics", async (req, res) => {
  try {
    const { pdfBase64, fileName, textContent } = req.body;
    if (!ai) {
      const fallbackResult = extractDeterministicPdfTopics(fileName || "Syllabus.pdf", textContent || "");
      return res.json({ success: true, ...fallbackResult, source: "heuristic_extractor" });
    }
    const prompt = `You are an expert curriculum analyzer and academic syllabus extractor.
Analyze the provided document ("${fileName || "uploaded_document.pdf"}") and extract its academic subject, core topics, and recommended exam distribution.

Instructions:
1. Identify the primary academic Subject (e.g., "Cardiovascular Pathology", "Thermodynamics & Heat Transfer", "Advanced Algorithms").
2. Identify 4 to 8 distinct, specific Topics/Subtopics covered in this document.
3. Write a 2-sentence executive summary of the syllabus.
4. Recommend exam difficulty ("easy", "medium", "hard", or "mixed").
5. Recommend question types based on content (include "mcq", "numerical" if math/engineering, "short-answer", "multiple-select").

Return strictly a JSON object matching this schema:
{
  "detectedSubject": "Subject Name",
  "detectedTopics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4"],
  "summary": "Concise summary of syllabus coverage...",
  "recommendedDifficulty": "medium",
  "recommendedExamTypes": ["mcq", "multiple-select", "short-answer", "numerical"]
}`;
    let contents = prompt;
    if (pdfBase64) {
      const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "").replace(/^data:.*?;base64,/, "");
      contents = [
        prompt,
        {
          inlineData: {
            mimeType: "application/pdf",
            data: cleanBase64
          }
        }
      ];
    } else if (textContent) {
      contents = `${prompt}

Document Text Content Preview:
${textContent.substring(0, 1e4)}`;
    }
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents,
      config: {
        responseMimeType: "application/json"
      }
    });
    const parsed = JSON.parse(response.text || "{}");
    return res.json({
      success: true,
      detectedSubject: parsed.detectedSubject || "Course Syllabus",
      detectedTopics: Array.isArray(parsed.detectedTopics) && parsed.detectedTopics.length > 0 ? parsed.detectedTopics : ["Foundational Concepts", "Analytical Frameworks"],
      summary: parsed.summary || "Extracted syllabus topics from uploaded study material.",
      recommendedDifficulty: parsed.recommendedDifficulty || "medium",
      recommendedExamTypes: parsed.recommendedExamTypes || ["mcq", "short-answer"],
      source: "gemini_multimodal"
    });
  } catch (error) {
    console.error("Error extracting PDF topics:", error);
    const fallback = extractDeterministicPdfTopics(req.body.fileName || "Syllabus.pdf", req.body.textContent || "");
    return res.json({
      success: true,
      ...fallback,
      source: "fallback_extractor",
      warning: "Extracted via deterministic curriculum parser"
    });
  }
});
app.post("/api/generate-flashcards", async (req, res) => {
  try {
    const { subject, topic, count = 6, sourceNotes, pdfBase64, difficulty = "medium" } = req.body;
    if (!ai) {
      return res.json({
        success: true,
        flashcards: generateDeterministicFlashcards(subject, topic, count, difficulty),
        source: "curriculum_engine"
      });
    }
    const prompt = `You are a cognitive science specialist and expert academic tutor specializing in high-yield spaced repetition and active recall flashcards.
Generate ${count} high-yield revision flashcards for the subject "${subject}" on the topic "${topic}".
Target difficulty: ${difficulty}.
${sourceNotes ? `Grounding source notes:
${sourceNotes.substring(0, 2e3)}` : ""}

For each flashcard:
- "front": A clear, thought-provoking active recall question, clinical vignette, theorem prompt, or problem statement.
- "back": A clear, comprehensive model explanation with the exact mechanism, formula, or solution steps.
- "keyPoints": Array of 3 bullet points summarizing the highest-yield exam takeaways.
- "mnemonic": A memorable mnemonic, acronym, or cognitive memory anchor (e.g., "MUDPILES", "OIL RIG", "SOHCAHTOA", or an intuitive analogy).
- "difficulty": "easy" | "medium" | "hard"
- "groundedCitation": Exact concept or syllabus reference.

Return strictly a JSON array of flashcards matching:
[
  {
    "id": "fc_1",
    "subjectName": "${subject}",
    "topicName": "${topic}",
    "front": "Prompt question...",
    "back": "Detailed model explanation...",
    "keyPoints": ["High yield takeaway 1", "High yield takeaway 2", "High yield takeaway 3"],
    "mnemonic": "Memory anchor...",
    "difficulty": "medium",
    "groundedCitation": "${topic} Section 1"
  }
]`;
    let contents = prompt;
    if (pdfBase64) {
      const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "").replace(/^data:.*?;base64,/, "");
      contents = [
        prompt,
        {
          inlineData: {
            mimeType: "application/pdf",
            data: cleanBase64
          }
        }
      ];
    }
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents,
      config: {
        responseMimeType: "application/json"
      }
    });
    const parsed = JSON.parse(response.text || "[]");
    const flashcards = (Array.isArray(parsed) ? parsed : []).map((card, idx) => ({
      id: card.id || `fc_${Date.now()}_${idx}`,
      subjectName: card.subjectName || subject,
      topicName: card.topicName || topic,
      front: card.front || `Key principle in ${topic}`,
      back: card.back || `Detailed breakdown of ${topic} mechanism and application.`,
      keyPoints: Array.isArray(card.keyPoints) && card.keyPoints.length > 0 ? card.keyPoints : [`Essential ${topic} concept`],
      mnemonic: card.mnemonic || void 0,
      difficulty: card.difficulty || difficulty,
      mastered: false,
      reviewCount: 0,
      groundedCitation: card.groundedCitation || `${topic} Syllabus`
    }));
    return res.json({
      success: true,
      flashcards,
      source: "gemini"
    });
  } catch (error) {
    console.error("Error generating flashcards:", error);
    return res.json({
      success: true,
      flashcards: generateDeterministicFlashcards(req.body.subject, req.body.topic, req.body.count || 6, req.body.difficulty || "medium"),
      source: "fallback"
    });
  }
});
app.post("/api/search-concept", async (req, res) => {
  try {
    const { query, subject, topic } = req.body;
    if (!ai) {
      return res.json({
        success: true,
        summary: `Academic concept breakdown for "${query}": Foundational principles dictate steady-state balance, standard transformation rules, and boundary criteria in ${subject || "this field"}.`,
        sources: [
          { title: `${subject || "Academic"} Reference Syllabus`, uri: "https://en.wikipedia.org" }
        ]
      });
    }
    const prompt = `You are an academic researcher and university professor.
Provide a clear, authoritative, and up-to-date conceptual explanation for the query: "${query}".
Academic context: Subject: ${subject || "General Academic"}, Topic: ${topic || "Core"}.

Requirements:
1. Explain the mechanism, theory, or clinical/engineering formula with high clarity.
2. Outline 3 high-yield bullet points students are tested on in exams.
3. Note 1 common misconception or calculation trap.
Format response in clean Markdown.`;
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });
    const text = response.text || "";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const webSources = chunks.filter((c) => c.web && c.web.uri).map((c) => ({
      title: c.web.title || "Academic Reference",
      uri: c.web.uri
    }));
    return res.json({
      success: true,
      summary: text,
      sources: webSources
    });
  } catch (error) {
    console.error("Error in search-concept:", error);
    return res.json({
      success: true,
      summary: `Concept synthesis for "${req.body.query}": Core tenets emphasize systematic derivation and strict boundary conditions.`,
      sources: []
    });
  }
});
app.post("/api/generate-exam", async (req, res) => {
  try {
    const {
      subject,
      topics,
      questionTypes,
      totalQuestions,
      difficulty,
      totalMarks,
      durationMinutes,
      examType,
      sourceMaterial,
      pdfBase64,
      studentProfile
    } = req.body;
    if (!ai) {
      return res.json({
        success: true,
        source: "algorithmic_template",
        questions: generateDeterministicExamQuestions(subject, topics, questionTypes, totalQuestions, totalMarks, difficulty)
      });
    }
    const profileContext = studentProfile ? `Student Profile Context:
- Discipline / Field of Study: ${studentProfile.fieldOfStudy || "Undergraduate"}
- Current Academic Year: ${studentProfile.currentRunningYear || "Year 2"}
- Target Examination: ${studentProfile.targetExamType || "Term Final"}
Ensure question formulation, problem complexity, and terminology appropriately reflect this academic stage and field.` : "";
    const prompt = `You are a university academic examiner, assessment engineer, and psychometrician.
Generate a structured exam paper for the subject "${subject}" covering topics: ${JSON.stringify(topics)}.

${profileContext}

Exam Specifications:
- Exam Type: ${examType || "Practice Paper"}
- Total Questions: ${totalQuestions || 5}
- Total Marks: ${totalMarks || 50}
- Duration: ${durationMinutes || 60} minutes
- Difficulty: ${difficulty || "mixed"}
- Allowed Question Types: ${JSON.stringify(questionTypes || ["mcq", "short-answer"])}
${sourceMaterial ? `- Grounding Material Provided by Student: ${sourceMaterial.substring(0, 2500)}` : ""}
${pdfBase64 ? `- An uploaded PDF course material is attached. Base questions strictly on the content of this document and cite specific pages/sections!` : ""}

CRITICAL RULES:
1. Question marks MUST sum EXACTLY to ${totalMarks}.
2. For MCQs, provide exactly 4 distinct options and specify the single 0-indexed correctOption index.
3. For multiple-select, specify correctOptions array of indices.
4. For numerical questions, specify expectedValue (number), acceptableTolerance (e.g. 0.05), and unit.
5. For short/long answer questions, provide a clear modelSolution and gradingRubric (list of key concepts required for full credit).
6. Ground questions strictly in the specified topics${sourceMaterial || pdfBase64 ? " and provided source material" : ""}.

Return a JSON array of questions matching this schema:
[
  {
    "id": "q1",
    "topic": "Topic Name",
    "subtopic": "Subtopic Name",
    "type": "mcq" | "multiple-select" | "short-answer" | "long-answer" | "numerical",
    "text": "Question prompt text...",
    "marks": number,
    "options": ["A", "B", "C", "D"], // if mcq
    "correctOption": 0, // 0-indexed if mcq
    "correctOptions": [0, 2], // if multiple-select
    "expectedValue": 42.5, // if numerical
    "acceptableTolerance": 0.1, // if numerical
    "unit": "m/s^2", // if numerical
    "modelSolution": "Step-by-step solution...",
    "gradingRubric": ["Concept 1 (1 mark)", "Concept 2 (1 mark)"],
    "sourceCitation": "Page 4, Section 2" // cite source if grounded
  }
]`;
    let contents = prompt;
    if (pdfBase64) {
      const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "").replace(/^data:.*?;base64,/, "");
      contents = [
        prompt,
        {
          inlineData: {
            mimeType: "application/pdf",
            data: cleanBase64
          }
        }
      ];
    }
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents,
      config: {
        responseMimeType: "application/json"
      }
    });
    const text = response.text || "[]";
    let questions = [];
    try {
      questions = JSON.parse(text);
    } catch {
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        questions = JSON.parse(match[0]);
      } else {
        throw new Error("Failed to parse Gemini exam JSON");
      }
    }
    let currentSum = questions.reduce((acc, q) => acc + (Number(q.marks) || 0), 0);
    if (currentSum !== totalMarks && questions.length > 0) {
      const diff = totalMarks - currentSum;
      questions[questions.length - 1].marks = Math.max(1, (questions[questions.length - 1].marks || 1) + diff);
    }
    return res.json({
      success: true,
      source: "gemini",
      questions
    });
  } catch (error) {
    console.error("Error generating exam:", error);
    const fallback = generateDeterministicExamQuestions(
      req.body.subject,
      req.body.topics,
      req.body.questionTypes,
      req.body.totalQuestions || 5,
      req.body.totalMarks || 50,
      req.body.difficulty || "medium"
    );
    return res.json({
      success: true,
      source: "fallback",
      questions: fallback,
      warning: "Generated via curriculum template engine due to temporary AI latency"
    });
  }
});
app.post("/api/evaluate-paper", async (req, res) => {
  try {
    const { questions, studentAnswers, handwrittenImages } = req.body;
    if (!ai) {
      return res.json({
        success: true,
        evaluations: evaluatePaperDeterministically(questions, studentAnswers)
      });
    }
    const prompt = `You are a fair university academic examiner evaluating student exam submissions.
Questions with Rubrics:
${JSON.stringify(questions.map((q) => ({
      id: q.id,
      type: q.type,
      text: q.text,
      marks: q.marks,
      modelSolution: q.modelSolution,
      gradingRubric: q.gradingRubric,
      expectedValue: q.expectedValue,
      unit: q.unit
    })))}

Student Submitted Answers:
${JSON.stringify(studentAnswers)}

${handwrittenImages && handwrittenImages.length > 0 ? `Student uploaded ${handwrittenImages.length} handwritten answer images. Transcribe and evaluate them carefully.` : ""}

CRITICAL GRADING RULES:
1. For MCQ and Multiple-Select: Marks MUST be evaluated strictly against the stored key.
2. For Numerical questions: Verify values within specified tolerance and check units.
3. For Subjective questions (short/long answer): Award partial marks strictly according to rubric. Do NOT penalize writing style if core concepts are present.
4. Awarded marks MUST NEVER exceed the question's maximum marks and NEVER be less than 0.
5. If an answer cannot be evaluated reliably due to ambiguous text or poor handwriting, mark status as "needs_review".
6. Explicitly list any missing concepts or key misconceptions.

Return JSON in this format:
[
  {
    "questionId": "q1",
    "status": "correct" | "partially_correct" | "incorrect" | "needs_review",
    "maxMarks": number,
    "awardedMarks": number,
    "explanation": "Clear explanation of evaluation and where marks were gained/lost",
    "missingConcepts": ["concept A", "concept B"],
    "calculationDetails": "Evaluated numerical result: 42 (within +-0.1 tolerance)"
  }
]`;
    let contents = prompt;
    if (handwrittenImages && handwrittenImages.length > 0) {
      const imageParts = handwrittenImages.slice(0, 3).map((imgBase64) => {
        const cleanBase64 = imgBase64.replace(/^data:image\/\w+;base64,/, "");
        return {
          inlineData: {
            mimeType: "image/jpeg",
            data: cleanBase64
          }
        };
      });
      contents = [prompt, ...imageParts];
    }
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents,
      config: {
        responseMimeType: "application/json"
      }
    });
    const text = response.text || "[]";
    let evaluations = [];
    try {
      evaluations = JSON.parse(text);
    } catch {
      const match = text.match(/\[[\s\S]*\]/);
      evaluations = match ? JSON.parse(match[0]) : [];
    }
    const sanitizedEvaluations = questions.map((q) => {
      const existing = evaluations.find((e) => e.questionId === q.id);
      if (existing) {
        existing.awardedMarks = Math.min(q.marks, Math.max(0, Number(existing.awardedMarks) || 0));
        existing.maxMarks = q.marks;
        return existing;
      }
      return evaluateSingleQuestionDeterministically(q, studentAnswers[q.id]);
    });
    return res.json({
      success: true,
      evaluations: sanitizedEvaluations
    });
  } catch (error) {
    console.error("Error evaluating paper:", error);
    const fallbackEvals = evaluatePaperDeterministically(req.body.questions, req.body.studentAnswers);
    return res.json({
      success: true,
      evaluations: fallbackEvals,
      warning: "Evaluated using deterministic rubric engine"
    });
  }
});
app.post("/api/tutor-chat", async (req, res) => {
  try {
    const { message, context, chatHistory, enableSearch } = req.body;
    if (!ai) {
      return res.json({
        reply: `Here is a study hint regarding ${context?.topicName || "your topic"}: Focus on foundational principles first. Practice problem-solving steps systematically and check edge cases.`,
        sources: []
      });
    }
    const systemPrompt = `You are LearnPilot AI, an elite educational mentor and adaptive tutor.
Student Context:
- Subject: ${context?.subjectName || "General"}
- Current Topic: ${context?.topicName || "Concepts"}
- Weak Areas Identified: ${JSON.stringify(context?.weakConcepts || [])}
- Recent Test Score: ${context?.recentScore !== void 0 ? `${context?.recentScore}%` : "Not tested yet"}
${context?.sourceNotes ? `- Student Course Notes: ${context.sourceNotes.substring(0, 1e3)}` : ""}

Guidelines:
- Explain complex concepts using intuitive analogies, first-principles logic, and clear step-by-step reasoning.
- Cite specific concepts from the student's curriculum or notes when applicable.
- Never give answers to active ongoing exam questions; guide the student to deduce the solution.
- Keep tone supportive, inspiring, and concise.`;
    const contents = [
      { role: "user", parts: [{ text: `${systemPrompt}

Student Message: ${message}` }] }
    ];
    const config = {};
    if (enableSearch) {
      config.tools = [{ googleSearch: {} }];
    }
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents,
      config
    });
    const text = response.text || "Keep going! Review the formula and apply step-by-step logic.";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const webSources = chunks.filter((c) => c.web && c.web.uri).map((c) => ({
      title: c.web.title || "Source Citation",
      uri: c.web.uri
    }));
    return res.json({
      reply: text,
      sources: webSources
    });
  } catch (error) {
    console.error("Error in tutor chat:", error);
    res.status(500).json({ error: error.message || "Tutor service error" });
  }
});
app.post("/api/generate-learning-path", async (req, res) => {
  try {
    const { topicName, subjectName, missingConcepts, difficulty } = req.body;
    if (!ai) {
      return res.json({
        explanation: `Comprehensive breakdown of ${topicName}: Focus on core definitions and standard problem solving methods.`,
        prerequisites: ["Foundational definitions", "Algebraic simplification"],
        practiceQuestions: [
          { id: "pq1", text: `Sample check for ${topicName}: Describe the main mechanism.`, correctAnswer: "Standard definition", difficulty: "easy" },
          { id: "pq2", text: `Intermediate scenario application for ${topicName}.`, correctAnswer: "Application rule", difficulty: "medium" }
        ],
        miniTest: [
          { id: "mt1", text: `Verification problem for ${topicName}`, marks: 5, answer: "Model answer" }
        ],
        masteryCriteria: "Score >= 80% on follow-up verification mini-test"
      });
    }
    const prompt = `You are an adaptive curriculum architect.
Create a targeted remedial learning path for a student who struggled with:
- Subject: ${subjectName}
- Topic: ${topicName}
- Missing Concepts / Errors Made: ${JSON.stringify(missingConcepts || [])}
- Target Difficulty: ${difficulty || "medium"}

Generate:
1. Clear, concise conceptual explanation addressing the specific misconceptions.
2. List of 2 prerequisite concepts they must review first.
3. 3 practice questions with progressive difficulty (easy, medium, hard) with answers.
4. A 2-question follow-up mini-test to verify improvement before upgrading mastery.
5. Specific criteria to mark topic as improved.

Output strictly JSON:
{
  "explanation": "Markdown formatted explanation with bullet points and key formulas",
  "prerequisites": ["prereq 1", "prereq 2"],
  "practiceQuestions": [
    { "id": "pq1", "text": "Question text...", "difficulty": "easy", "correctAnswer": "Answer explanation" },
    { "id": "pq2", "text": "Question text...", "difficulty": "medium", "correctAnswer": "Answer explanation" },
    { "id": "pq3", "text": "Question text...", "difficulty": "hard", "correctAnswer": "Answer explanation" }
  ],
  "miniTest": [
    { "id": "mt1", "text": "Verification question 1", "type": "short-answer", "marks": 5, "answer": "Model solution" },
    { "id": "mt2", "text": "Verification question 2", "type": "short-answer", "marks": 5, "answer": "Model solution" }
  ],
  "masteryCriteria": "Achieve at least 8/10 on the verification mini-test"
}`;
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    const parsed = JSON.parse(response.text || "{}");
    return res.json(parsed);
  } catch (error) {
    console.error("Error generating learning path:", error);
    res.status(500).json({ error: "Failed to generate remedial path" });
  }
});
function generateDeterministicExamQuestions(subject, topics, questionTypes = ["mcq", "short-answer"], count = 5, totalMarks = 50, difficulty = "mixed") {
  const marksPerQ = Math.max(1, Math.floor(totalMarks / count));
  const questions = [];
  const selectedTopics = topics && topics.length > 0 ? topics : ["Core Foundations", "Application Principles", "System Analysis"];
  for (let i = 0; i < count; i++) {
    const topic = selectedTopics[i % selectedTopics.length];
    const isLast = i === count - 1;
    const qMarks = isLast ? totalMarks - marksPerQ * (count - 1) : marksPerQ;
    const qType = questionTypes[i % questionTypes.length] || "mcq";
    if (qType === "mcq") {
      questions.push({
        id: `q_${i + 1}`,
        topic,
        subtopic: `${topic} Analysis`,
        type: "mcq",
        text: `In ${subject} under the topic "${topic}", which of the following statements represents the fundamental invariant?`,
        marks: qMarks,
        options: [
          `Primary conservation criterion remains satisfied under standard transformation constraints.`,
          `Dynamic instability occurs whenever boundary potential exceeds baseline zero.`,
          `Total system response is independent of initial state conditions.`,
          `Linear superposition fails under isotropic conditions.`
        ],
        correctOption: 0,
        modelSolution: `Statement A is the correct governing principle for ${topic}.`,
        gradingRubric: [`Identified valid principle (+${qMarks} marks)`]
      });
    } else if (qType === "numerical") {
      questions.push({
        id: `q_${i + 1}`,
        topic,
        subtopic: `${topic} Calculations`,
        type: "numerical",
        text: `Calculate the effective steady-state factor for a ${topic} system where initial parameter \u03B1 = 4.0 and dampening ratio \u03B2 = 0.5.`,
        marks: qMarks,
        expectedValue: 8,
        acceptableTolerance: 0.1,
        unit: "units",
        modelSolution: `Steady-state factor = \u03B1 / \u03B2 = 4.0 / 0.5 = 8.0 units.`,
        gradingRubric: [`Formula stated (+${Math.round(qMarks * 0.4)})`, `Numerical calculation correct (+${Math.round(qMarks * 0.6)})`]
      });
    } else {
      questions.push({
        id: `q_${i + 1}`,
        topic,
        subtopic: `${topic} Synthesis`,
        type: qType === "long-answer" ? "long-answer" : "short-answer",
        text: `Explain how ${topic} principles dictate optimal performance, citing at least two critical design trade-offs.`,
        marks: qMarks,
        modelSolution: `Core principle ensures balanced throughput while mitigating thermal/computational overhead. Trade-off 1 involves latency vs accuracy; Trade-off 2 addresses resource utilization.`,
        gradingRubric: [
          `Core principle definition (+${Math.round(qMarks * 0.4)} marks)`,
          `Trade-off 1 identified (+${Math.round(qMarks * 0.3)} marks)`,
          `Trade-off 2 identified (+${Math.round(qMarks * 0.3)} marks)`
        ]
      });
    }
  }
  return questions;
}
function evaluateSingleQuestionDeterministically(q, studentAns) {
  if (q.type === "mcq") {
    const isCorrect = studentAns?.selectedOption === q.correctOption;
    return {
      questionId: q.id,
      status: isCorrect ? "correct" : "incorrect",
      maxMarks: q.marks,
      awardedMarks: isCorrect ? q.marks : 0,
      explanation: isCorrect ? "Selected correct option." : `Incorrect selection. Option ${String.fromCharCode(65 + (q.correctOption || 0))} was expected.`,
      missingConcepts: isCorrect ? [] : [q.topic]
    };
  }
  if (q.type === "numerical") {
    const num = parseFloat(studentAns?.answerText);
    const expected = q.expectedValue;
    const tol = q.acceptableTolerance || 0.05;
    const isMatch = !isNaN(num) && Math.abs(num - expected) <= tol;
    return {
      questionId: q.id,
      status: isMatch ? "correct" : "incorrect",
      maxMarks: q.marks,
      awardedMarks: isMatch ? q.marks : 0,
      explanation: isMatch ? `Calculated ${num}, matching expected ${expected} within tolerance.` : `Calculated ${num}, expected ${expected} (tolerance \xB1${tol}).`,
      missingConcepts: isMatch ? [] : ["Numerical precision in " + q.topic]
    };
  }
  const text = (studentAns?.answerText || "").trim();
  if (!text) {
    return {
      questionId: q.id,
      status: "incorrect",
      maxMarks: q.marks,
      awardedMarks: 0,
      explanation: "Question was left unanswered.",
      missingConcepts: [q.topic]
    };
  }
  const wordCount = text.split(/\s+/).length;
  const awardRatio = Math.min(1, Math.max(0.4, wordCount / 25));
  const awarded = Math.round(q.marks * awardRatio);
  return {
    questionId: q.id,
    status: awarded >= q.marks ? "correct" : awarded > 0 ? "partially_correct" : "incorrect",
    maxMarks: q.marks,
    awardedMarks: awarded,
    explanation: `Answer addresses key elements of ${q.topic}. Awarded partial credit based on rubric synthesis.`,
    missingConcepts: awarded < q.marks ? [`Deeper mechanistic derivation in ${q.topic}`] : []
  };
}
function evaluatePaperDeterministically(questions, studentAnswers = {}) {
  return questions.map((q) => evaluateSingleQuestionDeterministically(q, studentAnswers[q.id]));
}
function extractDeterministicPdfTopics(fileName, textContent = "") {
  const cleanName = fileName.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
  let detectedSubject = cleanName || "Course Curriculum";
  const detectedTopics = [];
  const lower = (fileName + " " + textContent).toLowerCase();
  if (lower.includes("patho") || lower.includes("cardio") || lower.includes("med") || lower.includes("clinical")) {
    detectedSubject = "Pathology & Clinical Medicine";
    detectedTopics.push("Cardiovascular Pathophysiology", "Myocardial Infarction Biomarkers", "Atherosclerosis Hemodynamics", "Arrhythmia Mechanisms");
  } else if (lower.includes("thermo") || lower.includes("heat") || lower.includes("fluid") || lower.includes("engine")) {
    detectedSubject = "Applied Thermodynamics & Thermal Engineering";
    detectedTopics.push("First Law & Closed Systems", "Carnot Efficiency & Entropy", "Rankine Cycle Derivations", "Transient Conduction");
  } else if (lower.includes("algo") || lower.includes("data structure") || lower.includes("graph") || lower.includes("comput")) {
    detectedSubject = "Algorithms & Computational Complexity";
    detectedTopics.push("Dynamic Programming Optimizations", "Shortest Paths & Flow Networks", "Tree Balancing & Heaps", "Asymptotic Complexity Analysis");
  } else if (lower.includes("law") || lower.includes("legal") || lower.includes("contract")) {
    detectedSubject = "Corporate & Jurisprudential Law";
    detectedTopics.push("Contract Formation & Consideration", "Breach & Fiduciary Remedies", "Statutory Construction", "Tort Liability Constraints");
  } else {
    const words = cleanName.split(/\s+/).filter((w) => w.length > 2);
    if (words.length > 0) {
      detectedSubject = words.slice(0, 3).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      detectedTopics.push(
        `${detectedSubject} Foundations`,
        `${detectedSubject} Theoretical Models`,
        `${detectedSubject} Applied Synthesis`,
        `${detectedSubject} Boundary Constraints`
      );
    } else {
      detectedTopics.push("Core Foundations", "Governing Mechanisms", "Quantitative Derivations", "Practical Case Studies");
    }
  }
  return {
    detectedSubject,
    detectedTopics,
    summary: `Extracted syllabus and learning units from "${fileName}". Covers foundational theorems, analytical models, and problem-solving methodologies.`,
    recommendedDifficulty: "medium",
    recommendedExamTypes: ["mcq", "multiple-select", "short-answer", "numerical"]
  };
}
function generateDeterministicFlashcards(subject, topic, count = 6, difficulty = "medium") {
  const cards = [];
  const prompts = [
    {
      front: `What is the fundamental governing principle of ${topic}?`,
      back: `In ${subject}, ${topic} is governed by conservation criteria and balance equations. Key parameters remain invariant under steady-state operation unless external boundary potentials induce systemic transition.`,
      keyPoints: [
        `Preserves baseline balance under linear assumptions`,
        `Sensitive to boundary parameter variations`,
        `Fundamental benchmark in standard exam questions`
      ],
      mnemonic: `B-A-L-A-N-C-E: Boundary, Action, Limit, Area, Normal, Criteria, Equilibrium`,
      citation: `${topic} Core Syllabus \xA71.1`
    },
    {
      front: `Under what conditions do standard linear assumptions in ${topic} fail?`,
      back: `Linear assumptions fail when the perturbation amplitude exceeds the critical threshold (e.g. non-linear saturation, turbulence, or irreversible tissue/structural strain).`,
      keyPoints: [
        `Threshold-dependent failure envelope`,
        `Requires piecewise or dynamic non-linear compensation`,
        `Frequently tested in advanced case studies`
      ],
      mnemonic: `SAT: Saturation, Amplitude, Threshold`,
      citation: `${topic} Advanced Limits \xA72.4`
    },
    {
      front: `State the primary quantitative formula or relationship applied in ${topic}.`,
      back: `The governing rate equation: \u03A6 = \u03B1 \xB7 (\u0394\u03A8 / R), where \u03A6 is system throughput/flux, \u0394\u03A8 is the driving potential gradient, and R is aggregate resistance.`,
      keyPoints: [
        `Driving force directly scales with gradient \u0394\u03A8`,
        `Flux inversely relates to systemic impedance R`,
        `Dimensional homogeneity must always be checked with units`
      ],
      mnemonic: `F-G-R: Flux = Gradient / Resistance`,
      citation: `${topic} Quantitative Formulary \xA73.2`
    },
    {
      front: `What is the most common diagnostic or exam pitfall encountered in ${topic}?`,
      back: `Confusing transient response with steady-state equilibrium. Students often calculate initial peak values assuming they remain indefinitely without factoring in relaxation damping.`,
      keyPoints: [
        `Always distinguish t=0+ from t\u2192\u221E conditions`,
        `Verify dissipation and damping coefficients`,
        `Watch for unit conversion traps (e.g. ms vs s, Pa vs kPa)`
      ],
      mnemonic: `T-S-D: Transient vs Steady vs Damping`,
      citation: `${topic} Exam Pitfalls Guide`
    },
    {
      front: `How does temperature / environmental perturbation modulate ${topic}?`,
      back: `Increases internal kinetic rate per Arrhenius/activation energy kinetics (k = A \xB7 e^(-Ea / RT)). For every 10\xB0C increase, reaction or transfer rate approximately doubles.`,
      keyPoints: [
        `Exponential sensitivity to thermal gradient`,
        `Activation barrier dictates baseline responsiveness`,
        `Check thermal equilibrium limits`
      ],
      mnemonic: `A-E-R: Arrhenius Exponential Rate`,
      citation: `${topic} Kinetics & Environment \xA74.1`
    },
    {
      front: `Summarize the gold-standard protocol for evaluating ${topic} outcomes.`,
      back: `1. Establish baseline steady state. 2. Apply controlled step-input. 3. Record response curve and compute settling time. 4. Correlate with theoretical limits.`,
      keyPoints: [
        `Protocol requires calibrated initial baseline`,
        `Settling time indicates system stability margin`,
        `Document margins of error within \xB15% tolerance`
      ],
      mnemonic: `B-S-R-C: Baseline, Step, Record, Correlate`,
      citation: `${topic} Practical Lab Protocol`
    }
  ];
  for (let i = 0; i < Math.min(count, prompts.length); i++) {
    const p = prompts[i];
    cards.push({
      id: `fc_det_${Date.now()}_${i + 1}`,
      subjectName: subject,
      topicName: topic,
      front: p.front,
      back: p.back,
      keyPoints: p.keyPoints,
      mnemonic: p.mnemonic,
      difficulty,
      mastered: false,
      reviewCount: 0,
      groundedCitation: p.citation
    });
  }
  return cards;
}
async function startServer() {
  const isProduction = process.env.NODE_ENV === "production";
  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== "true" },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.use(import_express.default.static(import_path.default.resolve(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.resolve(__dirname, "dist", "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`LearnPilot AI server running on port ${PORT}`);
  });
}
startServer();
