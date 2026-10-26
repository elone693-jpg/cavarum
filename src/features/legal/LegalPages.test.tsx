import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderRoute } from '@/test/render';
import { LegalNoticePage, PrivacyPage } from './LegalPages';

describe('Mentions légales', () => {
  it('présente l’éditeur, la publication et l’hébergement (LCEN art. 6)', () => {
    renderRoute(<LegalNoticePage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Mentions légales' })).toBeInTheDocument();
    for (const section of ['Éditeur', 'Directeur de la publication', 'Hébergement']) {
      expect(screen.getByRole('heading', { name: section })).toBeInTheDocument();
    }
  });
});

describe('Politique de confidentialité', () => {
  it('couvre les informations exigées par le RGPD', () => {
    renderRoute(<PrivacyPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'Politique de confidentialité' })).toBeInTheDocument();
    for (const section of [
      'Données collectées',
      'Finalités et base légale',
      'Destinataires et sous-traitants',
      'Durée de conservation',
      'Vos droits',
      'Cookies et traceurs',
    ]) {
      expect(screen.getByRole('heading', { name: section })).toBeInTheDocument();
    }
  });

  it('renvoie vers l’export et la suppression du compte, et vers la CNIL', () => {
    renderRoute(<PrivacyPage />);
    expect(screen.getByRole('link', { name: 'Mon compte' })).toHaveAttribute('href', '/account');
    expect(screen.getByRole('link', { name: 'cnil.fr' })).toHaveAttribute('href', 'https://www.cnil.fr/fr/plaintes');
  });
});
