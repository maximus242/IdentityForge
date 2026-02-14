import prisma from '@identityforge/database';

async function verifyMigration() {
  console.log('Verifying Belief System Migration...\n');

  try {
    // Get counts from both old and new systems
    const stats = {
      values: await prisma.value.count(),
      valueBeliefs: await prisma.belief.count({ where: { type: 'VALUE' } }),
      identityArchetypes: await prisma.identityArchetype.count(),
      identityBeliefs: await prisma.belief.count({
        where: {
          type: {
            in: ['IDENTITY_CORE', 'IDENTITY_BEHAVIOR', 'IDENTITY_TRAIT', 'IDENTITY_EMBODIMENT'],
          },
        },
      }),
      limitingBeliefs: await prisma.limitingBelief.count(),
      limitingBeliefRecords: await prisma.belief.count({ where: { type: 'LIMITING' } }),
      personalityInsights: await prisma.personalityInsight.count(),
      personalityBeliefs: await prisma.belief.count({ where: { type: 'PERSONALITY' } }),
      empoweringBeliefs: await prisma.belief.count({ where: { type: 'EMPOWERING' } }),
      totalBeliefs: await prisma.belief.count(),
    };

    console.log('📊 Migration Statistics:');
    console.log('========================\n');

    console.log('Values:');
    console.log(`  Legacy table: ${stats.values}`);
    console.log(`  Belief table: ${stats.valueBeliefs}`);
    console.log(`  Match: ${stats.values === stats.valueBeliefs ? '✅' : '❌'}\n`);

    console.log('Identity Archetypes:');
    console.log(`  Legacy table: ${stats.identityArchetypes}`);
    console.log(`  Belief table: ${stats.identityBeliefs} beliefs`);
    console.log(`  Note: Identity beliefs are decomposed into multiple belief records\n`);

    console.log('Limiting Beliefs:');
    console.log(`  Legacy table: ${stats.limitingBeliefs}`);
    console.log(`  Belief table: ${stats.limitingBeliefRecords}`);
    console.log(`  Match: ${stats.limitingBeliefs === stats.limitingBeliefRecords ? '✅' : '❌'}\n`);

    console.log('Personality Insights:');
    console.log(`  Legacy table: ${stats.personalityInsights}`);
    console.log(`  Belief table: ${stats.personalityBeliefs}`);
    console.log(`  Match: ${stats.personalityInsights === stats.personalityBeliefs ? '✅' : '❌'}\n`);

    console.log('Additional Beliefs:');
    console.log(`  Empowering beliefs: ${stats.empoweringBeliefs}\n`);

    console.log('Total Beliefs:', stats.totalBeliefs, '\n');

    // Check for orphaned beliefs (beliefs with sourceId that don't exist in source table)
    console.log('🔍 Checking for orphaned beliefs...\n');

    const valueBeliefs = await prisma.belief.findMany({
      where: { sourceType: 'Value' },
      select: { sourceId: true },
    });

    const existingValues = await prisma.value.findMany({
      select: { id: true },
    });

    const valueIds = new Set(existingValues.map(v => v.id));
    const orphanedValueBeliefs = valueBeliefs.filter(b => b.sourceId && !valueIds.has(b.sourceId));

    const archetypeBeliefs = await prisma.belief.findMany({
      where: { sourceType: 'IdentityArchetype' },
      select: { sourceId: true },
    });

    const existingArchetypes = await prisma.identityArchetype.findMany({
      select: { id: true },
    });

    const archetypeIds = new Set(existingArchetypes.map(a => a.id));
    const orphanedArchetypeBeliefs = archetypeBeliefs.filter(
      b => b.sourceId && !archetypeIds.has(b.sourceId)
    );

    const limitingBeliefRecords = await prisma.belief.findMany({
      where: { sourceType: 'LimitingBelief' },
      select: { sourceId: true },
    });

    const existingLimitingBeliefs = await prisma.limitingBelief.findMany({
      select: { id: true },
    });

    const limitingBeliefIds = new Set(existingLimitingBeliefs.map(lb => lb.id));
    const orphanedLimitingBeliefs = limitingBeliefRecords.filter(
      b => b.sourceId && !limitingBeliefIds.has(b.sourceId)
    );

    const totalOrphaned =
      orphanedValueBeliefs.length +
      orphanedArchetypeBeliefs.length +
      orphanedLimitingBeliefs.length;

    if (totalOrphaned > 0) {
      console.log(`⚠️  Found ${totalOrphaned} orphaned beliefs:`);
      if (orphanedValueBeliefs.length > 0) {
        console.log(`   - ${orphanedValueBeliefs.length} orphaned value beliefs`);
      }
      if (orphanedArchetypeBeliefs.length > 0) {
        console.log(`   - ${orphanedArchetypeBeliefs.length} orphaned archetype beliefs`);
      }
      if (orphanedLimitingBeliefs.length > 0) {
        console.log(`   - ${orphanedLimitingBeliefs.length} orphaned limiting beliefs`);
      }
    } else {
      console.log('✅ No orphaned beliefs found');
    }

    console.log('\n');

    // Check for beliefs without proper linking
    const beliefsWithoutSource = await prisma.belief.count({
      where: {
        sourceType: { not: null },
        sourceId: null,
      },
    });

    if (beliefsWithoutSource > 0) {
      console.log(`⚠️  Found ${beliefsWithoutSource} beliefs with sourceType but no sourceId`);
    } else {
      console.log('✅ All beliefs properly linked');
    }

    console.log('\n');

    // Check belief strength distribution
    const beliefsByStrength = await prisma.belief.groupBy({
      by: ['type'],
      _avg: { strength: true },
      _min: { strength: true },
      _max: { strength: true },
    });

    console.log('📈 Belief Strength Distribution:\n');
    beliefsByStrength.forEach(group => {
      console.log(`${group.type}:`);
      console.log(`  Average: ${(group._avg.strength || 0).toFixed(2)}`);
      console.log(`  Range: ${(group._min.strength || 0).toFixed(2)} - ${(group._max.strength || 0).toFixed(2)}`);
    });

    console.log('\n✅ Verification complete!\n');

    // Summary
    const allMatch =
      stats.values === stats.valueBeliefs &&
      stats.limitingBeliefs === stats.limitingBeliefRecords &&
      stats.personalityInsights === stats.personalityBeliefs &&
      totalOrphaned === 0 &&
      beliefsWithoutSource === 0;

    if (allMatch) {
      console.log('🎉 Migration is complete and consistent!\n');
    } else {
      console.log('⚠️  Migration has some inconsistencies. Review the details above.\n');
    }
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyMigration();
