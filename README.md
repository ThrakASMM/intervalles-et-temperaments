# Intervalles et accordages/Tempéraments — ASMM

Application pédagogique d’écoute et de visualisation des intervalles, des accordages et des battements. © 2026 Guillaume Estace.

## Utilisation

Accès direct au piano : https://thrakasmm.github.io/intervalles-et-temperaments/#piano. Le bouton **Ouvrir le piano**, en haut de page, affiche automatiquement le clavier.

Cliquer sur **Écouter** en haut. Choisir le bourdon et l’intervalle, ou ouvrir **Libre · frise** pour déplacer la deuxième note sur une à trois octaves.

- Repères justes, égaux, pythagoriciens et mésotoniques.
- Piano polyphonique sous la frise : souris, multitouch, clavier AZERTY ou QWERTY, de une à trois octaves.
- Piano avec ou sans bourdon, maintien des notes, accordages juste, égal, pythagoricien et mésotonique.
- Série harmonique H1 à H16 : sinusoïdes seules ou additionnées, amplitudes égales ou décroissantes, fréquences exactes et écarts aux notes tempérées. Schéma fourni pour le cours et comparaison immédiate naturelle / tempérée, à sélection et amplitudes identiques. Accès direct : https://thrakasmm.github.io/intervalles-et-temperaments/#harmoniques.
- Quatre timbres synthétiques, volume et sourdine pour chaque voix.
- Deux voix par défaut, troisième note dans Options avancées.
- Formules, cents et rapports de fréquences.
- Points mobiles sur les sinusoïdes, zoom des cycles.
- Trois vues scientifiques : **Enveloppe**, **Cercle de phase**, **Lissajous**.
- Pulsation lumineuse des battements, temps réel ou ralenti visuel.

Le piano démarre au premier appui. Les lettres affichées couvrent une octave ; le sélecteur permet de changer d’octave. Échap arrête tout, et « Tout relâcher » libère les notes maintenues. Les graphiques suivent la dernière note jouée face au bourdon, pas l’accord complet.

Les dessins sont des modèles calculés : l’enveloppe et le cercle représentent une paire d’harmoniques à amplitudes égales, pas le volume total ni la phase mesurée du son. Lissajous représente les fondamentales. Le ralenti visuel ne modifie pas le son.

## Hébergement

Application statique, sans compilation ni serveur applicatif. Les fichiers du site sont à la racine. Dans GitHub Pages, publier la branche **main**, dossier **/(root)**.

Pour l’utiliser localement, ouvrir `index.html` ou servir ce dossier avec un serveur HTTP. Les réglages sont conservés dans le navigateur. La police Nunito Sans utilise Google Fonts ; une police locale prend le relais hors connexion.

## Vérification

`node verify.cjs` vérifie les calculs, le routage audio, la polyphonie, les relâchements, le maintien et les changements d’accordage.

## Identité

Logo original de l’American School of Modern Music fourni par Guillaume Estace. © 2026 Guillaume Estace. Aucune licence de redistribution supplémentaire n’est accordée par ce dépôt.

## Références

- [Battements — UNSW](https://www.animations.physics.unsw.edu.au/jw/beats.htm)
- [Vecteurs de phase — UNSW](https://www.animations.physics.unsw.edu.au/jw/phasor-addition.html)
- [Enveloppe — OpenStax](https://openstax.org/books/university-physics-volume-1/pages/17-6-beats)
- [Lissajous — Tektronix](https://www.tek.com/en/support/faqs/how-do-i-utilize-xy-display-feature-dpo-mso-mdo4000-series-oscilloscope)
