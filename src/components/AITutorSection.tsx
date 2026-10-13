import React, { useState } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  BookOpen,
  User,
  MessageSquare,
  HelpCircle,
  Lightbulb
} from 'lucide-react';
import { Subject, GradingResult } from '../types';
import { ApiClient } from '../services/apiClient';

interface AITutorSectionProps {
  subjects: Subject[];
  history: GradingResult[];
}

export const AITutorSection: React.FC<AITutorSectionProps> = ({
  subjects,
  history
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(subjects[0]?.id || '');
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string; timestamp: string }>>([
    {
      role: 'assistant',
      text: 'Hello! I am your LearnPilot AI Tutor. I am grounded in your syllabus notes, upcoming exam deadlines, and recent test performance. What concept would you like to master today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const currentSubj = subjects.find(s => s.id === selectedSubjectId) || subjects[0];
  const latestGrading = history[history.length - 1];

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userText = inputMessage.trim();
    setInputMessage('');
    const newMessages = [
      ...messages,
      {
        role: 'user' as const,
        text: userText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const reply = await ApiClient.askTutor({
        message: userText,
        context: {
          subjectName: currentSubj?.name,
          weakConcepts: latestGrading?.weakTopics || [],
          recentScore: latestGrading?.percentage,
          sourceNotes: currentSubj?.sourceMaterialNotes
        }
      });

      setMessages([
        ...newMessages,
        {
          role: 'assistant' as const,
          text: reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err: any) {
      setMessages([
        ...newMessages,
        {
          role: 'assistant' as const,
          text: 'I ran into an issue connecting to the AI tutor service. Please check your network connection and try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInputMessage(prompt);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Banner */}
      <div className="glass-panel rounded-2xl p-6 border border-indigo-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Bot className="w-5 h-5 text-cyan-400" />
            Source-Grounded AI Academic Tutor
          </h2>
          <p className="text-xs text-slate-400">
            Explains concepts step-by-step, grounded in your syllabus notes and recent diagnostic test results.
          </p>
        </div>

        {/* Course Filter */}
        {subjects.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Context:</span>
            <select
              value={selectedSubjectId}
              onChange={e => setSelectedSubjectId(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
            >
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Quick Prompts */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          `Explain the core intuition behind ${currentSubj?.topics[0]?.name || 'this topic'}`,
          `Why did I lose marks in my last test on ${latestGrading?.weakTopics[0] || 'the latest topic'}?`,
          `Give me a fast derivation of the key formula in ${currentSubj?.name || 'this subject'}`
        ].map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleQuickPrompt(prompt)}
            className="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-medium whitespace-nowrap cursor-pointer transition-colors"
          >
            💡 {prompt}
          </button>
        ))}
      </div>

      {/* Chat Messages Container */}
      <div className="glass-panel-glow rounded-2xl border border-indigo-500/30 p-5 flex flex-col h-[520px]">
        <div className="flex-1 overflow-y-auto space-y-4 pr-2">
          {messages.map((m, idx) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={idx}
                className={`flex gap-3 text-xs ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] rounded-2xl p-4 leading-relaxed ${
                    isUser
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md'
                      : 'bg-slate-900/90 border border-slate-800 text-slate-200'
                  }`}
                >
                  <div className="whitespace-pre-line">{m.text}</div>
                  <div className={`text-[10px] mt-1.5 text-right ${isUser ? 'text-indigo-200' : 'text-slate-500'}`}>
                    {m.timestamp}
                  </div>
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 text-xs">
              <div className="w-8 h-8 rounded-xl bg-indigo-950/80 border border-indigo-500/40 flex items-center justify-center text-cyan-400 shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-slate-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse delay-100" />
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse delay-200" />
                <span>LearnPilot AI is synthesizing grounded guidance...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="pt-4 border-t border-slate-800/80 flex items-center gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={e => setInputMessage(e.target.value)}
            placeholder={`Ask a question grounded in ${currentSubj?.name || 'your curriculum'}...`}
            className="flex-1 px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={isLoading || !inputMessage.trim()}
            className="p-3 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-lg shadow-indigo-600/30 hover:scale-105 transition-transform disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
