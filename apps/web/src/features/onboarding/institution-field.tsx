'use client';

import type { ComponentProps } from 'react';
import { MEDICAL_SCHOOLS } from '@remoa/contracts/medical-schools';
import { Autocomplete } from '@remoa/ui';

// P-514 (D-1080): the school list (~10 KB gzip) and the combobox (Radix Popover) load with this step, not with the onboarding.
const SCHOOL_OPTIONS = MEDICAL_SCHOOLS.map((s) => ({ value: s.id, label: s.name, hint: `${s.city} · ${s.uf}`, keywords: s.acronym ? [s.acronym] : [] }));

export function InstitutionField(props: Omit<ComponentProps<typeof Autocomplete>, 'options'>) {
  return <Autocomplete {...props} options={SCHOOL_OPTIONS} />;
}
