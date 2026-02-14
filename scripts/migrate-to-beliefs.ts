import prisma from '@identityforge/database';
import type { BeliefCategory } from '@identityforge/types';

async function migrateValues() {
  console.log('Migrating Values to Beliefs...');

  const values = await prisma.value.findMany();

  for (const value of values) {
    await prisma.belief.create({
      data: {
        userId: value.userId,
        type: 'VALUE',
        statement: value.description || `${value.name} is important to me`,
        category: inferValueCategory(value.name),
        origin: value.whyDeepDive || undefined,
        evidence: value.connectionToIdentity || undefined,
        strength: value.priority ? (10 - value.priority) / 10 : 0.5, // Higher priority = higher strength
        priority: value.priority,
        isEmpowering: true,
        sourceType: 'Value',
        sourceId: value.id,
      },
    });
  }

  console.log(`✓ Migrated ${values.length} values`);
}

async function migrateIdentityArchetypes() {
  console.log('Migrating Identity Archetypes to Beliefs...');

  const archetypes = await prisma.identityArchetype.findMany();

  for (const archetype of archetypes) {
    // Create parent core identity belief
    const coreIdentityBelief = await prisma.belief.create({
      data: {
        userId: archetype.userId,
        type: 'IDENTITY_CORE',
        statement: archetype.description || `I am ${archetype.name}`,
        category: 'CORE_IDENTITY',
        isEmpowering: true,
        isActive: archetype.isActive,
        sourceType: 'IdentityArchetype',
        sourceId: archetype.id,
      },
    });

    // Create belief records for each belief in archetype.beliefs array
    for (const beliefText of archetype.beliefs) {
      await prisma.belief.create({
        data: {
          userId: archetype.userId,
          type: 'IDENTITY_CORE',
          statement: beliefText,
          isEmpowering: true,
          isActive: archetype.isActive,
          sourceType: 'IdentityArchetype',
          sourceId: archetype.id,
          parentBeliefId: coreIdentityBelief.id,
        },
      });
    }

    // Create belief records for behaviors
    for (const behaviorText of archetype.behaviors) {
      await prisma.belief.create({
        data: {
          userId: archetype.userId,
          type: 'IDENTITY_BEHAVIOR',
          statement: behaviorText,
          isEmpowering: true,
          isActive: archetype.isActive,
          sourceType: 'IdentityArchetype',
          sourceId: archetype.id,
          parentBeliefId: coreIdentityBelief.id,
        },
      });
    }

    // Create belief records for traits
    for (const traitText of archetype.traits) {
      await prisma.belief.create({
        data: {
          userId: archetype.userId,
          type: 'IDENTITY_TRAIT',
          statement: traitText,
          isEmpowering: true,
          isActive: archetype.isActive,
          sourceType: 'IdentityArchetype',
          sourceId: archetype.id,
          parentBeliefId: coreIdentityBelief.id,
        },
      });
    }

    // Create embodiment belief if present
    if (archetype.embodiedPractice) {
      await prisma.belief.create({
        data: {
          userId: archetype.userId,
          type: 'IDENTITY_EMBODIMENT',
          statement: archetype.embodiedPractice,
          isEmpowering: true,
          isActive: archetype.isActive,
          sourceType: 'IdentityArchetype',
          sourceId: archetype.id,
          parentBeliefId: coreIdentityBelief.id,
        },
      });
    }
  }

  console.log(`✓ Migrated ${archetypes.length} identity archetypes`);
}

async function migrateLimitingBeliefs() {
  console.log('Migrating Limiting Beliefs...');

  const limitingBeliefs = await prisma.limitingBelief.findMany();

  for (const lb of limitingBeliefs) {
    await prisma.belief.create({
      data: {
        userId: lb.userId,
        type: 'LIMITING',
        statement: lb.belief,
        category: (lb.category as BeliefCategory) || undefined,
        challenge: lb.challenge || undefined,
        counterEvidence: lb.evidence || undefined,
        strength: lb.shiftLevel ? (6 - lb.shiftLevel) / 5 : 0.7, // Inverse of shift level
        isEmpowering: false,
        isActive: lb.isActive,
        sourceType: 'LimitingBelief',
        sourceId: lb.id,
      },
    });
  }

  console.log(`✓ Migrated ${limitingBeliefs.length} limiting beliefs`);
}

async function migratePersonalityInsights() {
  console.log('Migrating Personality Insights...');

  const insights = await prisma.personalityInsight.findMany();

  for (const insight of insights) {
    await prisma.belief.create({
      data: {
        userId: insight.userId,
        type: 'PERSONALITY',
        statement: insight.insight,
        category: (insight.category as BeliefCategory) || undefined,
        origin: insight.source || undefined,
        strength: 0.6, // Moderate strength for observations
        isEmpowering: true,
        sourceType: 'PersonalityInsight',
        sourceId: insight.id,
      },
    });
  }

  console.log(`✓ Migrated ${insights.length} personality insights`);
}

function inferValueCategory(valueName: string): BeliefCategory {
  const name = valueName.toLowerCase();

  if (name.includes('growth') || name.includes('learn')) return 'GROWTH';
  if (name.includes('connect') || name.includes('relationship') || name.includes('family')) return 'CONNECTION';
  if (name.includes('achieve') || name.includes('success') || name.includes('accomplish')) return 'ACHIEVEMENT';
  if (name.includes('contribute') || name.includes('help') || name.includes('give')) return 'CONTRIBUTION';
  if (name.includes('freedom') || name.includes('autonomy') || name.includes('independent')) return 'FREEDOM';
  if (name.includes('security') || name.includes('stability') || name.includes('safe')) return 'SECURITY';

  return 'GROWTH'; // Default fallback
}

// Main migration function
async function main() {
  try {
    console.log('Starting Belief System Migration...\n');

    await migrateValues();
    await migrateIdentityArchetypes();
    await migrateLimitingBeliefs();
    await migratePersonalityInsights();

    console.log('\n✓ Migration complete!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
