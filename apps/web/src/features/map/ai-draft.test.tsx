import { AI_DRAFT_SOURCE } from '@remoa/contracts';
import { withStrings } from '@remoa/strings';
import * as more from '@remoa/strings/ns';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AiDraftTag } from './ai-draft';

const t = withStrings({ inspector: more.inspector });

describe('AiDraftTag', () => {
  it('marks an AI draft and leaves a student card unmarked', () => {
    expect(t('inspector.aiDraft')).toBe(AI_DRAFT_SOURCE);
    const { rerender } = render(<AiDraftTag card={{ status: 'draft', source: AI_DRAFT_SOURCE }} />);
    expect(screen.getByTestId('ai-draft-tag')).toHaveTextContent(AI_DRAFT_SOURCE);
    rerender(<AiDraftTag card={{ status: 'draft', source: 'SSC 2021' }} />);
    expect(screen.queryByTestId('ai-draft-tag')).toBeNull();
    rerender(<AiDraftTag card={{ status: 'approved', source: AI_DRAFT_SOURCE }} />);
    expect(screen.queryByTestId('ai-draft-tag')).toBeNull();
  });
});
