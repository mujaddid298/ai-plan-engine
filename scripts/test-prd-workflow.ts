import { validateDocument } from '../src/services/generator/validators';
import fs from 'fs';
import path from 'path';

async function testPrdWorkflow() {
  console.log('--- Testing PRD Validator with New PRD Generator Structure ---');

  const samplePrd = `# PRD: Task Priority System

## 1. Introduction / Overview
Add priority levels to tasks so users can focus on what matters most. Tasks can be marked as high, medium, or low priority, with visual indicators and filtering to help users manage their workload effectively.

## 2. Goals
- Allow assigning priority (high/medium/low) to any task
- Provide clear visual differentiation between priority levels
- Enable filtering and sorting by priority
- Default new tasks to medium priority

## 3. User Stories

### US-001: Add priority field to database
**Description:** As a developer, I need to store task priority so it persists across sessions.

**Acceptance Criteria:**
- [ ] Add priority column to tasks table: 'high' | 'medium' | 'low' (default 'medium')
- [ ] Generate and run migration successfully
- [ ] Typecheck passes

### US-002: Display priority indicator on task cards
**Description:** As a user, I want to see task priority at a glance so I know what needs attention first.

**Acceptance Criteria:**
- [ ] Each task card shows colored priority badge (red=high, yellow=medium, gray=low)
- [ ] Priority visible without hovering or clicking
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

## 4. Functional Requirements
- FR-1: Add priority field to tasks table ('high' | 'medium' | 'low', default 'medium')
- FR-2: Display colored priority badge on each task card
- FR-3: Include priority selector in task edit modal
- FR-4: Add priority filter dropdown to task list header
- FR-5: Sort by priority within each status column (high to medium to low)

## 5. Non-Goals
- No priority-based notifications or reminders
- No automatic priority assignment based on due date
- No priority inheritance for subtasks

## 6. Design Considerations
- Reuse existing badge component with color variants
- Clear visual hierarchy with Apple dark aesthetics

## 7. Technical Considerations
- Filter state managed via URL search params
- Priority stored in database, not computed

## 8. Success Metrics
- Users can change priority in under 2 clicks
- High-priority tasks immediately visible at top of lists
- No regression in task list performance

## 9. Open Questions
- Should priority affect task ordering within a column?
- Should we add keyboard shortcuts for priority changes?
`;

  const validation = validateDocument(samplePrd, 'prd');
  console.log('Validation valid:', validation.valid);
  if (!validation.valid) {
    console.error('Validation issues:', validation.issues);
    throw new Error('PRD validation failed');
  }
  console.log('✅ PRD Structure Validated Successfully!');

  // Test saving to tasks/prd-task-priority-system.md
  const tasksDir = path.join(process.cwd(), 'tasks');
  const filePath = path.join(tasksDir, 'prd-task-priority-system.md');
  await fs.promises.writeFile(filePath, samplePrd, 'utf8');
  if (!fs.existsSync(filePath)) {
    throw new Error('Failed to save to tasks/prd-task-priority-system.md');
  }
  console.log('✅ Successfully saved to tasks/prd-task-priority-system.md');

  console.log('\n🎉 PRD WORKFLOW TESTS ALL PASSED!');
}

testPrdWorkflow().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
