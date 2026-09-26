'use client';

import type { AnswerOperator, Condition, ScoreOperator } from '@relacionamentos/quiz-engine';
import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { inputClasses } from '@/components/ui/Field';
import type { ReferenceData } from '@/server/services/admin-queries';

type ClauseDraft =
  | { kind: 'answer'; negate: boolean; questionId: string; op: AnswerOperator; optionIds: string[] }
  | { kind: 'score'; negate: boolean; categoryId: string; op: ScoreOperator; value: number };

interface GroupDraft {
  mode: 'all' | 'any';
  clauses: ClauseDraft[];
}

type Leaf = Extract<Condition, { answer: unknown } | { score: unknown }>;

function leafToDraft(leaf: Leaf, negate: boolean): ClauseDraft {
  if ('answer' in leaf) {
    return { kind: 'answer', negate, questionId: leaf.answer.questionId, op: leaf.answer.op, optionIds: leaf.answer.optionIds ?? [] };
  }
  return { kind: 'score', negate, categoryId: leaf.score.categoryId, op: leaf.score.op, value: leaf.score.value };
}

function childToDraft(child: Condition): ClauseDraft | null {
  if ('answer' in child || 'score' in child) return leafToDraft(child, false);
  if ('not' in child && ('answer' in child.not || 'score' in child.not)) return leafToDraft(child.not as Leaf, true);
  return null;
}

/** Converte a condição salva para o formato do construtor (ou `null` se for complexa demais). */
export function toDraft(condition: Condition | null): GroupDraft | null {
  if (!condition) return { mode: 'all', clauses: [] };
  if ('all' in condition || 'any' in condition) {
    const children = 'all' in condition ? condition.all : condition.any;
    const clauses = children.map(childToDraft);
    if (clauses.some((clause) => clause === null)) return null;
    return { mode: 'all' in condition ? 'all' : 'any', clauses: clauses as ClauseDraft[] };
  }
  const single = childToDraft(condition);
  return single ? { mode: 'all', clauses: [single] } : null;
}

function draftToLeaf(clause: ClauseDraft): Condition {
  const leaf: Condition =
    clause.kind === 'answer'
      ? {
          answer: {
            questionId: clause.questionId,
            op: clause.op,
            ...(clause.op === 'selected' || clause.op === 'notSelected' ? { optionIds: clause.optionIds } : {}),
          },
        }
      : { score: { categoryId: clause.categoryId, op: clause.op, value: clause.value } };
  return clause.negate ? { not: leaf } : leaf;
}

export function fromDraft(group: GroupDraft): Condition | null {
  if (group.clauses.length === 0) return null;
  if (group.clauses.length === 1 && group.mode === 'all') return draftToLeaf(group.clauses[0]!);
  const children = group.clauses.map(draftToLeaf);
  return group.mode === 'all' ? { all: children } : { any: children };
}

const ANSWER_OPS: { value: AnswerOperator; label: string }[] = [
  { value: 'selected', label: 'foi respondida com' },
  { value: 'notSelected', label: 'foi respondida, mas NÃO com' },
  { value: 'answered', label: 'foi respondida' },
  { value: 'notAnswered', label: 'não foi respondida' },
];

const SCORE_OPS: { value: ScoreOperator; label: string }[] = [
  { value: 'gte', label: '≥' },
  { value: 'gt', label: '>' },
  { value: 'lte', label: '≤' },
  { value: 'lt', label: '<' },
];

interface ConditionBuilderProps {
  value: Condition | null;
  onChange: (value: Condition | null) => void;
  references: ReferenceData;
  /** Rótulo para "sem condição". */
  emptyLabel?: string;
  /** Pergunta sendo editada (não pode depender dela mesma). */
  excludeQuestionId?: string;
}

/**
 * Construtor visual de condições: "TODAS/QUALQUER uma das cláusulas", cada cláusula sobre uma
 * resposta ou sobre a pontuação parcial de uma categoria (com opção de negar). Condições mais
 * complexas (grupos aninhados) podem ser editadas no modo JSON — validado no servidor.
 */
export function ConditionBuilder({ value, onChange, references, emptyLabel = 'Sempre', excludeQuestionId }: ConditionBuilderProps) {
  const initialDraft = toDraft(value);
  const [jsonMode, setJsonMode] = useState(initialDraft === null);
  const [jsonText, setJsonText] = useState(value ? JSON.stringify(value, null, 2) : '');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const draft = toDraft(value) ?? { mode: 'all', clauses: [] };
  const questions = references.questions.filter((question) => question.id !== excludeQuestionId);

  const update = (next: GroupDraft) => onChange(fromDraft(next));
  const updateClause = (index: number, clause: ClauseDraft) =>
    update({ ...draft, clauses: draft.clauses.map((current, i) => (i === index ? clause : current)) });

  const addAnswerClause = () => {
    const question = questions[0];
    if (!question) return;
    update({ ...draft, clauses: [...draft.clauses, { kind: 'answer', negate: false, questionId: question.id, op: 'selected', optionIds: [] }] });
  };
  const addScoreClause = () => {
    const category = references.categories[0];
    if (!category) return;
    update({ ...draft, clauses: [...draft.clauses, { kind: 'score', negate: false, categoryId: category.id, op: 'gte', value: 50 }] });
  };

  if (jsonMode) {
    return (
      <div className="space-y-2">
        <textarea
          aria-label="Condição em JSON"
          className={`${inputClasses} font-mono text-xs`}
          rows={8}
          value={jsonText}
          placeholder='Ex.: {"all":[{"answer":{"questionId":"q_status","op":"selected","optionIds":["opt_status_juntos"]}}]}'
          onChange={(event) => {
            setJsonText(event.target.value);
            if (!event.target.value.trim()) {
              setJsonError(null);
              onChange(null);
              return;
            }
            try {
              onChange(JSON.parse(event.target.value) as Condition);
              setJsonError(null);
            } catch {
              setJsonError('JSON inválido (será validado ao salvar).');
            }
          }}
        />
        {jsonError ? <p className="text-xs text-red-700">{jsonError}</p> : null}
        <button
          type="button"
          className="text-sm font-medium text-brand-700 hover:underline disabled:opacity-50"
          disabled={toDraft(value) === null}
          onClick={() => setJsonMode(false)}
          title={toDraft(value) === null ? 'Condição complexa demais para o modo visual' : undefined}
        >
          Voltar ao modo visual
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      {draft.clauses.length === 0 ? (
        <p className="text-sm text-slate-600">Sem condição — {emptyLabel.toLowerCase()}.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>Aplicar quando</span>
          <select
            aria-label="Combinação das cláusulas"
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
            value={draft.mode}
            onChange={(event) => update({ ...draft, mode: event.target.value as 'all' | 'any' })}
          >
            <option value="all">TODAS as cláusulas forem verdadeiras</option>
            <option value="any">QUALQUER uma das cláusulas for verdadeira</option>
          </select>
        </div>
      )}

      {draft.clauses.map((clause, index) => (
        <div key={index} className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={clause.negate}
                onChange={(event) => updateClause(index, { ...clause, negate: event.target.checked })}
                className="accent-brand-600"
              />
              NÃO
            </label>
            {clause.kind === 'answer' ? (
              <>
                <select
                  aria-label="Pergunta"
                  className="max-w-full min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-2 py-1"
                  value={clause.questionId}
                  onChange={(event) => updateClause(index, { ...clause, questionId: event.target.value, optionIds: [] })}
                >
                  {questions.map((question) => (
                    <option key={question.id} value={question.id}>
                      [{question.stageTitle}] {question.label}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Operador"
                  className="rounded-md border border-slate-300 bg-white px-2 py-1"
                  value={clause.op}
                  onChange={(event) => updateClause(index, { ...clause, op: event.target.value as AnswerOperator })}
                >
                  {ANSWER_OPS.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <span>Pontuação de</span>
                <select
                  aria-label="Categoria"
                  className="rounded-md border border-slate-300 bg-white px-2 py-1"
                  value={clause.categoryId}
                  onChange={(event) => updateClause(index, { ...clause, categoryId: event.target.value })}
                >
                  {references.categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Comparação"
                  className="rounded-md border border-slate-300 bg-white px-2 py-1"
                  value={clause.op}
                  onChange={(event) => updateClause(index, { ...clause, op: event.target.value as ScoreOperator })}
                >
                  {SCORE_OPS.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>
                <input
                  aria-label="Valor (0 a 100)"
                  type="number"
                  min={0}
                  max={100}
                  className="w-20 rounded-md border border-slate-300 bg-white px-2 py-1"
                  value={clause.value}
                  onChange={(event) => updateClause(index, { ...clause, value: Number(event.target.value) })}
                />
              </>
            )}
            <button
              type="button"
              aria-label="Remover cláusula"
              className="ml-auto rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-700"
              onClick={() => update({ ...draft, clauses: draft.clauses.filter((_, i) => i !== index) })}
            >
              <Icon name="x" className="h-4 w-4" />
            </button>
          </div>
          {clause.kind === 'answer' && (clause.op === 'selected' || clause.op === 'notSelected') ? (
            <fieldset className="flex flex-wrap gap-x-4 gap-y-1">
              <legend className="sr-only">Opções</legend>
              {(questions.find((question) => question.id === clause.questionId)?.options ?? []).map((option) => (
                <label key={option.id} className="inline-flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    className="accent-brand-600"
                    checked={clause.optionIds.includes(option.id)}
                    onChange={(event) =>
                      updateClause(index, {
                        ...clause,
                        optionIds: event.target.checked
                          ? [...clause.optionIds, option.id]
                          : clause.optionIds.filter((id) => id !== option.id),
                      })
                    }
                  />
                  {option.label}
                </label>
              ))}
            </fieldset>
          ) : null}
        </div>
      ))}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={addAnswerClause} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-100">
          <Icon name="plus" className="h-4 w-4" /> Cláusula de resposta
        </button>
        <button type="button" onClick={addScoreClause} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-100">
          <Icon name="plus" className="h-4 w-4" /> Cláusula de pontuação
        </button>
        <button
          type="button"
          onClick={() => {
            setJsonText(value ? JSON.stringify(value, null, 2) : '');
            setJsonMode(true);
          }}
          className="ml-auto text-sm font-medium text-brand-700 hover:underline"
        >
          Editar como JSON
        </button>
      </div>
    </div>
  );
}
