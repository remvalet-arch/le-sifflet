import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Politique de confidentialité — VAR Time",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white px-4 py-8">
      <div className="mx-auto max-w-prose space-y-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-white"
        >
          <ChevronLeft className="size-4" />
          Accueil
        </Link>

        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-green-400 mb-1">
            Légal
          </p>
          <h1 className="text-2xl font-semibold">
            Politique de confidentialité
          </h1>
          <p className="mt-2 text-xs text-zinc-500">
            Dernière mise à jour : mai 2026
          </p>
        </div>

        <section className="space-y-4 text-sm text-zinc-300 leading-relaxed">
          <h2 className="text-base font-semibold text-white">
            1. Données collectées
          </h2>
          <p>
            Lors de votre inscription et utilisation de VAR Time, nous
            collectons :
          </p>
          <ul className="list-disc list-inside space-y-1 text-zinc-400">
            <li>Adresse email (via authentification Google)</li>
            <li>Pseudo généré automatiquement</li>
            <li>Scores et historique de jeu (pronos, paris, XP)</li>
            <li>Token de notification push (si activé)</li>
            <li>Date de dernière connexion</li>
          </ul>
          <p>
            Nous ne collectons pas de données de localisation, données
            bancaires, ou informations sensibles.
          </p>
        </section>

        <section className="space-y-4 text-sm text-zinc-300 leading-relaxed">
          <h2 className="text-base font-semibold text-white">
            2. Finalités du traitement
          </h2>
          <ul className="list-disc list-inside space-y-1 text-zinc-400">
            <li>Fournir et améliorer le service de jeu</li>
            <li>Calculer les classements et statistiques</li>
            <li>Envoyer des notifications push si vous y avez consenti</li>
            <li>Détecter les comportements abusifs</li>
          </ul>
        </section>

        <section className="space-y-4 text-sm text-zinc-300 leading-relaxed">
          <h2 className="text-base font-semibold text-white">
            3. Durée de conservation
          </h2>
          <p>
            Vos données sont conservées pendant toute la durée de votre compte.
            En cas de suppression du compte, vos données personnelles sont
            supprimées sous 30 jours. Les données anonymisées de jeu peuvent
            être conservées à des fins statistiques.
          </p>
        </section>

        <section className="space-y-4 text-sm text-zinc-300 leading-relaxed">
          <h2 className="text-base font-semibold text-white">4. Vos droits</h2>
          <p>
            Conformément au RGPD (Règlement UE 2016/679), vous disposez des
            droits suivants :
          </p>
          <ul className="list-disc list-inside space-y-1 text-zinc-400">
            <li>Droit d&apos;accès à vos données</li>
            <li>Droit de rectification</li>
            <li>
              Droit à l&apos;effacement (&laquo; droit à l&apos;oubli &raquo;)
            </li>
            <li>Droit à la portabilité</li>
            <li>Droit d&apos;opposition</li>
          </ul>
          <p>Pour exercer ces droits, contactez-nous à : rem.valet@gmail.com</p>
        </section>

        <section className="space-y-4 text-sm text-zinc-300 leading-relaxed">
          <h2 className="text-base font-semibold text-white">
            5. Sous-traitants
          </h2>
          <p>Nous utilisons les services tiers suivants :</p>
          <ul className="list-disc list-inside space-y-1 text-zinc-400">
            <li>
              <strong className="text-white">Supabase</strong> : base de données
              et authentification (Singapour / UE)
            </li>
            <li>
              <strong className="text-white">Vercel</strong> : hébergement
              (États-Unis, avec transfert encadré par les clauses contractuelles
              types)
            </li>
            <li>
              <strong className="text-white">Google</strong> : authentification
              OAuth
            </li>
          </ul>
        </section>

        <section className="space-y-4 text-sm text-zinc-300 leading-relaxed">
          <h2 className="text-base font-semibold text-white">6. Contact DPO</h2>
          <p>
            Responsable du traitement : Rémi Valet
            <br />
            Email : rem.valet@gmail.com
          </p>
          <p>
            Vous pouvez également introduire une réclamation auprès de la{" "}
            <span className="text-zinc-400">CNIL (www.cnil.fr)</span>.
          </p>
        </section>
      </div>
    </main>
  );
}
