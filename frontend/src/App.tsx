import { useState } from 'react';
import { BanksList } from './components/BanksList';
import { BankDetail } from './components/BankDetail';
import { PracticeSession } from './components/PracticeSession';
import { Results } from './components/Results';
import './App.css';

export type Bank = {
  id: string;
  subject: string;
  questions?: Question[];
};

export type Question = {
  id: string;
  subject: string;
  expected_answer?: string;
};

export type Session = {
  id: string;
  questions: Question[];
};

export type SessionResult = {
  session_id: string;
  total_score: number;
  max_score: number;
  results: {
    score: number;
    covered: string[];
    missed: string[];
  }[];
};

type View = 
  | { type: 'banks' }
  | { type: 'bank'; bankId: string }
  | { type: 'practice'; session: Session; bankSubject: string }
  | { type: 'results'; results: SessionResult; questions: Question[]; bankSubject: string };

const API_BASE = 'http://localhost:8080';

export const api = {
  async getBanks(): Promise<Bank[]> {
    const res = await fetch(`${API_BASE}/banks`);
    if (!res.ok) throw new Error('Failed to fetch banks');
    return res.json();
  },

  async getBank(id: string): Promise<Bank> {
    const res = await fetch(`${API_BASE}/banks/${id}`);
    if (!res.ok) throw new Error('Bank not found');
    return res.json();
  },

  async createBank(subject: string): Promise<Bank> {
    const res = await fetch(`${API_BASE}/banks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject }),
    });
    if (!res.ok) throw new Error('Failed to create bank');
    return res.json();
  },

  async addQuestion(bankId: string, subject: string, expected_answer: string): Promise<Question> {
    const res = await fetch(`${API_BASE}/banks/${bankId}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject, expected_answer }),
    });
    if (!res.ok) throw new Error('Failed to add question');
    return res.json();
  },

  async createSession(bankId: string): Promise<Session> {
    const res = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bank_id: bankId }),
    });
    if (!res.ok) throw new Error('Failed to create session');
    return res.json();
  },

  async submitAnswer(sessionId: string, questionId: string, response: string): Promise<void> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question_id: questionId, response }),
    });
    if (!res.ok) throw new Error('Failed to submit answer');
  },

  async completeSession(sessionId: string): Promise<SessionResult> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/complete`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to complete session');
    return res.json();
  },
};

function App() {
  const [view, setView] = useState<View>({ type: 'banks' });
  const [isLoading, setIsLoading] = useState(false);

  const navigate = {
    toBanks: () => setView({ type: 'banks' }),
    toBank: (bankId: string) => setView({ type: 'bank', bankId }),
    toPractice: (session: Session, bankSubject: string) => 
      setView({ type: 'practice', session, bankSubject }),
    toResults: (results: SessionResult, questions: Question[], bankSubject: string) => 
      setView({ type: 'results', results, questions, bankSubject }),
  };

  return (
    <div className="app">
      <header className="header">
        <button className="logo" onClick={navigate.toBanks}>
          <span className="logo-icon">◈</span>
          <span className="logo-text">Remaimber</span>
        </button>
      </header>

      <main className="main">
        {view.type === 'banks' && (
          <BanksList onSelectBank={navigate.toBank} />
        )}
        {view.type === 'bank' && (
          <BankDetail 
            bankId={view.bankId} 
            onBack={navigate.toBanks}
            onStartPractice={navigate.toPractice}
          />
        )}
        {view.type === 'practice' && (
          <PracticeSession
            session={view.session}
            bankSubject={view.bankSubject}
            onComplete={(results) => navigate.toResults(results, view.session.questions, view.bankSubject)}
            onCancel={navigate.toBanks}
          />
        )}
        {view.type === 'results' && (
          <Results
            results={view.results}
            questions={view.questions}
            bankSubject={view.bankSubject}
            onBack={navigate.toBanks}
          />
        )}
      </main>
    </div>
  );
}

export default App;
