import { RuleTester } from '@typescript-eslint/rule-tester';
import { afterAll, describe, it } from 'vitest';
import plugin from './index';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({
  languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
});

tester.run('no-literal-strings', plugin.rules['no-literal-strings'], {
  valid: [
    { code: '<Button>{t("common.save")}</Button>' },
    { code: '<div className="flex p-2" />' },
    { code: '<span>12 / 30</span>' },
    { code: '<span>—</span>' },
    { code: '<IconButton aria-label={t("common.close")} />' },
    { code: '<Input placeholder={t("auth.email")} />' },
    { code: '<div>{count}</div>' },
  ],
  invalid: [
    { code: '<Button>Salvar</Button>', errors: [{ messageId: 'literal' }] },
    { code: '<IconButton aria-label="Fechar" />', errors: [{ messageId: 'literal' }] },
    { code: '<div>{"Olá"}</div>', errors: [{ messageId: 'literal' }] },
    { code: '<div>{`Olá ${nome}`}</div>', errors: [{ messageId: 'literal' }] },
    { code: '<img alt="Foto" />', errors: [{ messageId: 'literal' }] },
    { code: '<Input placeholder={"E-mail"} />', errors: [{ messageId: 'literal' }] },
    { code: '<a title="Ajuda">{x}</a>', errors: [{ messageId: 'literal' }] },
  ],
});
