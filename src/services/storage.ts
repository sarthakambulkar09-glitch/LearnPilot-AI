import {
  Subject,
  ExamDeadline,
  StudyPlannerConfig,
  StudySession,
  ExamPaper,
  GradingResult,
  RemedialLearningPath,
  InAppNotification,
  StudentAcademicProfile,
  Flashcard
} from '../types';

const STORAGE_KEYS = {
  SUBJECTS: 'learnpilot_subjects_v2',
  DEADLINES: 'learnpilot_deadlines_v2',
  CONFIG: 'learnpilot_config_v2',
  SESSIONS: 'learnpilot_sessions_v2',
  PAPERS: 'learnpilot_papers_v2',
  HISTORY: 'learnpilot_history_v2',
  REMEDIAL: 'learnpilot_remedial_v2',
  NOTIFICATIONS: 'learnpilot_notifications_v2',
  INITIALIZED: 'learnpilot_initialized_v2',
  PROFILE: 'learnpilot_profile_v2',
  ACTIVE_EXAM: 'learnpilot_active_exam_v2',
  FLASHCARDS: 'learnpilot_flashcards_v2'
};

export const DEFAULT_STUDENT_PROFILE: StudentAcademicProfile = {
  fieldOfStudy: 'Engineering (Computer Science)',
  currentRunningYear: '3rd Year (Junior)',
  targetExamType: 'University Term Finals & Placement Exams',
  institutionName: 'Institute of Technology'
};

export const DEFAULT_PLANNER_CONFIG: StudyPlannerConfig = {
  availableHoursPerDay: 3.5,
  preferredDays: [1, 2, 3, 4, 5, 6], // Mon-Sat
  maxDailyHours: 4.5,
  unavailableDates: [],
  revisionPreference: 'spaced',
  mockTestFrequencyDays: 5,
  dailyReminderEnabled: true
};

// Initial default empty or demo structures
export const INITIAL_DEMO_SUBJECTS: Subject[] = [
  {
    id: 'subj_cs_algo',
    name: 'Advanced Data Structures & Algorithms',
    code: 'CS-401',
    color: '#6366f1',
    createdAt: '2026-10-01T08:00:00Z',
    sourceMaterialNotes: 'Lectures 1-8: Asymptotic analysis, balanced BSTs, graph traversals, dynamic programming subproblems, Bellman-Ford algorithm.',
    topics: [
      {
        id: 't_algo_complexity',
        name: 'Asymptotic Complexity & Master Theorem',
        difficulty: 'easy',
        weightage: 20,
        currentMastery: 85,
        estimatedHoursNeeded: 4,
        subtopics: ['Big-O / Omega / Theta', 'Recurrence Relations', 'Master Method Cases']
      },
      {
        id: 't_algo_graphs',
        name: 'Graph Traversal & Shortest Paths',
        difficulty: 'medium',
        weightage: 30,
        currentMastery: 68,
        prerequisites: ['t_algo_complexity'],
        estimatedHoursNeeded: 6,
        subtopics: ['BFS/DFS', 'Dijkstra Priority Queue', 'Bellman-Ford & Negative Cycles']
      },
      {
        id: 't_algo_dp',
        name: 'Dynamic Programming & Memoization',
        difficulty: 'hard',
        weightage: 35,
        currentMastery: 45,
        prerequisites: ['t_algo_complexity'],
        estimatedHoursNeeded: 8,
        subtopics: ['Optimal Substructure', '0/1 Knapsack', 'Matrix Chain Multiplication']
      },
      {
        id: 't_algo_trees',
        name: 'Red-Black Trees & Balanced Search Trees',
        difficulty: 'medium',
        weightage: 15,
        currentMastery: 72,
        estimatedHoursNeeded: 5,
        subtopics: ['Tree Rotations', 'Invariants', 'B-Trees']
      }
    ]
  },
  {
    id: 'subj_phys_em',
    name: 'Electromagnetism & Wave Mechanics',
    code: 'PHYS-202',
    color: '#06b6d4',
    createdAt: '2026-10-02T09:00:00Z',
    sourceMaterialNotes: 'University Physics Vol 2: Gauss Law, Ampere circuital law, Faraday induction, Maxwell correction, wave equation in vacuum.',
    topics: [
      {
        id: 't_phys_gauss',
        name: 'Gauss Law & Electrostatic Flux',
        difficulty: 'easy',
        weightage: 25,
        currentMastery: 80,
        estimatedHoursNeeded: 4,
        subtopics: ['Symmetry integration', 'Conductor boundary conditions']
      },
      {
        id: 't_phys_maxwell',
        name: 'Maxwell Equations & Displacement Current',
        difficulty: 'hard',
        weightage: 40,
        currentMastery: 52,
        prerequisites: ['t_phys_gauss'],
        estimatedHoursNeeded: 7,
        subtopics: ['Faraday Law', 'Displacement Current', 'Poynting Vector']
      },
      {
        id: 't_phys_optics',
        name: 'Electromagnetic Wave Propagation & Optics',
        difficulty: 'medium',
        weightage: 35,
        currentMastery: 64,
        estimatedHoursNeeded: 5,
        subtopics: ['Wave equations', 'Reflection coefficients', 'Polarization']
      }
    ]
  }
];

export const INITIAL_DEMO_DEADLINES: ExamDeadline[] = [
  {
    id: 'dl_cs_midterm',
    subjectId: 'subj_cs_algo',
    examName: 'CS-401 Midterm Examination',
    examDate: '2026-10-24T09:00:00Z',
    targetMarks: 85,
    totalExamMarks: 100,
    targetPercentage: 85,
    weightage: 30,
    notes: 'Covers Complexity, Graphs, and DP foundations. Negative marking 0.25 applies for MCQs.'
  },
  {
    id: 'dl_phys_final',
    subjectId: 'subj_phys_em',
    examName: 'PHYS-202 Departmental Assessment',
    examDate: '2026-10-28T13:30:00Z',
    targetMarks: 80,
    totalExamMarks: 100,
    targetPercentage: 80,
    weightage: 25,
    notes: 'Formula sheet provided. Focus on numerical integration of Poynting vector.'
  }
];

export const INITIAL_DEMO_HISTORY: GradingResult[] = [
  {
    id: 'eval_demo_1',
    examId: 'paper_cs_diagnostic',
    examTitle: 'CS-401 Baseline Diagnostic Quiz',
    subjectId: 'subj_cs_algo',
    subjectName: 'Advanced Data Structures & Algorithms',
    timestamp: '2026-10-06T14:30:00Z',
    durationSpentSeconds: 1250,
    totalMarksObtained: 38,
    maxPossibleMarks: 50,
    percentage: 76.0,
    passed: true,
    correctCount: 4,
    partialCount: 1,
    incorrectCount: 1,
    unansweredCount: 0,
    questionEvaluations: [
      {
        questionId: 'q_demo_1',
        topic: 'Asymptotic Complexity & Master Theorem',
        status: 'correct',
        maxMarks: 10,
        awardedMarks: 10,
        explanation: 'Accurate deduction of Master Theorem Case 2.',
        missingConcepts: [],
        correctModelSolution: 'T(n) = 2T(n/2) + O(n) yields O(n log n).'
      },
      {
        questionId: 'q_demo_2',
        topic: 'Dynamic Programming & Memoization',
        status: 'partially_correct',
        maxMarks: 10,
        awardedMarks: 6,
        explanation: 'Correct recurrence formula, but missed base case initialization for negative weights.',
        missingConcepts: ['Boundary handling in DP state tables'],
        correctModelSolution: 'Base case requires dp[0][w] = 0 for all w.'
      },
      {
        questionId: 'q_demo_3',
        topic: 'Graph Traversal & Shortest Paths',
        status: 'correct',
        maxMarks: 10,
        awardedMarks: 10,
        explanation: 'Dijkstra priority queue complexity correctly derived as O((V + E) log V).',
        missingConcepts: [],
        correctModelSolution: 'Each edge relaxed once with heap update.'
      },
      {
        questionId: 'q_demo_4',
        topic: 'Dynamic Programming & Memoization',
        status: 'incorrect',
        maxMarks: 10,
        awardedMarks: 2,
        explanation: 'Failed to demonstrate optimal substructure property for longest simple path.',
        missingConcepts: ['Optimal Substructure proofs in DP'],
        correctModelSolution: 'Longest simple path lacks optimal substructure due to cycle overlap.'
      },
      {
        questionId: 'q_demo_5',
        topic: 'Red-Black Trees & Balanced Search Trees',
        status: 'correct',
        maxMarks: 10,
        awardedMarks: 10,
        explanation: 'Correct color flip and right-rotation execution.',
        missingConcepts: [],
        correctModelSolution: 'Rotations preserve black-height invariant.'
      }
    ],
    subjectWiseMarks: {
      subj_cs_algo: { obtained: 38, max: 50, percentage: 76 }
    },
    topicWiseMarks: {
      'Asymptotic Complexity & Master Theorem': { obtained: 10, max: 10, percentage: 100 },
      'Graph Traversal & Shortest Paths': { obtained: 10, max: 10, percentage: 100 },
      'Red-Black Trees & Balanced Search Trees': { obtained: 10, max: 10, percentage: 100 },
      'Dynamic Programming & Memoization': { obtained: 8, max: 20, percentage: 40 }
    },
    strongTopics: ['Asymptotic Complexity & Master Theorem', 'Graph Traversal & Shortest Paths'],
    weakTopics: ['Dynamic Programming & Memoization'],
    repeatedMistakes: ['Boundary handling in DP state tables', 'Optimal Substructure proofs in DP'],
    missingConcepts: ['Optimal Substructure proofs in DP'],
    recommendedRevisionPriorities: ['Dynamic Programming & Memoization'],
    evaluationMode: 'digital'
  },
  {
    id: 'eval_demo_2',
    examId: 'paper_phys_1',
    examTitle: 'PHYS-202 Electromagnetics Mid-Check',
    subjectId: 'subj_phys_em',
    subjectName: 'Electromagnetism & Wave Mechanics',
    timestamp: '2026-10-09T16:00:00Z',
    durationSpentSeconds: 1500,
    totalMarksObtained: 36,
    maxPossibleMarks: 50,
    percentage: 72.0,
    passed: true,
    correctCount: 3,
    partialCount: 2,
    incorrectCount: 1,
    unansweredCount: 0,
    questionEvaluations: [
      {
        questionId: 'qp1',
        topic: 'Gauss Law & Electrostatic Flux',
        status: 'correct',
        maxMarks: 12,
        awardedMarks: 12,
        explanation: 'Integration over Gaussian cylinder correctly evaluated.',
        missingConcepts: [],
        correctModelSolution: 'Flux = q_enc / epsilon_0'
      },
      {
        questionId: 'qp2',
        topic: 'Maxwell Equations & Displacement Current',
        status: 'partially_correct',
        maxMarks: 18,
        awardedMarks: 9,
        explanation: 'Displacement current term included, but missing boundary derivative dt term.',
        missingConcepts: ['Time-varying dielectric polarization rate'],
        correctModelSolution: 'J_d = epsilon * dE/dt'
      },
      {
        questionId: 'qp3',
        topic: 'Electromagnetic Wave Propagation & Optics',
        status: 'correct',
        maxMarks: 20,
        awardedMarks: 15,
        explanation: 'Poynting vector magnitude derived, minor unit conversion error.',
        missingConcepts: ['Poynting Vector instantaneous vs average'],
        correctModelSolution: 'S_avg = (1 / 2 mu_0) * (E x B*)'
      }
    ],
    subjectWiseMarks: {
      subj_phys_em: { obtained: 36, max: 50, percentage: 72 }
    },
    topicWiseMarks: {
      'Gauss Law & Electrostatic Flux': { obtained: 12, max: 12, percentage: 100 },
      'Maxwell Equations & Displacement Current': { obtained: 9, max: 18, percentage: 50 },
      'Electromagnetic Wave Propagation & Optics': { obtained: 15, max: 20, percentage: 75 }
    },
    strongTopics: ['Gauss Law & Electrostatic Flux', 'Electromagnetic Wave Propagation & Optics'],
    weakTopics: ['Maxwell Equations & Displacement Current'],
    repeatedMistakes: ['Time-varying dielectric polarization rate'],
    missingConcepts: ['Time-varying dielectric polarization rate'],
    recommendedRevisionPriorities: ['Maxwell Equations & Displacement Current'],
    evaluationMode: 'digital'
  },
  {
    id: 'eval_demo_3',
    examId: 'paper_cs_mini_check',
    examTitle: 'CS-401 Spaced Review Quiz',
    subjectId: 'subj_cs_algo',
    subjectName: 'Advanced Data Structures & Algorithms',
    timestamp: '2026-10-12T11:15:00Z',
    durationSpentSeconds: 1100,
    totalMarksObtained: 41,
    maxPossibleMarks: 50,
    percentage: 82.0,
    passed: true,
    correctCount: 4,
    partialCount: 1,
    incorrectCount: 0,
    unansweredCount: 0,
    questionEvaluations: [
      {
        questionId: 'qc1',
        topic: 'Asymptotic Complexity & Master Theorem',
        status: 'correct',
        maxMarks: 10,
        awardedMarks: 10,
        explanation: 'Master theorem subcase 3 regularity condition verified.',
        missingConcepts: [],
        correctModelSolution: 'af(n/b) <= cf(n) satisfied.'
      },
      {
        questionId: 'qc2',
        topic: 'Dynamic Programming & Memoization',
        status: 'partially_correct',
        maxMarks: 15,
        awardedMarks: 11,
        explanation: 'Clear improvement in memoization table structure. Minor time complexity overestimate.',
        missingConcepts: ['Topological order in DAG DP'],
        correctModelSolution: 'State space O(V+E).'
      },
      {
        questionId: 'qc3',
        topic: 'Graph Traversal & Shortest Paths',
        status: 'correct',
        maxMarks: 25,
        awardedMarks: 20,
        explanation: 'Bellman-Ford negative weight cycle detection explained precisely.',
        missingConcepts: [],
        correctModelSolution: 'V-th iteration check.'
      }
    ],
    subjectWiseMarks: {
      subj_cs_algo: { obtained: 41, max: 50, percentage: 82 }
    },
    topicWiseMarks: {
      'Asymptotic Complexity & Master Theorem': { obtained: 10, max: 10, percentage: 100 },
      'Dynamic Programming & Memoization': { obtained: 11, max: 15, percentage: 73 },
      'Graph Traversal & Shortest Paths': { obtained: 20, max: 25, percentage: 80 }
    },
    strongTopics: ['Asymptotic Complexity & Master Theorem', 'Graph Traversal & Shortest Paths'],
    weakTopics: ['Dynamic Programming & Memoization'],
    repeatedMistakes: ['Topological order in DAG DP'],
    missingConcepts: ['Topological order in DAG DP'],
    recommendedRevisionPriorities: ['Dynamic Programming & Memoization'],
    evaluationMode: 'digital'
  }
];

export const INITIAL_DEMO_SESSIONS: StudySession[] = [
  {
    id: 'sess_1',
    subjectId: 'subj_cs_algo',
    topicId: 't_algo_complexity',
    title: 'CS-401: Asymptotic Complexity & Master Theorem',
    scheduledDate: '2026-10-10',
    durationMinutes: 60,
    type: 'study',
    completed: true,
    completedAt: '2026-10-10T11:00:00Z',
    notes: 'Completed recurrence proofs and practice set 1.'
  },
  {
    id: 'sess_2',
    subjectId: 'subj_cs_algo',
    topicId: 't_algo_graphs',
    title: 'CS-401: Graph Traversal & Shortest Paths',
    scheduledDate: '2026-10-11',
    durationMinutes: 90,
    type: 'study',
    completed: true,
    completedAt: '2026-10-11T17:30:00Z',
    notes: 'Dijkstra and Bellman-Ford implemented in notebook.'
  },
  {
    id: 'sess_3',
    subjectId: 'subj_cs_algo',
    topicId: 't_algo_dp',
    title: 'CS-401: Deep Study - Dynamic Programming & Memoization',
    scheduledDate: '2026-10-13',
    durationMinutes: 90,
    type: 'study',
    completed: false,
    notes: 'Target weak concept: 0/1 Knapsack recurrence and state tables.'
  },
  {
    id: 'sess_4',
    subjectId: 'subj_phys_em',
    topicId: 't_phys_maxwell',
    title: 'PHYS-202: Maxwell Equations & Displacement Current',
    scheduledDate: '2026-10-14',
    durationMinutes: 75,
    type: 'study',
    completed: false,
    notes: 'Derive wave equation from curl equations.'
  },
  {
    id: 'sess_5',
    subjectId: 'subj_cs_algo',
    topicId: 't_algo_dp',
    title: 'Spaced Revision: Dynamic Programming & Memoization',
    scheduledDate: '2026-10-16',
    durationMinutes: 45,
    type: 'revision',
    completed: false,
    notes: 'Active recall problem sets.'
  },
  {
    id: 'sess_6',
    subjectId: 'subj_cs_algo',
    topicId: 'all_topics',
    title: 'Full Diagnostic Mock Exam: CS-401 Midterm Examination',
    scheduledDate: '2026-10-22',
    durationMinutes: 90,
    type: 'mock',
    completed: false,
    notes: 'Strict exam timing under test environment.'
  }
];

export const INITIAL_DEMO_REMEDIAL_PATHS: RemedialLearningPath[] = [
  {
    id: 'rem_dp_1',
    subjectId: 'subj_cs_algo',
    topicId: 't_algo_dp',
    topicName: 'Dynamic Programming & Memoization',
    missingConcepts: [
      'Optimal Substructure proofs in DP',
      'Boundary handling in DP state tables',
      'Topological order in DAG DP'
    ],
    explanation: 'Dynamic Programming requires two necessary conditions: (1) Optimal Substructure, where the optimal solution to the problem contains optimal solutions to subproblems, and (2) Overlapping Subproblems, where the same subproblems are solved repeatedly. When formulating your state vector dp[i][w], ensure boundary conditions (i=0 or w=0) are explicitly initialized before iterating over transitions.',
    prerequisites: ['Recurrence Relations', 'Memoization Trees'],
    practiceQuestions: [
      {
        id: 'pq_1',
        text: 'State why the Longest Simple Path in a general graph does not exhibit optimal substructure.',
        difficulty: 'medium',
        correctAnswer: 'A subpath of a simple path between u and v might not be simple when concatenated with another subpath if vertices overlap, creating an inter-subproblem dependency.'
      },
      {
        id: 'pq_2',
        text: 'In 0/1 Knapsack, if item weight w_i > current capacity W, what is the exact transition rule?',
        difficulty: 'easy',
        correctAnswer: 'dp[i][W] = dp[i-1][W], since item i cannot be included.'
      }
    ],
    miniTest: [
      {
        id: 'mt_1',
        text: 'Derive the time and space complexity of computing the Longest Common Subsequence of strings of length M and N with space-optimized DP.',
        type: 'short-answer',
        marks: 5,
        answer: 'Time: O(M * N); Space: O(min(M, N)) using two rolling rows.'
      }
    ],
    masteryCriteria: 'Score >= 80% on the verification mini-test to upgrade mastery to 70%+',
    completed: false
  }
];

export const INITIAL_DEMO_FLASHCARDS: Flashcard[] = [
  {
    id: 'fc_demo_1',
    subjectName: 'Advanced Data Structures & Algorithms',
    topicName: 'Dynamic Programming & Memoization',
    front: 'What are the two mandatory conditions required for a problem to be solvable via Dynamic Programming?',
    back: '1. Optimal Substructure: The optimal solution to the problem contains within it optimal solutions to subproblems.\n2. Overlapping Subproblems: The problem breaks down into identical smaller subproblems that are solved multiple times rather than generating new subproblems.',
    keyPoints: [
      'Optimal substructure guarantees correctness of recurrence relation',
      'Overlapping subproblems enables caching via table or memoization map',
      'If subproblems are independent and non-overlapping, use Divide & Conquer (e.g. Merge Sort)'
    ],
    mnemonic: 'O-O: Optimal Substructure + Overlapping Subproblems',
    difficulty: 'medium',
    mastered: false,
    reviewCount: 2,
    groundedCitation: 'CLRS Algorithms §15.3 Elements of Dynamic Programming'
  },
  {
    id: 'fc_demo_2',
    subjectName: 'Advanced Data Structures & Algorithms',
    topicName: 'Dynamic Programming & Memoization',
    front: 'In 0/1 Knapsack, if the weight of item i exceeds remaining capacity W (w_i > W), what is the exact state transition equation?',
    back: 'dp[i][W] = dp[i-1][W]. Since item i cannot physically fit in the backpack of capacity W, the maximum achievable value is simply whatever was possible using the first i-1 items at that exact capacity.',
    keyPoints: [
      'Do not subtract weight if it exceeds available capacity',
      'Prevents negative array index out-of-bounds in tabular DP',
      'Base case: dp[0][W] = 0 and dp[i][0] = 0'
    ],
    mnemonic: 'SKIP-IT: If w_i > W, copy previous row exactly',
    difficulty: 'easy',
    mastered: true,
    reviewCount: 3,
    groundedCitation: 'Algorithms §15.4 Tabular Recurrences'
  },
  {
    id: 'fc_demo_3',
    subjectName: 'Advanced Data Structures & Algorithms',
    topicName: 'Graph Algorithms & Shortest Paths',
    front: 'Why does Dijkstra’s algorithm fail on graphs with negative edge weights, and which algorithm must be used instead?',
    back: 'Dijkstra assumes that adding an edge to a known shortest path can never decrease its total length (greedy non-decreasing property). Once a vertex is marked visited/extracted, its distance is considered finalized. With negative edges, an unexplored path could become shorter later.\nUse Bellman-Ford (O(V·E)) or SPFA instead.',
    keyPoints: [
      'Dijkstra’s greedy invariant breaks with negative weights',
      'Bellman-Ford relaxes all E edges V-1 times to propagate negative weights',
      'A V-th relaxation cycle detects negative-weight cycles'
    ],
    mnemonic: 'B-F for Negatives: Bellman-Ford fixes Dijkstra’s blindspot',
    difficulty: 'medium',
    mastered: false,
    reviewCount: 1,
    groundedCitation: 'Network Flow & Path Invariants §24.3'
  },
  {
    id: 'fc_demo_4',
    subjectName: 'Advanced Data Structures & Algorithms',
    topicName: 'Binary Trees & Balanced BSTs',
    front: 'What is the AVL tree balancing invariant, and what rotations are required for a Right-Left (RL) heavy imbalance?',
    back: 'AVL Invariant: The balance factor (Height(Left) - Height(Right)) of every node must be in {-1, 0, 1}.\nFor an RL imbalance (Right child has positive balance factor): 1. Right rotation on the right child. 2. Left rotation on the parent node.',
    keyPoints: [
      'Balance factor must strictly remain within [-1, +1]',
      'Single rotation for LL or RR imbalances',
      'Double rotation for LR or RL imbalances'
    ],
    mnemonic: 'ZIG-ZAG: Convert RL into RR first, then rotate Left',
    difficulty: 'hard',
    mastered: false,
    reviewCount: 0,
    groundedCitation: 'Self-Balancing Trees §13.2'
  },
  {
    id: 'fc_demo_5',
    subjectName: 'Applied Thermodynamics',
    topicName: 'First Law of Thermodynamics',
    front: 'State the First Law of Thermodynamics for a closed system undergoing a change of state, and define each sign convention.',
    back: 'ΔU = Q - W (or ΔU = Q + W depending on work convention).\nUnder standard engineering convention (work done BY system is positive): ΔU is change in internal energy, Q is net heat added TO the system (+), and W is net work done BY the system (+).',
    keyPoints: [
      'Energy cannot be created or destroyed, only transformed',
      'Internal energy U is a state function; Q and W are path functions',
      'For an adiabatic process: Q = 0, therefore ΔU = -W'
    ],
    mnemonic: 'Q-IN, W-OUT: Heat added is positive, Work produced is positive',
    difficulty: 'easy',
    mastered: true,
    reviewCount: 4,
    groundedCitation: 'Cengel & Boles Thermodynamics §2.6'
  },
  {
    id: 'fc_demo_6',
    subjectName: 'Applied Thermodynamics',
    topicName: 'Carnot Cycle & Second Law',
    front: 'What is the theoretical maximum thermal efficiency of a Carnot heat engine operating between temperatures T_H and T_C (in Kelvin)?',
    back: 'η_Carnot = 1 - (T_C / T_H) = (T_H - T_C) / T_H.\nTemperatures MUST strictly be in absolute units (Kelvin). No real heat engine operating between the same two thermal reservoirs can achieve higher efficiency than a reversible Carnot engine.',
    keyPoints: [
      'Always convert Celsius to Kelvin (K = °C + 273.15)',
      'Efficiency increases as source temperature T_H rises or sink T_C drops',
      'Efficiency reaches 100% only if T_C = 0 K (absolute zero, impossible by Third Law)'
    ],
    mnemonic: 'DELTA-T over T-HIGH: Thermal span divided by source absolute temp',
    difficulty: 'medium',
    mastered: false,
    reviewCount: 2,
    groundedCitation: 'Carnot Heat Engines §6.8'
  }
];

export const StorageService = {
  // Flashcards
  getFlashcards(): Flashcard[] {
    const data = localStorage.getItem(STORAGE_KEYS.FLASHCARDS);
    if (!data) {
      this.initDefaultsIfEmpty();
      const loaded = localStorage.getItem(STORAGE_KEYS.FLASHCARDS);
      return loaded ? JSON.parse(loaded) : INITIAL_DEMO_FLASHCARDS;
    }
    return JSON.parse(data);
  },
  saveFlashcards(flashcards: Flashcard[]): void {
    localStorage.setItem(STORAGE_KEYS.FLASHCARDS, JSON.stringify(flashcards));
  },
  updateFlashcardMastery(id: string, mastered: boolean): void {
    const cards = this.getFlashcards();
    const updated = cards.map(c => {
      if (c.id === id) {
        return {
          ...c,
          mastered,
          reviewCount: (c.reviewCount || 0) + 1,
          lastReviewed: new Date().toISOString()
        };
      }
      return c;
    });
    this.saveFlashcards(updated);
  },
  addFlashcards(newCards: Flashcard[]): void {
    const existing = this.getFlashcards();
    const existingIds = new Set(existing.map(c => c.id));
    const merged = [...existing];
    newCards.forEach(c => {
      if (!existingIds.has(c.id)) {
        merged.push(c);
        existingIds.add(c.id);
      }
    });
    this.saveFlashcards(merged);
  },

  // Subjects
  getSubjects(): Subject[] {
    const data = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
    if (!data) {
      this.initDefaultsIfEmpty();
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.SUBJECTS) || '[]');
    }
    return JSON.parse(data);
  },
  saveSubjects(subjects: Subject[]): void {
    localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
  },

  // Deadlines
  getDeadlines(): ExamDeadline[] {
    const data = localStorage.getItem(STORAGE_KEYS.DEADLINES);
    if (!data) {
      this.initDefaultsIfEmpty();
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.DEADLINES) || '[]');
    }
    return JSON.parse(data);
  },
  saveDeadlines(deadlines: ExamDeadline[]): void {
    localStorage.setItem(STORAGE_KEYS.DEADLINES, JSON.stringify(deadlines));
  },

  // Planner Config
  getPlannerConfig(): StudyPlannerConfig {
    const data = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (!data) {
      return DEFAULT_PLANNER_CONFIG;
    }
    return JSON.parse(data);
  },
  savePlannerConfig(config: StudyPlannerConfig): void {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
  },

  // Study Sessions
  getStudySessions(): StudySession[] {
    const data = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    if (!data) {
      this.initDefaultsIfEmpty();
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.SESSIONS) || '[]');
    }
    return JSON.parse(data);
  },
  saveStudySessions(sessions: StudySession[]): void {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  },

  // Exam Papers
  getExamPapers(): ExamPaper[] {
    const data = localStorage.getItem(STORAGE_KEYS.PAPERS);
    return data ? JSON.parse(data) : [];
  },
  saveExamPapers(papers: ExamPaper[]): void {
    localStorage.setItem(STORAGE_KEYS.PAPERS, JSON.stringify(papers));
  },

  // History / Evaluations
  getGradingHistory(): GradingResult[] {
    const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (!data) {
      this.initDefaultsIfEmpty();
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY) || '[]');
    }
    return JSON.parse(data);
  },
  saveGradingResult(result: GradingResult): void {
    const history = this.getGradingHistory();
    // Prepend or append
    history.push(result);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));

    // Also update topic masteries in subjects based on this assessment
    this.updateTopicMasteriesFromGrading(result);
  },

  // Update topic mastery from actual score
  updateTopicMasteriesFromGrading(result: GradingResult): void {
    const subjects = this.getSubjects();
    let changed = false;

    if (!result || !result.topicWiseMarks) return;

    Object.entries(result.topicWiseMarks).forEach(([topicName, stats]) => {
      if (!topicName || !stats || typeof topicName !== 'string') return;
      const targetName = topicName.toLowerCase().trim();
      subjects.forEach(subj => {
        if (!subj || !Array.isArray(subj.topics)) return;
        const topic = subj.topics.find(t => t && typeof t.name === 'string' && t.name.toLowerCase().trim() === targetName);
        if (topic) {
          // Weighted update: 65% current, 35% new result
          const newMastery = Math.round(topic.currentMastery * 0.65 + (Number(stats.percentage) || 0) * 0.35);
          topic.currentMastery = Math.max(5, Math.min(100, newMastery));
          changed = true;
        }
      });
    });

    if (changed) {
      this.saveSubjects(subjects);
    }
  },

  // Remedial Paths
  getRemedialPaths(): RemedialLearningPath[] {
    const data = localStorage.getItem(STORAGE_KEYS.REMEDIAL);
    if (!data) {
      this.initDefaultsIfEmpty();
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.REMEDIAL) || '[]');
    }
    return JSON.parse(data);
  },
  saveRemedialPaths(paths: RemedialLearningPath[]): void {
    localStorage.setItem(STORAGE_KEYS.REMEDIAL, JSON.stringify(paths));
  },

  // Student Academic Profile
  getProfile(): StudentAcademicProfile {
    const data = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (!data) return DEFAULT_STUDENT_PROFILE;
    try {
      return JSON.parse(data);
    } catch {
      return DEFAULT_STUDENT_PROFILE;
    }
  },
  saveProfile(profile: StudentAcademicProfile): void {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  },

  // Active in-progress exam session (for autosave & refresh protection)
  getActiveExamSession(): { paper: ExamPaper; answers: Record<string, any>; secondsRemaining: number; currentQIndex: number } | null {
    const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_EXAM);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  },
  saveActiveExamSession(state: { paper: ExamPaper; answers: Record<string, any>; secondsRemaining: number; currentQIndex: number }): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_EXAM, JSON.stringify(state));
  },
  clearActiveExamSession(): void {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_EXAM);
  },

  // Notifications
  getNotifications(): InAppNotification[] {
    const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    return data ? JSON.parse(data) : [];
  },
  addNotification(notif: Omit<InAppNotification, 'id' | 'timestamp' | 'read'>): void {
    const list = this.getNotifications();
    list.unshift({
      ...notif,
      id: `notif_${Date.now()}`,
      timestamp: new Date().toISOString(),
      read: false
    });
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(list.slice(0, 30)));
  },
  markNotificationRead(id: string): void {
    const list = this.getNotifications().map(n => n.id === id ? { ...n, read: true } : n);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(list));
  },

  // Init defaults
  initDefaultsIfEmpty(): void {
    if (!localStorage.getItem(STORAGE_KEYS.INITIALIZED)) {
      this.loadDemoStudentData();
    }
  },

  // Reset to brand new student (completely blank, tests: 0, no invented marks)
  resetToFreshUser(): void {
    localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.DEADLINES, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(DEFAULT_PLANNER_CONFIG));
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PAPERS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.REMEDIAL, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.FLASHCARDS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([
      {
        id: 'notif_welcome',
        title: 'Welcome to LearnPilot AI',
        message: 'Get started by creating your subjects and upcoming exam deadlines, or take a diagnostic quiz to unlock learning forecasts.',
        timestamp: new Date().toISOString(),
        type: 'forecast_update',
        read: false
      }
    ]));
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'fresh');
  },

  // Load realistic comprehensive demo data for instant testing
  loadDemoStudentData(): void {
    localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(INITIAL_DEMO_SUBJECTS));
    localStorage.setItem(STORAGE_KEYS.DEADLINES, JSON.stringify(INITIAL_DEMO_DEADLINES));
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(DEFAULT_PLANNER_CONFIG));
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(INITIAL_DEMO_SESSIONS));
    localStorage.setItem(STORAGE_KEYS.PAPERS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(INITIAL_DEMO_HISTORY));
    localStorage.setItem(STORAGE_KEYS.REMEDIAL, JSON.stringify(INITIAL_DEMO_REMEDIAL_PATHS));
    localStorage.setItem(STORAGE_KEYS.FLASHCARDS, JSON.stringify(INITIAL_DEMO_FLASHCARDS));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([
      {
        id: 'notif_1',
        title: 'CS-401 Midterm in 11 Days',
        message: 'Your Dynamic Programming topic is currently flagged as High Risk. Remedial path available.',
        timestamp: new Date().toISOString(),
        type: 'exam_countdown',
        read: false
      },
      {
        id: 'notif_2',
        title: 'Study Session Due Today',
        message: 'CS-401: Deep Study - Dynamic Programming & Memoization (90 mins).',
        timestamp: new Date().toISOString(),
        type: 'session_due',
        read: false
      }
    ]));
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'demo');
  }
};
