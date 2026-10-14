import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Autocomplete, type AutocompleteValue } from './autocomplete';

const OPTS = [
  { value: 'usp', label: 'Universidade de São Paulo', hint: 'São Paulo · SP', keywords: ['USP'] },
  { value: 'unicamp', label: 'Universidade Estadual de Campinas', hint: 'Campinas · SP', keywords: ['Unicamp'] },
  { value: 'ufmg', label: 'Universidade Federal de Minas Gerais', hint: 'Belo Horizonte · MG', keywords: ['UFMG'] },
  { value: 'ufpr', label: 'Universidade Federal do Paraná', hint: 'Curitiba · PR', keywords: ['UFPR'] },
  { value: 'ufrj', label: 'Universidade Federal do Rio de Janeiro', hint: 'Rio de Janeiro · RJ', keywords: ['UFRJ'] },
];

/**
 * Regra de uso: seleção única de lista longa (~300 itens) com busca sem acento.
 * Renderiza até 50 resultados; `allowCustom` adiciona a opção final de texto livre
 * (devolve value null). Texto vem sempre por prop.
 */
const meta = { title: 'Autocomplete' } satisfies Meta;
export default meta;
type S = StoryObj<typeof meta>;

function Demo({ allowCustom, initial = null }: { allowCustom?: boolean; initial?: AutocompleteValue | null }) {
  const [v, setV] = useState<AutocompleteValue | null>(initial);
  return (
    <div className="max-w-md p-6">
      <Autocomplete
        label="Instituição de ensino"
        placeholder="Busque pelo nome, sigla ou cidade"
        options={OPTS}
        value={v}
        onValueChange={setV}
        allowCustom={allowCustom}
        emptyLabel="Nenhuma instituição encontrada"
        customLabel={(t) => `Usar “${t}”`}
        clearAriaLabel="Limpar instituição"
      />
    </div>
  );
}

export const Padrao: S = { render: () => <Demo /> };
export const ComTextoLivre: S = { render: () => <Demo allowCustom /> };
export const Selecionado: S = { render: () => <Demo allowCustom initial={{ value: 'usp', label: 'Universidade de São Paulo' }} /> };
export const Erro: S = {
  render: () => (
    <div className="max-w-md p-6">
      <Autocomplete label="Instituição de ensino" options={OPTS} value={null} onValueChange={() => {}} error="Escolha uma instituição" />
    </div>
  ),
};
export const Desabilitado: S = {
  render: () => (
    <div className="max-w-md p-6">
      <Autocomplete label="Instituição de ensino" options={OPTS} value={null} onValueChange={() => {}} disabled />
    </div>
  ),
};

const BUSCA = [
  { value: 'usp', label: 'Universidade de São Paulo', description: 'São Paulo · SP · Pública' },
  { value: 'ufpr', label: 'Universidade Federal do Paraná', description: 'Curitiba · PR · Pública' },
  { value: 'pucpr', label: 'PUC-PR', description: 'Curitiba · PR · Privada' },
];

/** Busca no servidor: debounce 200 ms, mínimo 2 letras, resposta antiga ignorada; texto livre sempre disponível. */
function Busca() {
  const [v, setV] = useState<AutocompleteValue | null>(null);
  return (
      <div className="max-w-md p-6">
        <Autocomplete
          label="Instituição de ensino"
          placeholder="Digite ao menos 2 letras"
          loadOptions={(q, signal) =>
            new Promise((res, rej) => {
              const t = setTimeout(() => res(BUSCA.filter((o) => (o.label + o.description).toLowerCase().includes(q.toLowerCase()))), 600);
              signal.addEventListener('abort', () => { clearTimeout(t); rej(new DOMException('abort', 'AbortError')); });
            })
          }
          value={v}
          onValueChange={setV}
          allowCustom
          loadingLabel="Buscando instituições…"
          emptyLabel="Nenhuma instituição encontrada"
          customLabel={(t) => `Usar o que digitei: “${t}”`}
          clearAriaLabel="Limpar instituição"
        />
      </div>
  );
}
export const BuscaNoServidor: S = { render: () => <Busca /> };
