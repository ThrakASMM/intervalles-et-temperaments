# Références des accordages

Les douze accordages sont communs au module d’intervalles, au piano et à la comparaison de la série harmonique. La note de départ transpose l’origine de la grille ; elle ne sélectionne pas une tonalité à l’intérieur d’un clavier historique resté fixe. Une grille contient douze degrés par octave. Les enharmonies distinctes des systèmes historiques ne sont pas toutes disponibles.

## Tables historiques

Valeurs de l’[archive Scala de la fondation Huygens–Fokker](https://www.huygens-fokker.org/microtonality/scales.html), version 94, mars 2026 ([archive ZIP](https://www.huygens-fokker.org/docs/scales.zip)). Collection réunie principalement par John H. Chalmers et Manuel Op de Coul.

| Choix dans l’application | Fichier Scala retenu | Tierce majeure depuis l’origine, en cents |
| --- | --- | ---: |
| Werckmeister III | `werck3.scl` | 390,225 |
| Werckmeister IV | `werck4.scl` | 392,180 |
| Kirnberger III · Forkel 1779 | `kirnberger.scl` | 1200 × log₂(5/4) ≈ 386,314 |
| Vallotti | `vallotti.scl` | 392,180 |
| Young II · 1799 | `young2.scl` | 392,180 |
| Kellner | `kellner.scl` | 389,052 |

Les rapports rationnels restent exacts dans le calcul. Les entrées décimales conservent la précision publiée par l’archive. `kirnberger.scl` et `kirnberger3.scl` désignent des variantes différentes : l’application utilise explicitement la première, liée à la lettre à Forkel de 1779. Le choix Young II utilise `young2.scl`, pas `young.scl`.

Le tempérament de Kellner est une proposition moderne ; son nom ne prouve pas l’accordage employé par Bach.

## Systèmes calculés

- **Égal** : c = 100 × nombre de demi-tons.
- **Juste, limite 5** : grille 1/1, 16/15, 9/8, 6/5, 5/4, 4/3, 45/32, 3/2, 8/5, 5/3, 9/5, 15/8, 2/1. Le repère supplémentaire de septième harmonique 7/4 reste accessible dans le module d’intervalles. Les rapports depuis l’origine sont justes ; toutes les paires de notes de la grille ne le sont pas.
- **Pythagoricien** : quintes de rapport 3/2, ramenées dans une octave.
- **Mésotoniques 1/4, 1/5 et 1/6 de comma syntonique** : quinte génératrice g = (3/2) × (80/81)^(1/q), où q vaut 4, 5 ou 6. Pour q = 4, g = ⁴√5.

Pour la chaîne de quintes régulière, les puissances par degré chromatique sont 0, −5, 2, −3, 4, −1, 6, 1, −4, 3, −2, 5. Depuis Do, cela retient Ré♭, Mi♭, Fa♯, La♭ et Si♭. Le choix d’un autre représentant enharmonique change certaines hauteurs ; les variantes Scala qui retiennent Do♯ au lieu de Ré♭, par exemple, ne donnent donc pas la même table complète.

Formules générales : c = 1200 × log₂(r) ; f = f₀ × 2^(c/1200). L’octave est toujours 2/1.

## Comparaison de la série harmonique

**Naturel** produit exactement fₙ = n × f₁. **Égal** et le troisième bouton remplacent chaque partiel par son degré chromatique de référence accordé dans la grille choisie. Ces fréquences ne forment alors généralement plus une série de multiples entiers. Les fractions affichées restent les références naturelles, et les écarts en cents se mesurent toujours par rapport au tempérament égal.

Le choix du troisième bouton, les harmoniques activées et leurs amplitudes sont conservés en alternant Naturel / Égal / autre accordage.

## Différence avec Hermode dans Logic

Les choix de cette application sont fixes. [Hermode Tuning dans Logic](https://support.apple.com/guide/logicpro/hermode-tuning-lgcpa88a63e7/mac) adapte les hauteurs au contenu harmonique joué. Ce moteur adaptatif n’est pas implémenté ici.
