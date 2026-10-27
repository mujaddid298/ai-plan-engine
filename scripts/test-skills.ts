import { SKILLS, getSkill } from '../src/lib/skills';
import { TEMPLATES, getTemplate } from '../src/lib/promptTemplates';

async function testSkills() {
  console.log('--- 1. Testing SKILLS definition ---');
  if (SKILLS.length === 0) throw new Error('No skills defined');
  const planSkill = getSkill('planning-se');
  if (!planSkill) throw new Error('Skill planning-se not found');
  console.log('✅ Skill planning-se found:', planSkill.title);

  console.log('--- 2. Testing PRD Generator Planning Prompt Construction ---');
  const promptEmpty = planSkill.build('');
  if (!promptEmpty.includes('TAHAP 1: Clarifying Questions')) {
    throw new Error('Prompt missing TAHAP 1');
  }
  if (!promptEmpty.includes('TAHAP 2: Struktur PRD')) {
    throw new Error('Prompt missing TAHAP 2');
  }
  if (!promptEmpty.includes('US-001: [Title]')) {
    throw new Error('Prompt missing US-001 format');
  }
  if (!promptEmpty.includes('tasks/prd-[feature-name].md')) {
    throw new Error('Prompt missing tasks/prd-[feature-name].md target');
  }
  if (!promptEmpty.includes('Verify in browser using dev-browser skill')) {
    throw new Error('Prompt missing browser verification criteria');
  }

  const userIdea = 'Sistem Prioritas Tugas (Task Priority System)';
  const promptWithIdea = planSkill.build(userIdea);
  if (!promptWithIdea.includes(userIdea)) {
    throw new Error('User idea not included in skill build output');
  }
  console.log('✅ PRD Generator Planning Prompt build OK');

  console.log('--- 3. Testing Grill Me Template ---');
  const gmTemplate = getTemplate('grill-me');
  if (!gmTemplate) throw new Error('Template grill-me not found');
  const gmBuilt = gmTemplate.build('Sistem absensi berbasis QR code');
  if (!gmBuilt.includes('Sistem absensi berbasis QR code')) {
    throw new Error('User topic not included in Grill Me template output');
  }
  console.log('✅ Grill Me Template build OK');

  console.log('\n🎉 ALL SKILL & TEMPLATE TESTS PASSED!');
}

testSkills().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
