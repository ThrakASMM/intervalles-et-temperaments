# Intervalles et accordages/Tempéraments — ASMM

Application pédagogique d’écoute et de visualisation des intervalles, des accordages et des battements. © 2026 Guillaume Estace.

## Utilisation

Accès direct au piano : https://thrakasmm.github.io/intervalles-et-temperaments/#piano. Le bouton **Ouvrir le piano**, en haut de page, affiche automatiquement le clavier.

Cliquer sur **Écouter** en haut. Choisir le bourdon et l’intervalle, ou ouvrir **Libre · frise** pour déplacer la deuxième note sur une à trois octaves.

Sur iPhone/iPad avec iOS/iPadOS 17 ou ultérieur et un navigateur compatible, l’application demande une session musicale `playback` au premier geste de lecture, avant de créer le contexte audio : la sonnerie peut rester coupée. Garder le volume multimédia audible. Les navigateurs sans cette API ou qui refusent le réglage conservent leur comportement habituel ; sur les anciens iPhone, il peut être nécessaire de désactiver le mode silencieux. Ce réglage concerne le bourdon, le piano et les harmoniques. Il ne garantit pas la lecture écran verrouillé. [Explication WebKit](https://bugs.webkit.org/show_bug.cgi?id=237322#c6).

- Douze accordages : égal, juste, pythagoricien, mésotoniques 1/4, 1/5 et 1/6 de comma, Werckmeister III et IV, Kirnberger III (Forkel 1779), Vallotti, Young II et Kellner. [Variantes, données et formules](TUNINGS.md). Un sélecteur ajoute un repère supplémentaire dans la frise.
- Piano polyphonique sous la frise : souris, multitouch avec glissando, clavier AZERTY ou QWERTY, de une à trois octaves. Sur smartphone : touches agrandies, curseur de déplacement horizontal et mode « Agrandir le piano », utilisable en paysage.
- Piano seul, avec bourdon ou avec le module d’intervalles ; maintien des notes et douze accordages. En mode combiné, les notes et graphiques du module restent indépendants du piano. Timbre et volume du piano indépendants. « Écouter le module seul » libère le piano et retrouve l’intervalle précédent.
- Série harmonique H1 à H16 : sinusoïdes seules ou additionnées, amplitudes égales ou décroissantes, fréquences exactes et écarts aux notes tempérées. Portée interactive : notes cliquables, fractions naturelles et fractions réduites dans l’octave, cents recalculés selon la série naturelle ou les douze accordages fixes. La référence des écarts est toujours le tempérament égal. Accès direct : https://thrakasmm.github.io/intervalles-et-temperaments/#harmoniques.
- Quatre timbres synthétiques, volume et sourdine pour chaque voix.
- Deux voix par défaut, troisième note dans Options avancées.
- Formules, cents et rapports de fréquences.
- Points mobiles sur les sinusoïdes, zoom des cycles.
- Trois vues scientifiques : **Enveloppe**, **Cercle de phase**, **Lissajous**.
- Pulsation lumineuse des battements, temps réel ou ralenti visuel.

Le piano démarre au premier appui. Les lettres affichées couvrent la première octave du clavier visible. **−1 octave / +1 octave** ou le sélecteur déplacent le piano indépendamment du bourdon, entre les octaves de départ 1 et 6. L’étendue visible suit celle de la frise. Les notes maintenues restent audibles entre octaves et lors des changements de focus. Avec « Maintenir les notes », recliquer une touche allumée (ou retaper sa lettre) coupe cette note seule ; les autres continuent. Les touches MIDI conservent le comportement habituel d’une pédale. Relâcher « Maintenir les notes » coupe les notes relâchées, en tenant compte d’une éventuelle pédale MIDI. Échap arrête tout, et « Tout relâcher » libère les notes maintenues.

En mode Piano seul ou Piano + bourdon, les graphiques suivent la dernière note située dans la frise, pas l’accord complet. En mode Piano + module d’intervalles, ils conservent les notes du premier module. Une note plus grave ou plus aiguë reste jouable ; un message indique alors que les graphiques gardent la dernière note de la frise.

### Construire un timbre sur la portée

Seize curseurs règlent les amplitudes H1–H16, de 0 à 100 %, directement sous les notes. La portée affiche les niveaux des partiels actifs. Un réglage manuel active la superposition et le partiel concerné ; 0 % le coupe. Le bouton **Superposer les harmoniques** affiche clairement son état. Les presets **Sinusoïde**, **Flûte**, **Clarinette**, **Orgue**, **Brillant (1/n)** et **Amplitudes égales** donnent des points de départ modifiables. Ce sont des modèles de synthèse additive, pas des enregistrements d’instruments.

Les boutons **Naturel**, **Égal** et **l’accordage choisi** conservent la sélection et les amplitudes pendant la comparaison. Le sélecteur du troisième accordage reste sur son choix lorsque les deux autres boutons sont utilisés. Les niveaux sont relatifs : lorsque la somme dépasse 1, le moteur compense le niveau global pour conserver une marge audio. Baisser une harmonique isolée diminue bien son amplitude.

### Clavier MIDI

Sur la page HTTPS dans un navigateur disposant de Web MIDI (Chrome ou Edge sur ordinateur), brancher le clavier USB ou l’interface MIDI puis cliquer **Connecter un clavier MIDI** et autoriser l’accès demandé par le navigateur. Choisir l’entrée si plusieurs appareils sont disponibles. Les notes MIDI réelles commandent les sons internes de l’application dans l’accordage choisi ; les boutons d’octave de l’écran ne transposent pas le clavier matériel. Vélocité, Note Off, Note On à vélocité zéro, sustain CC64 par canal et arrêt CC120/123 sont pris en charge. Les déconnexions et changements d’entrée libèrent les notes MIDI. Aucun message n’est envoyé à l’instrument, et SysEx n’est pas demandé.

### Piano acoustique en option

Le piano s’ouvre toujours avec un son de synthèse continu, même après avoir utilisé le son enregistré. Pour ce dernier, choisir explicitement **Piano acoustique · enregistré** dans le timbre du piano. Trente échantillons locaux (environ 2 Mo) sont chargés au premier usage. La lecture est transposée selon le diapason et l’accordage choisis. La vélocité MIDI règle l’amplitude (une couche d’échantillons) ; la pédale prolonge la résonance enregistrée, qui décroît naturellement. Les sons de synthèse restent continus et sont mieux adaptés à l’étude de battements idéaux.

Échantillons **Salamander Grand Piano V3**, © Alexander Holm, licence [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/), texte complet dans `PIANO-LICENSE.txt`. Sources : [instrument original](https://github.com/sfzinstruments/SalamanderGrandPiano) ; [versions MP3 distribuées par Tone.js](https://github.com/Tonejs/audio/tree/master/salamander). Fichiers MP3 inchangés, renommés avec le préfixe `piano-` ; transposition à la lecture. L’auteur n’endosse pas cette application.

Les dessins sont des modèles calculés : l’enveloppe et le cercle représentent une paire d’harmoniques à amplitudes égales, pas le volume total ni la phase mesurée du son. Lissajous représente les fondamentales. Le ralenti visuel ne modifie pas le son.

## Hébergement

Application statique, sans compilation ni serveur applicatif. Les fichiers du site sont à la racine. Dans GitHub Pages, publier la branche **main**, dossier **/(root)**.

Pour l’utiliser localement, ouvrir `index.html` ou servir ce dossier avec un serveur HTTP. Les réglages sont conservés dans le navigateur. La police Nunito Sans utilise Google Fonts ; une police locale prend le relais hors connexion.

## Vérification

`node verify.cjs` vérifie les calculs, le routage audio, la polyphonie, les relâchements, le maintien et les changements d’accordage, les octaves indépendantes, le sustain entre octaves, les événements MIDI simulés, les sources audio échantillonnées et la portée interactive.

`node verify.cjs unsupported` et `node verify.cjs rejected` vérifient aussi que la lecture reste fonctionnelle si l’API Audio Session est absente ou refuse le réglage. Le commutateur silencieux doit être vérifié sur un iPhone physique.

## Identité

Logo original de l’American School of Modern Music fourni par Guillaume Estace. Le raccourci, le favicon et l’icône iPhone reprennent exactement les 21 rectangles du pictogramme du SVG fourni ; aucun dessin de substitution. © 2026 Guillaume Estace. Aucune licence de redistribution supplémentaire n’est accordée pour l’application ou le logo ; les échantillons de piano conservent leur licence CC BY 3.0 propre.

## Références

- [Battements — UNSW](https://www.animations.physics.unsw.edu.au/jw/beats.htm)
- [Vecteurs de phase — UNSW](https://www.animations.physics.unsw.edu.au/jw/phasor-addition.html)
- [Enveloppe — OpenStax](https://openstax.org/books/university-physics-volume-1/pages/17-6-beats)
- [Lissajous — Tektronix](https://www.tek.com/en/support/faqs/how-do-i-utilize-xy-display-feature-dpo-mso-mdo4000-series-oscilloscope)

- [Web MIDI — W3C](https://www.w3.org/TR/webmidi/)
- [Permissions MIDI — Chrome](https://developer.chrome.com/blog/web-midi-permission-prompt)
