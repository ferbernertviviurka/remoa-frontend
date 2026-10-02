// F13 / G03 T13: jornadas da Minha conta. Precisa do backend em :4000 com STRIPE=mock (como o billing.spec).
import { expect, test } from '@playwright/test';
import { accountUser, API, PASSWORD, psql, secondSession } from './fixture';

// 64x64 PNG listrado (gerado uma vez; sharp/canvas do navegador recortam e recodificam).
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAXklEQVR4nO3PQQ0AIBDAsAP/nuGDAvIgbRIsbN9z7mEWAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMBzPrd5AU2C3W7fAAAAAElFTkSuQmCC',
  'base64',
);

test.describe('Minha conta', () => {
  test('foto: subir, recortar e ver no hero e na linha Foto', async ({ page, request }) => {
    test.setTimeout(120_000);
    await accountUser(page, request);
    await page.goto('/conta/perfil');
    await page.getByRole('button', { name: 'Adicionar foto' }).click();
    const dialog = page.getByRole('dialog', { name: 'Foto de perfil' });
    await expect(dialog.getByRole('button', { name: 'Salvar foto' })).toBeDisabled();
    await dialog.locator('input[type=file]').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: PNG });
    await expect(dialog.getByTestId('crop-image')).toBeVisible();
    await dialog.getByRole('slider').fill('150');
    await dialog.getByRole('button', { name: 'Salvar foto' }).click();
    await expect(dialog).toBeHidden();
    // Otimista: o hero troca na hora e a linha Foto acompanha, sem recarregar.
    await expect(page.getByRole('region', { name: 'Resumo do perfil' }).locator('img')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Resumo do perfil' }).getByText('Perfil 60% completo')).toBeVisible();
    // O trilho mostra a foto no botão "Minha conta" (o diálogo chama router.refresh()).
    await expect(page.getByRole('link', { name: 'Minha conta' }).or(page.getByRole('button', { name: 'Minha conta' })).locator('img')).toBeVisible();
    // Persistiu no servidor: avatar_key gravada.
    await expect.poll(() => psql(`select avatar_key is not null from profiles where user_id = (select id from auth.users order by created_at desc limit 1)`)).toBe('t');
  });

  test('foto: arquivo inválido mostra erro e não fecha o diálogo', async ({ page, request }) => {
    await accountUser(page, request);
    await page.goto('/conta/perfil');
    await page.getByRole('button', { name: 'Adicionar foto' }).click();
    const dialog = page.getByRole('dialog', { name: 'Foto de perfil' });
    await dialog.locator('input[type=file]').setInputFiles({ name: 'x.gif', mimeType: 'image/gif', buffer: Buffer.from('GIF89a') });
    await expect(dialog.getByRole('alert')).toBeVisible();
    await expect(dialog).toBeVisible();
  });

  test('nome: editar inline atualiza o hero e devolve o foco ao botão', async ({ page, request }) => {
    await accountUser(page, request, 'Marina Alves');
    await page.goto('/conta/perfil');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Marina Alves');
    await page.getByRole('button', { name: 'Editar nome' }).click();
    const save = page.getByRole('button', { name: 'Salvar nome' });
    await expect(save).toBeDisabled(); // igual ao atual
    await page.getByRole('textbox', { name: 'Nome' }).fill('Marina Souza');
    await save.click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Marina Souza');
    await expect(page.getByRole('button', { name: 'Editar nome' })).toBeFocused();
  });

  test('senha: trocar encerra a outra sessão; dispositivo: encerrar uma sessão', async ({ page, request }) => {
    test.setTimeout(120_000);
    const u = await accountUser(page, request);
    const other = await secondSession(request, u.email);
    const asOther = { authorization: `Bearer ${other.token}` };
    expect((await request.get(`${API}/v1/account/me`, { headers: asOther })).status()).toBe(200);

    await page.goto('/conta/seguranca');
    // Dispositivos: a sessão do iPhone aparece e some ao encerrar (a atual não tem botão).
    const devices = page.getByRole('list', { name: 'Lista de dispositivos' });
    // 3 sessões: a do cadastro por API, a deste navegador (atual, sem botão) e a do iPhone.
    await expect(devices.getByRole('listitem')).toHaveCount(3);
    await devices.getByRole('button', { name: /Encerrar sessão em .*iPhone/ }).click();
    await expect(devices.getByRole('listitem')).toHaveCount(2);
    await expect(devices.getByRole('button', { name: /iPhone/ })).toHaveCount(0);
    expect((await request.get(`${API}/v1/account/me`, { headers: asOther })).status()).toBe(401);

    // Senha: formulário recolhido; medidor comunica por texto; salvar só com tudo válido.
    const again = await secondSession(request, u.email);
    await page.getByRole('button', { name: 'Alterar senha' }).click();
    await page.getByLabel('Senha atual').fill(PASSWORD);
    await page.getByLabel('Nova senha').fill('curta');
    await expect(page.getByText('Fraca')).toBeVisible();
    await page.getByLabel('Nova senha').fill('outra-senha-forte-456');
    await expect(page.getByText('Forte')).toBeVisible();
    await page.getByLabel('Confirmar nova senha').fill('diferente');
    await expect(page.getByText('As senhas ainda não coincidem.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Salvar nova senha' })).toBeDisabled();
    await page.getByLabel('Confirmar nova senha').fill('outra-senha-forte-456');
    await page.getByRole('button', { name: 'Salvar nova senha' }).click();
    await expect(page.getByText('Senha alterada. Encerramos os outros dispositivos.')).toBeVisible();
    expect((await request.get(`${API}/v1/account/me`, { headers: { authorization: `Bearer ${again.token}` } })).status()).toBe(401);
    // A sessão atual continua valendo.
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('lembrete: ligar sobe a completude do hero', async ({ page, request }) => {
    await accountUser(page, request);
    await page.goto('/conta/preferencias');
    const hero = page.getByRole('region', { name: 'Resumo do perfil' });
    await expect(hero.getByText('Perfil 40% completo')).toBeVisible();
    await page.getByRole('switch', { name: 'Lembrete diário por e-mail' }).click();
    await expect(hero.getByText('Perfil 60% completo')).toBeVisible();
    await page.reload();
    await expect(page.getByRole('switch', { name: 'Lembrete diário por e-mail' })).toBeChecked();
  });

  test('cards novos por dia: Free não passa de 10 e mostra o aviso do Pro', async ({ page, request }) => {
    await accountUser(page, request);
    await page.goto('/conta/preferencias');
    await page.getByRole('button', { name: 'Aumentar cards novos por dia' }).click();
    await expect(page.getByText('Free permite até 10 por dia. O Pro vai a 20.')).toBeVisible();
  });

  test('exportar baixa um JSON', async ({ page, request }) => {
    await accountUser(page, request);
    await page.goto('/conta/dados');
    await page.getByRole('button', { name: 'Exportar meus dados' }).click();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Baixar' }).click();
    expect((await download).suggestedFilename()).toMatch(/\.json$/);
  });

  test('excluir: digitar EXCLUIR, ver o banner e cancelar', async ({ page, request }) => {
    test.setTimeout(120_000);
    await accountUser(page, request);
    await page.goto('/conta/dados');
    await page.getByRole('button', { name: 'Excluir conta' }).click();
    const dialog = page.getByRole('dialog');
    const confirm = dialog.getByRole('button', { name: 'Excluir conta' });
    await expect(confirm).toBeDisabled();
    await dialog.getByLabel('Digite EXCLUIR para confirmar').fill('excluir'); // sem diferenciar maiúsculas
    await expect(confirm).toBeEnabled();
    await confirm.click();
    const banner = page.getByText(/Sua conta será excluída em/);
    await expect(banner).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar exclusão' }).click();
    await expect(banner).toBeHidden();
    await expect(page.getByRole('button', { name: 'Excluir conta' })).toBeVisible();
  });

  test('plano: Free mostra a oferta Pro; Pro mostra a gestão (STRIPE=mock)', async ({ page, request }) => {
    test.setTimeout(120_000);
    await accountUser(page, request);
    await page.goto('/conta/plano');
    await expect(page.getByRole('button', { name: 'Assinar o Pro' })).toBeVisible();
    await expect(page.getByText('0 de 20')).toBeVisible();
    await page.getByRole('radio', { name: 'Anual' }).click();
    await expect(page.getByText(/R\$ 349/)).toBeVisible();
    await page.goto('/precos');
    await page.getByText('Cartão', { exact: true }).click();
    await page.getByRole('button', { name: 'Assinar o Pro' }).click();
    await expect(page).toHaveURL(/\/conta/);
    await page.goto('/conta/plano');
    await expect(page.getByRole('button', { name: 'Gerenciar assinatura' })).toBeVisible();
    await expect(page.getByText('Ilimitado').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Assinar o Pro' })).toHaveCount(0);
  });

  test('sair da conta leva ao login e limpa a sessão', async ({ page, request }) => {
    await accountUser(page, request);
    await page.goto('/conta/perfil');
    await page.getByRole('button', { name: 'Sair da conta' }).click();
    await expect(page).not.toHaveURL(/\/conta/);
    await page.goto('/conta/perfil');
    await expect(page).toHaveURL(/\/entrar/);
  });
});
