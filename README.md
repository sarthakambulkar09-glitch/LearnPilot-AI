🚀 LearnPilot AI

Learn Smarter. Plan Better. Master More.

<p align="center">
  <img src="https://img.shields.io/badge/AI-Powered-8A2BE2?style=for-the-badge&logo=google&logoColor=white" alt="AI Powered"/>
  <img src="https://img.shields.io/badge/Personalized-Learning-00BFA6?style=for-the-badge" alt="Personalized Learning"/>
  <img src="https://img.shields.io/badge/Track-D-4285F4?style=for-the-badge" alt="Track D"/>
  <img src="https://img.shields.io/badge/Status-In%20Development-orange?style=for-the-badge" alt="In Development"/>
</p><p align="center">
  <strong>Your personal AI learning companion — from your first study session to your final exam.</strong>
</p><p align="center">
  <a href="#-the-vision">Vision</a> •
  <a href="#-key-features">Features</a> •
  <a href="#-how-it-works">How It Works</a> •
  <a href="#-technology-stack">Tech Stack</a> •
  <a href="#-getting-started">Get Started</a> •
  <a href="#-roadmap">Roadmap</a>
</p>---

🌌 The Vision

What if your learning platform understood not just what you study, but what you struggle with, when your exams are approaching, and what you should learn next?

Traditional learning platforms often provide the same resources and practice questions to every student. LearnPilot AI aims to make learning more personal, evidence-based, and adaptive.

It combines AI tutoring, exam preparation, personalized study scheduling, assessment feedback, and topic-level learning insights in one platform.

🎯 Our mission: Help every student turn confusing concepts into clear understanding and turn exam preparation into a measurable learning journey.

💡 The Problem We're Solving

Students frequently struggle with:

- 📚 Too many study materials and not enough organized guidance.
- ⏳ Poor time management before exams and deadlines.
- 🧩 Difficulty identifying exactly which topics they do not understand.
- 📝 Limited personalized feedback on practice papers.
- 🔁 Repeated practice without addressing underlying misconceptions.
- 📉 Uncertainty about whether their preparation is improving.

LearnPilot AI is designed to connect these disconnected activities into one continuous learning cycle.

✨ Key Features

🧠 1. Evidence-Grounded AI Tutor

Ask questions about your uploaded educational materials and receive explanations grounded in relevant source passages.

- PDF-based study material ingestion.
- Source references to document pages and supported slide or video locations.
- Context-aware question answering.
- Clear uncertainty when the available evidence is insufficient.
- AI explanations designed to support understanding, not just provide answers.

📅 2. Personalized AI Exam Planner

Build a preparation plan around your own subjects, topics, availability, and deadlines.

- Add multiple subjects and topics.
- Set exam dates, target marks, and topic priorities.
- Generate daily study schedules.
- Include revision, practice sessions, and mock exams.
- Replan around missed sessions or changing deadlines.
- Track completion and remaining workload.

📝 3. Custom Exam & Mock Test Generator

Turn your syllabus into a personalized testing experience.

- Select topics, difficulty, question types, and duration.
- Configure total marks, question-wise marks, and optional negative marking.
- Generate topic-focused practice tests.
- Attempt questions in an exam-style interface.
- Review explanations and source references after submission.
- Track previous attempts and performance trends.

🔍 4. AI Paper Evaluation & Personalized Learning Path

Go beyond a score and understand how to improve.

- Evaluate submitted answers against expected answers and marking rubrics.
- Calculate marks and percentages.
- Provide question-level feedback and partial-credit explanations.
- Identify strong topics, weak topics, and recurring mistakes.
- Generate targeted revision material.
- Create new mock questions for weak topics.
- Update learning estimates using subsequent assessment results.

Automated evaluation may require manual review when handwriting, question mapping, or subjective answers are ambiguous.

📈 5. Weekly Learning Growth Forecast

Understand your learning trajectory through actual assessment history.

- Review recent performance.
- Explore estimated seven-day performance ranges.
- Track topic-level changes.
- Identify risks and revision priorities.
- See the uncertainty behind each forecast.

Forecasts require sufficient historical data. Predictions are estimates, not guaranteed marks or exam outcomes.

🎮 6. Immersive Learning Experience

Designed to make studying engaging without sacrificing usability.

- Modern interactive dashboard.
- Smooth transitions and scroll effects.
- Subtle 3D-inspired visuals.
- Responsive hover and click feedback.
- Topic mastery visualizations.
- Accessible layouts and clear learning states.

---

🔄 How It Works

flowchart TD
    A["📚 Add Study Materials"] --> B["🧠 AI Tutor & Source Retrieval"]
    C["📋 Add Subjects and Exam Deadlines"] --> D["📅 Personalized Study Plan"]
    B --> E["📝 Custom Quiz or Mock Exam"]
    D --> E
    E --> F["🔍 Evaluate Answers"]
    F --> G["📊 Analyze Strong and Weak Topics"]
    G --> H["🎯 Generate Targeted Revision"]
    H --> I["🔁 Take Another Practice Test"]
    I --> J["📈 Update Learning Estimates"]
    J --> D

The learning loop: Plan → Learn → Practice → Evaluate → Improve → Repeat.

🖥️ Experience the Platform

Add real screenshots or a short GIF of your working application here.

Dashboard| AI Tutor
Add your dashboard screenshot to "assets/dashboard.png"| Add your tutor screenshot to "assets/ai-tutor.png"
Exam Planner| Assessment Results
Add "assets/exam-planner.png"| Add "assets/results.png"

Replace these placeholders with actual screenshots after the corresponding features work.

🛠️ Technology Stack

Technology| Purpose
Python| Application logic and learning algorithms
Streamlit| Interactive web application, if used by the project
Google Gemini API| AI tutoring, question generation, and supported evaluation tasks
PyMuPDF| PDF text extraction
python-pptx| PowerPoint text extraction
Embeddings and retrieval| Finding relevant passages in uploaded materials
<<<<<<< HEAD
Firebase Authentication + Cloud Firestore| Cross-account Study Friends, friend requests, and weekly score sharing
=======
Firebase| Optional authentication and persistent storage
>>>>>>> b48eb4a78d3247212f347e1e082aff6afaaa41ca
RAGAS or suitable evaluation tools| Measuring retrieval and answer quality

The final stack depends on the implemented codebase. Remove technologies that are not actually used.

🏗️ Architecture

flowchart LR
    U["👩‍🎓 Student"] --> UI["LearnPilot AI Interface"]
    UI --> M["Material Ingestion"]
    UI --> P["Exam Planner"]
    UI --> Q["Assessment Engine"]
    M --> R["Source Retrieval"]
    R --> G["Gemini AI"]
    Q --> E["Grading & Feedback"]
    E --> L["Learner Model"]
    L --> F["Learning Forecast"]
    L --> P
    G --> UI
    E --> UI
    F --> UI
    DB[("Persistent Storage")] <--> P
    DB <--> Q
    DB <--> L

🚀 Getting Started

Prerequisites

<<<<<<< HEAD
- Node.js 20 or later.
- Git.
- A Google AI Studio API key if Gemini-powered features are enabled.
- The project source code.
- A Firebase project if you want to use cross-account Study Friends.

1. Install dependencies

From the project directory, install the JavaScript dependencies:

npm install

2. Configure local environment

Copy `.env.example` to `.env`. Add a Google AI Studio API key if Gemini-powered features are enabled. To enable cross-account Study Friends, create a Firebase web app and fill in the `VITE_FIREBASE_*` values.

In Firebase Console:

- Enable Email/Password under Authentication → Sign-in method.
- Create a Cloud Firestore database.
- Publish the rules from `firestore.rules` in Firestore → Rules.

Firebase web app configuration is designed to be public; secure access with Firebase Authentication and the included Firestore rules. Never commit `.env`, service-account credentials, passwords, or real student records.

3. Run the application

npm run dev

Open the local URL printed in the terminal, usually:

http://localhost:3000

Study Friends uses email/password accounts, friend codes, accepted friend requests, and a weekly leaderboard. The weekly study score is completed scheduled minutes divided by planned minutes; it is a motivational measure, not an exam grade. Only weekly totals are shared with accepted friends. Scores are calculated from client-side planner data and are not independently verified.
=======
- Python 3.10 or a compatible version supported by your dependencies.
- Git.
- A Google AI Studio API key if Gemini-powered features are enabled.
- The project source code.

1. Clone the repository

git clone https://github.com/YOUR-USERNAME/LearnPilot-AI.git
cd LearnPilot-AI

Replace "YOUR-USERNAME" with your GitHub username.

2. Create a virtual environment

python -m venv .venv

Activate it on Windows:

.venv\Scripts\activate

Activate it on Linux or macOS:

source .venv/bin/activate

3. Install dependencies

pip install -r requirements.txt

4. Configure your API key

Get your key from "Google AI Studio" (https://aistudio.google.com/).

For local development, use the secret-management approach supported by your application. If using Streamlit secrets, create ".streamlit/secrets.toml" locally:

GEMINI_API_KEY = "YOUR_API_KEY_HERE"

Alternatively, use the environment variable approach implemented in your code.

Security: Never commit API keys, service-account files, passwords, or real student records. Add local secret files to ".gitignore".

5. Run the application

For a Streamlit application:

streamlit run app.py

If your entry-point filename differs, use the actual filename in your repository.

6. Open the application

Streamlit will provide a local URL, usually:

http://localhost:8501

Follow the terminal output if another port is selected.
>>>>>>> b48eb4a78d3247212f347e1e082aff6afaaa41ca

🧪 Quality & Evaluation

LearnPilot AI aims to measure learning-system quality rather than relying only on visual demonstrations.

Potential evaluation areas:

- Grounding: Are tutor responses supported by retrieved passages?
- Citation correctness: Does each citation identify the correct source location?
- Retrieval quality: Are relevant passages retrieved for a question?
- Assessment quality: Are questions and answer keys consistent?
- Grading quality: Are awarded marks consistent with the configured rubric?
- Adaptivity: Do recommendations respond to actual student performance?
- Forecast quality: How close are predictions to later observed results?
- Reliability: Does the application handle missing data and API failures safely?

Publish actual test results when available. Do not report unmeasured accuracy, learning gains, or prediction performance.

🗺️ Roadmap

- [x] Define the personalized learning platform concept.
- [x] Establish the core product direction.
- [ ] Build reliable PDF ingestion and source citations.
- [ ] Implement grounded AI tutoring.
- [ ] Add subject and topic management.
- [ ] Generate personalized study plans and exam schedules.
- [ ] Implement customizable examinations and mock tests.
- [ ] Add answer evaluation and detailed score reports.
- [ ] Generate weak-topic learning paths.
- [ ] Build weekly learning growth forecasts.
<<<<<<< HEAD
- [x] Add cross-account Study Friends and a weekly study leaderboard (requires Firebase project configuration).
=======
>>>>>>> b48eb4a78d3247212f347e1e082aff6afaaa41ca
- [ ] Add persistent learner profiles.
- [ ] Evaluate grounding, assessment quality, and forecast accuracy.
- [ ] Deploy the application and publish a complete demonstration.

Update the checklist as each feature is implemented and tested.

🔐 Privacy & Responsible AI

- Protect student records and API credentials.
- Restrict access to each student's own data.
- Keep source references traceable to the uploaded material.
- Communicate uncertainty when evidence is insufficient.
- Treat automated grading and learning forecasts as fallible.
- Provide manual review for ambiguous evaluations.
- Avoid presenting estimated mastery as a definitive measure of ability.

🎯 Project Goals

LearnPilot AI is being developed for Personalized Tutoring & Adaptive Learning (Track D), with a focus on source-grounded explanations, measurable assessment feedback, and individualized exam preparation.

The goal is to demonstrate a working learning loop—not simply another AI chatbot.

🤝 Contributing

Ideas, issue reports, and improvements are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Make a focused change.
4. Test the change.
5. Open a pull request with a clear explanation.

📌 Current Status

LearnPilot AI is under active development. Feature availability depends on the current implementation. Consult the code and roadmap before assuming a capability is production-ready.

📄 License

Choose a license before publishing the repository. If you intend to make the project open source, consider an appropriate license such as MIT after confirming that its terms fit your goals.

---

<p align="center">
  <strong>🚀 Learn Smarter. Plan Better. Master More.</strong>
  <br/>
  <em>One student. One personalized path. One step forward every day.</em>
</p>
