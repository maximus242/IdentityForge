import type { NextPage } from 'next';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

interface IdentityData {
  name: string;
  statement: string;
  beliefs: string[];
  behaviors: string[];
  traits: string[];
  embodiment: string;
}

const IdentityCraft: NextPage = () => {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<IdentityData>({
    name: '',
    statement: '',
    beliefs: [],
    behaviors: [],
    traits: [],
    embodiment: '',
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchIdentity() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const response = await fetch('/api/identity', {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.archetype) {
            setData({
              name: result.archetype.name,
              statement: result.identityStatement || '',
              beliefs: result.archetype.beliefs || [],
              behaviors: result.archetype.behaviors || [],
              traits: result.archetype.traits || [],
              embodiment: result.archetype.embodiedPractice || '',
            });
          }
        }
      } catch (error) {
        console.error('Error fetching identity:', error);
      }
    }

    fetchIdentity();
  }, []);

  const handleNext = () => {
    setStep((prev) => prev + 1);
    setInput('');
  };

  const handleBack = () => {
    setStep((prev) => prev - 1);
    setInput('');
  };

  const addItem = (field: keyof Omit<IdentityData, 'name' | 'statement' | 'embodiment'>) => {
    if (input.trim()) {
      setData((prev) => ({
        ...prev,
        [field]: [...prev[field], input.trim()],
      }));
      setInput('');
    }
  };

  const removeItem = (field: keyof Omit<IdentityData, 'name' | 'statement' | 'embodiment'>, index: number) => {
    setData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/');
        return;
      }

      await fetch('/api/identity', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identityStatement: data.statement,
          name: data.name,
          beliefs: data.beliefs,
          behaviors: data.behaviors,
          traits: data.traits,
          embodiedPractice: data.embodiment,
        }),
      });

      setStep(6);
    } catch (error) {
      console.error('Error saving identity:', error);
    } finally {
      setLoading(false);
    }
  };

  // Render Step 1: Identity Name
  const renderStep1 = () => (
    <div style={styles.stepContainer}>
      <div style={styles.stepNumber}>Step 1 of 5</div>
      <h2 style={styles.stepTitle}>Name Your Identity</h2>
      <p style={styles.stepDescription}>
        If you could be the best version of yourself - not perfect, but the most aligned with what's truly important to you - what would you call this person?
      </p>
      <p style={styles.stepHint}>
        Think of a name or phrase that captures the essence. Examples: "The Creative Explorer", "The Compassionate Leader", "The Grounded Adventurer"
      </p>
      <input
        type="text"
        value={data.name}
        onChange={(e) => setData(prev => ({...prev, name: e.target.value}))}
        placeholder="Your identity name..."
        style={styles.textInput}
      />
      <div style={styles.buttonRow}>
        <button onClick={() => { if (data.name.trim()) handleNext(); }} disabled={!data.name.trim()} style={styles.primaryButton}>
          Continue
        </button>
      </div>
    </div>
  );

  // Render Step 2: Identity Statement
  const renderStep2 = () => (
    <div style={styles.stepContainer}>
      <div style={styles.stepNumber}>Step 2 of 5</div>
      <h2 style={styles.stepTitle}>Craft Your Statement</h2>
      <p style={styles.stepDescription}>
        Create a statement that captures who you want to become. This isn't a goal - it's an identity declaration.
      </p>
      <p style={styles.stepHint}>
        Try: "I am someone who..." or "My identity is defined by..."
      </p>
      <textarea
        value={data.statement}
        onChange={(e) => setData(prev => ({...prev, statement: e.target.value}))}
        placeholder="I am someone who..."
        style={styles.textarea}
        rows={4}
      />
      <div style={styles.buttonRow}>
        <button onClick={handleBack} style={styles.secondaryButton}>Back</button>
        <button onClick={() => { if (data.statement.trim()) handleNext(); }} disabled={!data.statement.trim()} style={styles.primaryButton}>
          Continue
        </button>
      </div>
    </div>
  );

  // Render Step 3: Beliefs
  const renderStep3 = () => (
    <div style={styles.stepContainer}>
      <div style={styles.stepNumber}>Step 3 of 5</div>
      <h2 style={styles.stepTitle}>Core Beliefs</h2>
      <p style={styles.stepDescription}>
        What does this version of you believe about themselves? About life? About what's possible?
      </p>
      <p style={styles.stepHint}>
        Examples: "I am capable of growth", "Challenges are opportunities", "I deserve good things"
      </p>
      <div style={styles.inputRow}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add a belief..."
          style={styles.chipInput}
          onKeyDown={(e) => e.key === 'Enter' && addItem('beliefs')}
        />
        <button onClick={() => addItem('beliefs')} style={styles.addButton}>Add</button>
      </div>
      <div style={styles.chipList}>
        {data.beliefs.map((belief, index) => (
          <div key={index} style={styles.chip}>
            <span>{belief}</span>
            <button onClick={() => removeItem('beliefs', index)} style={styles.removeButton}>×</button>
          </div>
        ))}
      </div>
      <div style={styles.buttonRow}>
        <button onClick={handleBack} style={styles.secondaryButton}>Back</button>
        <button onClick={handleNext} disabled={data.beliefs.length < 2} style={styles.primaryButton}>
          Continue
        </button>
      </div>
    </div>
  );

  // Render Step 4: Behaviors
  const renderStep4 = () => (
    <div style={styles.stepContainer}>
      <div style={styles.stepNumber}>Step 4 of 5</div>
      <h2 style={styles.stepTitle}>Key Behaviors</h2>
      <p style={styles.stepDescription}>
        How does this person act? What do they do differently than their old self?
      </p>
      <p style={styles.stepHint}>
        Examples: "Starts each day with intention", "Speaks up in meetings", "Takes time for reflection"
      </p>
      <div style={styles.inputRow}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add a behavior..."
          style={styles.chipInput}
          onKeyDown={(e) => e.key === 'Enter' && addItem('behaviors')}
        />
        <button onClick={() => addItem('behaviors')} style={styles.addButton}>Add</button>
      </div>
      <div style={styles.chipList}>
        {data.behaviors.map((behavior, index) => (
          <div key={index} style={styles.chip}>
            <span>{behavior}</span>
            <button onClick={() => removeItem('behaviors', index)} style={styles.removeButton}>×</button>
          </div>
        ))}
      </div>
      <div style={styles.buttonRow}>
        <button onClick={handleBack} style={styles.secondaryButton}>Back</button>
        <button onClick={handleNext} disabled={data.behaviors.length < 2} style={styles.primaryButton}>
          Continue
        </button>
      </div>
    </div>
  );

  // Render Step 5: Traits & Embodiment
  const renderStep5 = () => (
    <div style={styles.stepContainer}>
      <div style={styles.stepNumber}>Step 5 of 5</div>
      <h2 style={styles.stepTitle}>Character & Embodiment</h2>
      <p style={styles.stepDescription}>
        What character traits define this person? And how does this identity feel in your body?
      </p>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Character Traits</h3>
        <div style={styles.inputRow}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Add a trait..."
            style={styles.chipInput}
            onKeyDown={(e) => e.key === 'Enter' && addItem('traits')}
          />
          <button onClick={() => addItem('traits')} style={styles.addButton}>Add</button>
        </div>
        <div style={styles.chipList}>
          {data.traits.map((trait, index) => (
            <div key={index} style={styles.chip}>
              <span>{trait}</span>
              <button onClick={() => removeItem('traits', index)} style={styles.removeButton}>×</button>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Somatic Connection</h3>
        <p style={styles.stepHint}>
          How does this identity feel in your body? What's the physical sensation?
        </p>
        <textarea
          value={data.embodiment}
          onChange={(e) => setData(prev => ({...prev, embodiment: e.target.value}))}
          placeholder="When I embody this identity, I feel..."
          style={styles.textarea}
          rows={3}
        />
      </div>

      <div style={styles.buttonRow}>
        <button onClick={handleBack} style={styles.secondaryButton}>Back</button>
        <button onClick={handleSave} disabled={loading} style={styles.primaryButton}>
          {loading ? 'Saving...' : 'Complete Identity'}
        </button>
      </div>
    </div>
  );

  // Render Complete
  const renderComplete = () => (
    <div style={styles.stepContainer}>
      <div style={styles.completeIcon}>✨</div>
      <h2 style={styles.completeTitle}>Identity Crafted!</h2>
      <p style={styles.completeText}>
        You've created your extraordinary self. This is a living document that can evolve as you grow.
      </p>

      <div style={styles.identityCard}>
        <h3 style={styles.identityName}>{data.name}</h3>
        <p style={styles.identityStatement}>"{data.statement}"</p>

        <div style={styles.identitySection}>
          <h4 style={styles.identitySectionTitle}>Beliefs</h4>
          <ul style={styles.identityList}>
            {data.beliefs.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </div>

        <div style={styles.identitySection}>
          <h4 style={styles.identitySectionTitle}>Behaviors</h4>
          <ul style={styles.identityList}>
            {data.behaviors.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </div>

        <div style={styles.identitySection}>
          <h4 style={styles.identitySectionTitle}>Traits</h4>
          <ul style={styles.identityList}>
            {data.traits.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </div>

        {data.embodiment && (
          <div style={styles.identitySection}>
            <h4 style={styles.identitySectionTitle}>Embodiment</h4>
            <p style={styles.embodimentText}>{data.embodiment}</p>
          </div>
        )}
      </div>

      <div style={styles.buttonGroup}>
        <Link href="/dashboard" style={styles.primaryButtonLink}>
          Go to Dashboard
        </Link>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <Link href="/dashboard" style={styles.backLink}>← Back to Dashboard</Link>
        <h1 style={styles.headerTitle}>Craft Your Identity</h1>
        <p style={styles.headerSubtitle}>Define your extraordinary self</p>
      </header>

      <main style={styles.main}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
        {step === 6 && renderComplete()}
      </main>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: { minHeight: '100vh', background: '#f8f9fa' },
  header: { background: 'white', borderBottom: '1px solid #e9ecef', padding: '16px 24px', textAlign: 'center' },
  backLink: { display: 'inline-block', fontSize: '14px', color: '#667eea', textDecoration: 'none', marginBottom: '8px' },
  headerTitle: { fontSize: '24px', fontWeight: 'bold', color: '#333', margin: 0 },
  headerSubtitle: { fontSize: '14px', color: '#666', marginTop: '4px' },
  main: { maxWidth: '600px', margin: '0 auto', padding: '32px 24px' },
  stepContainer: { textAlign: 'center' },
  stepNumber: { fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', color: '#667eea', marginBottom: '8px' },
  stepTitle: { fontSize: '28px', fontWeight: 'bold', color: '#333', margin: '0 0 8px 0' },
  stepDescription: { fontSize: '16px', color: '#666', marginBottom: '16px', lineHeight: 1.6 },
  stepHint: { fontSize: '14px', color: '#999', fontStyle: 'italic', marginBottom: '24px' },
  textInput: { width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '18px', marginBottom: '24px', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '16px', borderRadius: '12px', border: '1px solid #ddd', fontSize: '16px', fontFamily: 'inherit', resize: 'vertical', marginBottom: '24px', boxSizing: 'border-box' },
  inputRow: { display: 'flex', gap: '12px', marginBottom: '16px' },
  chipInput: { flex: 1, padding: '12px 16px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '16px' },
  addButton: { padding: '12px 20px', borderRadius: '8px', border: 'none', background: '#667eea', color: 'white', fontSize: '14px', fontWeight: '600', cursor: 'pointer' },
  chipList: { display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginBottom: '24px' },
  chip: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'white', borderRadius: '20px', boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)', fontSize: '14px' },
  removeButton: { background: 'none', border: 'none', color: '#999', fontSize: '18px', cursor: 'pointer', padding: '0 4px' },
  buttonRow: { display: 'flex', gap: '12px', justifyContent: 'center' },
  primaryButton: { padding: '14px 28px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', fontSize: '16px', fontWeight: '600', cursor: 'pointer' },
  secondaryButton: { padding: '14px 28px', borderRadius: '12px', border: '2px solid #ddd', background: 'white', color: '#666', fontSize: '16px', fontWeight: '600', cursor: 'pointer' },
  section: { marginBottom: '24px' },
  sectionTitle: { fontSize: '16px', fontWeight: '600', color: '#333', marginBottom: '12px' },
  completeIcon: { fontSize: '64px', marginBottom: '16px' },
  completeTitle: { fontSize: '28px', fontWeight: 'bold', color: '#333', margin: '0 0 8px 0' },
  completeText: { fontSize: '16px', color: '#666', marginBottom: '24px' },
  identityCard: { background: 'white', borderRadius: '16px', padding: '32px', textAlign: 'left', marginBottom: '24px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)' },
  identityName: { fontSize: '24px', fontWeight: 'bold', color: '#667eea', margin: 0, textAlign: 'center' },
  identityStatement: { fontSize: '18px', fontStyle: 'italic', color: '#666', textAlign: 'center', marginBottom: '24px' },
  identitySection: { marginBottom: '16px' },
  identitySectionTitle: { fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px', color: '#999', marginBottom: '8px' },
  identityList: { margin: 0, paddingLeft: '20px', color: '#333', lineHeight: 1.8 },
  embodimentText: { fontSize: '14px', color: '#666', fontStyle: 'italic', margin: 0 },
  buttonGroup: { textAlign: 'center' },
  primaryButtonLink: { display: 'inline-block', padding: '14px 28px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', fontSize: '16px', fontWeight: '600', borderRadius: '12px', textDecoration: 'none' },
};

export default IdentityCraft;
