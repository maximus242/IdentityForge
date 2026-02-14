import type { NextPage } from 'next';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

type EntryPhase = 'energy' | 'morning' | 'values' | 'evening' | 'complete';

interface DailyEntryData {
  energyLevel: number | null;
  moodNote: string;
  selectedValues: Array<{ id: string; name: string }>;
  morningResponse: string;
  eveningResponse: string;
  alignmentScore: number | null;
}

const DailyEntry: NextPage = () => {
  const router = useRouter();
  const [phase, setPhase] = useState<EntryPhase>('energy');
  const [data, setData] = useState<DailyEntryData>({
    energyLevel: null,
    moodNote: '',
    selectedValues: [],
    morningResponse: '',
    eveningResponse: '',
    alignmentScore: null,
  });
  const [loading, setLoading] = useState(false);
  const [availableValues, setAvailableValues] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    async function fetchValues() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const response = await fetch('/api/values', {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        });

        if (response.ok) {
          const result = await response.json();
          setAvailableValues(result.values || []);
        }
      } catch (error) {
        console.error('Error fetching values:', error);
      }
    }

    fetchValues();
  }, []);

  const predefinedValues = [
    'Creativity', 'Growth', 'Connection', 'Freedom', 'Security',
    'Authenticity', 'Compassion', 'Courage', 'Curiosity', 'Peace',
    'Adventure', 'Health', 'Family', 'Nature', 'Learning'
  ];

  const handleEnergySelect = async (level: number) => {
    setData((prev) => ({ ...prev, energyLevel: level }));
    setPhase('morning');
  };

  const handleMorningSubmit = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }

      const today = new Date().toISOString().split('T')[0];

      const response = await fetch('/api/entries', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: today,
          energyLevel: data.energyLevel,
          morningResponse: data.morningResponse,
        }),
      });

      if (response.ok) {
        setPhase('values');
      }
    } catch (error) {
      console.error('Error saving morning entry:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleValueToggle = (value: { id: string; name: string }) => {
    setData((prev) => {
      const exists = prev.selectedValues.find((v) => v.id === value.id);
      const newValues = exists
        ? prev.selectedValues.filter((v) => v.id !== value.id)
        : [...prev.selectedValues, value];
      return { ...prev, selectedValues: newValues };
    });
  };

  const handleValuesSubmit = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }

      const today = new Date().toISOString().split('T')[0];

      // Get existing entry to update with values
      const entriesResponse = await fetch('/api/entries?limit=1', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      if (entriesResponse.ok) {
        const entriesData = await entriesResponse.json();
        const todayEntry = entriesData.entries?.find((e: any) =>
          new Date(e.date).toISOString().split('T')[0] === today
        );

        if (todayEntry && data.selectedValues.length > 0) {
          // Update entry with value IDs
          await fetch('/api/entries', {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: todayEntry.id,
              valueIds: data.selectedValues.map(v => v.id),
            }),
          });
        }
      }

      setPhase('evening');
    } catch (error) {
      console.error('Error saving values:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEveningSubmit = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }

      const today = new Date().toISOString().split('T')[0];

      // Get existing entry to update
      const entriesResponse = await fetch('/api/entries?limit=1', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      if (entriesResponse.ok) {
        const entriesData = await entriesResponse.json();
        const todayEntry = entriesData.entries?.find((e: any) =>
          new Date(e.date).toISOString().split('T')[0] === today
        );

        if (todayEntry) {
          await fetch('/api/entries', {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: todayEntry.id,
              eveningResponse: data.eveningResponse,
              alignmentScore: data.alignmentScore,
            }),
          });
        }
      }

      setPhase('complete');
    } catch (error) {
      console.error('Error saving evening entry:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAlignmentSelect = (score: number) => {
    setData((prev) => ({ ...prev, alignmentScore: score }));
  };

  // Render Energy Selection
  const renderEnergyPhase = () => (
    <div style={styles.phaseContainer}>
      <h2 style={styles.phaseTitle}>How's your energy today?</h2>
      <p style={styles.phaseSubtitle}>
        This helps us personalize your experience. Be honest - there's no right answer.
      </p>
      <div style={styles.energyGrid}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
          <button
            key={level}
            onClick={() => handleEnergySelect(level)}
            style={{
              ...styles.energyButton,
              ...(level <= 3 ? styles.energyLow : level <= 6 ? styles.energyMedium : styles.energyHigh),
            }}
          >
            {level}
          </button>
        ))}
      </div>
      <div style={styles.energyLabels}>
        <span>Low</span>
        <span>Medium</span>
        <span>High</span>
      </div>
    </div>
  );

  // Render Morning Reflection
  const renderMorningPhase = () => (
    <div style={styles.phaseContainer}>
      <h2 style={styles.phaseTitle}>Morning Reflection</h2>
      <p style={styles.phaseSubtitle}>
        {data.energyLevel && data.energyLevel <= 4
          ? "With lower energy today, let's keep this simple and gentle."
          : "Let's set intentions for the day ahead."}
      </p>
      <div style={styles.promptCard}>
        <p style={styles.promptText}>
          {data.energyLevel && data.energyLevel <= 4
            ? "What's one small thing that would feel good to do today?"
            : "How do you want to show up today? What's most important?"}
        </p>
      </div>
      <textarea
        value={data.morningResponse}
        onChange={(e) => setData((prev) => ({ ...prev, morningResponse: e.target.value }))}
        placeholder="Write your thoughts here..."
        style={styles.textarea}
        rows={6}
      />
      <button
        onClick={handleMorningSubmit}
        disabled={loading}
        style={styles.primaryButton}
      >
        {loading ? 'Saving...' : 'Continue'}
      </button>
    </div>
  );

  // Render Values Selection
  const renderValuesPhase = () => (
    <div style={styles.phaseContainer}>
      <h2 style={styles.phaseTitle}>Which values do you want to focus on today?</h2>
      <p style={styles.phaseSubtitle}>
        Select the values you'd like to honor today. You can select multiple.
      </p>
      <div style={styles.valuesGrid}>
        {availableValues.map((value) => (
          <button
            key={value.id}
            onClick={() => handleValueToggle(value)}
            style={{
              ...styles.valueChip,
              ...(data.selectedValues.find(v => v.id === value.id) ? styles.valueChipSelected : {}),
            }}
          >
            {value.name}
          </button>
        ))}
      </div>
      {availableValues.length === 0 && (
        <p style={{ color: '#666', marginBottom: '16px' }}>
          No values defined yet. Go to Values Discovery to create your values.
        </p>
      )}
      <button
        onClick={handleValuesSubmit}
        disabled={loading}
        style={styles.primaryButton}
      >
        {loading ? 'Saving...' : 'Continue to Evening'}
      </button>
    </div>
  );

  // Render Evening Reflection
  const renderEveningPhase = () => (
    <div style={styles.phaseContainer}>
      <h2 style={styles.phaseTitle}>Evening Reflection</h2>
      <p style={styles.phaseSubtitle}>Let's wrap up the day.</p>

      <div style={styles.promptCard}>
        <p style={styles.promptText}>
          How did today move you toward or away from who you want to be?
        </p>
      </div>
      <textarea
        value={data.eveningResponse}
        onChange={(e) => setData((prev) => ({ ...prev, eveningResponse: e.target.value }))}
        placeholder="Reflect on your day..."
        style={styles.textarea}
        rows={6}
      />

      <h3 style={styles.alignmentTitle}>How aligned did you feel today?</h3>
      <div style={styles.alignmentGrid}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
          <button
            key={score}
            onClick={() => handleAlignmentSelect(score)}
            style={{
              ...styles.alignmentButton,
              ...(data.alignmentScore === score ? styles.alignmentSelected : {}),
            }}
          >
            {score}
          </button>
        ))}
      </div>

      <button
        onClick={handleEveningSubmit}
        disabled={loading || data.alignmentScore === null}
        style={{
          ...styles.primaryButton,
          ...(loading || data.alignmentScore === null ? styles.buttonDisabled : {}),
        }}
      >
        {loading ? 'Saving...' : 'Complete Entry'}
      </button>
    </div>
  );

  // Render Complete
  const renderCompletePhase = () => (
    <div style={styles.phaseContainer}>
      <div style={styles.completeIcon}>✨</div>
      <h2 style={styles.phaseTitle}>Day Complete!</h2>
      <p style={styles.phaseSubtitle}>
        Great job reflecting today. Every entry brings you closer to understanding yourself.
      </p>

      <div style={styles.summaryCard}>
        <div style={styles.summaryItem}>
          <span style={styles.summaryLabel}>Energy</span>
          <span style={styles.summaryValue}>{data.energyLevel}/10</span>
        </div>
        <div style={styles.summaryItem}>
          <span style={styles.summaryLabel}>Alignment</span>
          <span style={styles.summaryValue}>{data.alignmentScore}/10</span>
        </div>
        <div style={styles.summaryItem}>
          <span style={styles.summaryLabel}>Values</span>
          <span style={styles.summaryValue}>{data.selectedValues.length} selected</span>
        </div>
      </div>

      <Link href="/dashboard" style={styles.primaryButtonLink}>
        Return to Dashboard
      </Link>
    </div>
  );

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <Link href="/dashboard" style={styles.backLink}>← Back to Dashboard</Link>
        <h1 style={styles.headerTitle}>Daily Entry</h1>
        <div style={styles.progressBar}>
          <div
            style={{
              ...styles.progressFill,
              width:
                phase === 'energy' ? '10%' :
                phase === 'morning' ? '30%' :
                phase === 'values' ? '60%' :
                phase === 'evening' ? '90%' : '100%',
            }}
          />
        </div>
      </header>

      <main style={styles.main}>
        {phase === 'energy' && renderEnergyPhase()}
        {phase === 'morning' && renderMorningPhase()}
        {phase === 'values' && renderValuesPhase()}
        {phase === 'evening' && renderEveningPhase()}
        {phase === 'complete' && renderCompletePhase()}
      </main>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    background: '#f8f9fa',
  },
  header: {
    background: 'white',
    borderBottom: '1px solid #e9ecef',
    padding: '16px 24px',
  },
  backLink: {
    display: 'inline-block',
    fontSize: '14px',
    color: '#667eea',
    textDecoration: 'none',
    marginBottom: '8px',
  },
  headerTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
    margin: 0,
  },
  progressBar: {
    height: '4px',
    background: '#e9ecef',
    borderRadius: '2px',
    marginTop: '16px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    transition: 'width 0.3s ease',
  },
  main: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '32px 24px',
  },
  phaseContainer: {
    textAlign: 'center',
  },
  phaseTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333',
    margin: '0 0 8px 0',
  },
  phaseSubtitle: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '32px',
  },
  energyGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '12px',
    marginBottom: '16px',
  },
  energyButton: {
    padding: '20px',
    borderRadius: '12px',
    border: 'none',
    fontSize: '24px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'transform 0.2s',
  },
  energyLow: {
    background: '#fed7d7',
    color: '#c53030',
  },
  energyMedium: {
    background: '#feebc8',
    color: '#c05621',
  },
  energyHigh: {
    background: '#c6f6d5',
    color: '#276749',
  },
  energyLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    color: '#666',
    marginBottom: '32px',
  },
  promptCard: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    color: 'white',
  },
  promptText: {
    fontSize: '18px',
    margin: 0,
    fontStyle: 'italic',
  },
  textarea: {
    width: '100%',
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid #ddd',
    fontSize: '16px',
    fontFamily: 'inherit',
    resize: 'vertical' as const,
    marginBottom: '24px',
    boxSizing: 'border-box',
  },
  primaryButton: {
    padding: '16px 32px',
    borderRadius: '12px',
    border: 'none',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  valuesGrid: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '10px',
    justifyContent: 'center',
    marginBottom: '32px',
  },
  valueChip: {
    padding: '10px 18px',
    borderRadius: '24px',
    border: '2px solid #e9ecef',
    background: 'white',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  valueChipSelected: {
    borderColor: '#667eea',
    background: '#667eea',
    color: 'white',
  },
  alignmentTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '16px',
  },
  alignmentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '10px',
    marginBottom: '32px',
  },
  alignmentButton: {
    padding: '14px',
    borderRadius: '8px',
    border: '2px solid #e9ecef',
    background: 'white',
    fontSize: '18px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  alignmentSelected: {
    borderColor: '#667eea',
    background: '#667eea',
    color: 'white',
  },
  completeIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  summaryCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '32px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
  },
  summaryItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: '1px solid #e9ecef',
  },
  summaryLabel: {
    color: '#666',
    fontSize: '14px',
  },
  summaryValue: {
    color: '#333',
    fontWeight: '600',
    fontSize: '16px',
  },
  primaryButtonLink: {
    display: 'inline-block',
    padding: '16px 32px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    fontSize: '16px',
    fontWeight: '600',
    borderRadius: '12px',
    textDecoration: 'none',
  },
};

export default DailyEntry;
