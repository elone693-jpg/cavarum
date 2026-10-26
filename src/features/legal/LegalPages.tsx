import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LEGAL_INFO } from './legal-info';

function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-10">
      <Link to="/" className="inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground">
        ← Cavarum
      </Link>
      <h1 className="font-serif text-3xl">{title}</h1>
      <div className="space-y-6 text-sm leading-relaxed [&_h2]:font-serif [&_h2]:text-xl [&_h2]:text-foreground">{children}</div>
      <p className="text-xs text-muted-foreground">Dernière mise à jour : {LEGAL_INFO.lastUpdated}</p>
    </main>
  );
}

export function LegalNoticePage() {
  return (
    <LegalLayout title="Mentions légales">
      <section className="space-y-2">
        <h2>Éditeur</h2>
        <p>{LEGAL_INFO.publisher}</p>
        <p>{LEGAL_INFO.publisherStatus}</p>
        <p>{LEGAL_INFO.address}</p>
        <p>Contact : {LEGAL_INFO.contactEmail}</p>
      </section>
      <section className="space-y-2">
        <h2>Directeur de la publication</h2>
        <p>{LEGAL_INFO.publicationDirector}</p>
      </section>
      <section className="space-y-2">
        <h2>Hébergement</h2>
        <p>Application : {LEGAL_INFO.host}</p>
        <p>Données : {LEGAL_INFO.databaseHost}</p>
      </section>
      <section className="space-y-2">
        <h2>Alcool</h2>
        <p>
          Cavarum est un outil de gestion de collection réservé aux personnes majeures. Il ne vend pas d’alcool et ne fait la
          promotion d’aucune marque. L’abus d’alcool est dangereux pour la santé, à consommer avec modération.
        </p>
      </section>
    </LegalLayout>
  );
}

export function PrivacyPage() {
  return (
    <LegalLayout title="Politique de confidentialité">
      <section className="space-y-2">
        <h2>Responsable du traitement</h2>
        <p>
          {LEGAL_INFO.publisher} — {LEGAL_INFO.address} — {LEGAL_INFO.contactEmail}
        </p>
      </section>
      <section className="space-y-2">
        <h2>Données collectées</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Compte : nom, adresse email, mot de passe (stocké chiffré), date de confirmation de majorité.</li>
          <li>Collection : caves, bouteilles, emplacements, notes, achats (prix, date, vendeur), estimations.</li>
          <li>Fichiers que vous ajoutez : photos de bouteilles et factures.</li>
        </ul>
      </section>
      <section className="space-y-2">
        <h2>Finalités et base légale</h2>
        <p>
          Ces données servent uniquement à fournir le service de gestion de votre cave (exécution du contrat, art. 6.1.b du
          RGPD). La confirmation de majorité répond à l’obligation légale de réserver le service aux personnes majeures. Aucune
          donnée n’est vendue, ni utilisée à des fins publicitaires.
        </p>
      </section>
      <section className="space-y-2">
        <h2>Destinataires et sous-traitants</h2>
        <p>Vos données ne sont accessibles qu’à vous. Elles sont hébergées par :</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{LEGAL_INFO.databaseHost} (base de données, authentification, fichiers).</li>
          <li>{LEGAL_INFO.host} (application).</li>
        </ul>
      </section>
      <section className="space-y-2">
        <h2>Durée de conservation</h2>
        <p>
          Vos données sont conservées tant que votre compte est actif. La suppression du compte efface immédiatement et
          définitivement vos données et vos fichiers ; les sauvegardes techniques de l’hébergeur sont purgées selon son propre
          cycle de rotation.
        </p>
      </section>
      <section className="space-y-2">
        <h2>Vos droits</h2>
        <p>
          Vous disposez des droits d’accès, de rectification, d’effacement, de portabilité, de limitation et d’opposition. Depuis{' '}
          <Link to="/account" className="text-primary underline-offset-4 hover:underline">
            Mon compte
          </Link>
          , vous pouvez télécharger toutes vos données et supprimer votre compte. Pour toute autre demande : {LEGAL_INFO.contactEmail}.
        </p>
        <p>
          Vous pouvez introduire une réclamation auprès de la CNIL :{' '}
          <a href="https://www.cnil.fr/fr/plaintes" className="text-primary underline-offset-4 hover:underline" rel="noreferrer" target="_blank">
            cnil.fr
          </a>
          .
        </p>
      </section>
      <section className="space-y-2">
        <h2>Cookies et traceurs</h2>
        <p>
          Cavarum n’utilise ni cookie publicitaire, ni outil de mesure d’audience, ni police ou script chargé depuis un service
          tiers. Seul le jeton de session, strictement nécessaire à la connexion, est conservé dans votre navigateur : il est
          exempté de consentement.
        </p>
      </section>
    </LegalLayout>
  );
}
