import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions Générales d'Utilisation — VAR Time",
};

export default function CguPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white px-4 py-8">
      <div className="mx-auto max-w-prose space-y-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          Accueil
        </Link>

        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-green-400 mb-1">
            Légal
          </p>
          <h1 className="text-2xl font-black">
            Conditions Générales d&apos;Utilisation
          </h1>
          <p className="mt-2 text-xs text-zinc-500">
            Dernière mise à jour : mai 2026
          </p>
        </div>

        <section className="space-y-4 text-sm text-zinc-300 leading-relaxed">
          <h2 className="text-base font-black text-white">1. Objet</h2>
          <p>
            VAR Time est une application de jeu de prédiction sportive gratuite.
            Les présentes CGU régissent l&apos;utilisation du service accessible
            sur app.vartime.fr et via l&apos;application mobile.
          </p>
        </section>

        <section className="space-y-4 text-sm text-zinc-300 leading-relaxed">
          <h2 className="text-base font-black text-white">
            2. Accès au service
          </h2>
          <p>
            L&apos;accès à VAR Time est réservé aux personnes majeures (18 ans
            et plus). L&apos;inscription est gratuite et nécessite un compte
            Google.
          </p>
        </section>

        <section className="space-y-4 text-sm text-zinc-300 leading-relaxed">
          <h2 className="text-base font-black text-white">3. Nature du jeu</h2>
          <p>
            VAR Time est un jeu de simulation gratuit. Les &laquo; Sifflets
            &raquo; sont une monnaie virtuelle fictive sans aucune valeur
            monétaire. Aucun argent réel n&apos;est misé, gagné, ou perdu. Il ne
            s&apos;agit pas de jeux d&apos;argent au sens de la loi du 12 mai
            2010.
          </p>
        </section>

        <section className="space-y-4 text-sm text-zinc-300 leading-relaxed">
          <h2 className="text-base font-black text-white">
            4. Données personnelles
          </h2>
          <p>
            Nous collectons votre adresse email Google, un pseudo généré
            automatiquement, et vos scores de jeu. Ces données sont utilisées
            uniquement pour faire fonctionner le service. Consultez notre{" "}
            <Link href="/privacy" className="text-green-400 underline">
              Politique de confidentialité
            </Link>{" "}
            pour plus de détails.
          </p>
        </section>

        <section className="space-y-4 text-sm text-zinc-300 leading-relaxed">
          <h2 className="text-base font-black text-white">5. Responsabilité</h2>
          <p>
            VAR Time est fourni &laquo; en l&apos;état &raquo; sans garantie de
            disponibilité continue. Nous nous réservons le droit de modifier ou
            d&apos;interrompre le service à tout moment.
          </p>
        </section>

        <section className="space-y-4 text-sm text-zinc-300 leading-relaxed">
          <h2 className="text-base font-black text-white">6. Contact</h2>
          <p>Pour toute question : rem.valet@gmail.com</p>
        </section>
      </div>
    </main>
  );
}
