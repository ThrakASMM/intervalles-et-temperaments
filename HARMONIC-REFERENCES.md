# Références instrumentales : enregistrement et reconstruction

Les quatre presets instrumentaux sont calculés sur des notes réellement enregistrées à l’Université de l’Iowa. Chaque preset décrit **cet extrait, cette note et cette technique de jeu**, et non un spectre universel de l’instrument.

## Écoute A/B

- **A · Enregistrement** lit un extrait réel, avec ses bruits, son attaque et ses variations. Il se termine après environ 2,2 secondes.
- **B · Reconstruction** additionne 16 sinusoïdes, avec les amplitudes moyennes mesurées. La lecture est continue ; les curseurs et les accordages la modifient.
- La sélection d’un instrument replace la fondamentale sur Do₄, avec La₄ = 440 Hz, en série naturelle. L’enregistrement est recalé sur la même hauteur moyenne par sa vitesse de lecture. Une transposition ultérieure modifie donc sa durée et ses résonances.
- Les niveaux efficaces moyens sont appariés sur la portion analysée. Ce n’est pas une égalisation de sonie perceptive. La reconstruction conserve sa normalisation quand on modifie les curseurs.
- Un seul signal A ou B joue à la fois. Un changement d’onglet, Échap et Pause arrêtent aussi l’enregistrement et annulent un chargement en attente.

L’attaque, le souffle, le frottement d’archet, les variations individuelles des partiels, les partiels au-delà de H16 et leurs phases ne sont pas reconstruits. L’écart audible entre A et B fait partie de l’expérience.

## Extraits retenus

| Instrument | Interprète | Technique | Fondamentale médiane | Durée de l’extrait | Portion analysée |
|---|---|---|---:|---:|---:|
| [Trompette](https://theremin.music.uiowa.edu/MISBbtrumpet.html) | Aren Van Houzen | mezzo-forte, sans vibrato | 260.754 Hz | 2.32 s | 0.720–1.665 s |
| [Violon à l’archet](https://theremin.music.uiowa.edu/MISviolin.html) | Josue Jean-Francois | mezzo-forte, sur la corde de sol | 263.836 Hz | 2.32 s | 0.720–1.665 s |
| [Flûte](https://theremin.music.uiowa.edu/MISflute.html) | Sonja Feig | mezzo-forte, sans vibrato | 259.946 Hz | 2.25 s | 0.699–1.612 s |
| [Clarinette](https://theremin.music.uiowa.edu/MISBbclarinet.html) | Christine Bellomy | mezzo-forte | 260.905 Hz | 2.18 s | 0.678–1.560 s |

Les fichiers WAV livrés sont des extraits mono PCM 16 bits à 44,1 kHz : recadrage, gain linéaire commun à tout l’extrait (crête à 0,85), fondus de 10 ms aux deux limites. Aucun bruit ou vibrato synthétique n’est ajouté. Les extraits de trompette et de violon sont volontairement coupés avant la fin de la note jouée.

## Méthode de mesure

`analyse-harmonic-references.py` effectue l’analyse avec NumPy et SciPy ; FFmpeg décode les sources AIFF.

1. Repérage des notes à partir de leur niveau efficace sur 10 ms. Seuil à 3,5 % du maximum ; les courtes coupures sont regroupées. Sélection du Do₄ (première note pour trompette/clarinette, deuxième pour flûte/violon).
2. Analyse d’une portion intérieure à l’extrait, après l’attaque, sur des fenêtres de Hann de 8 192 échantillons (environ 186 ms), espacées de 2 205 échantillons (50 ms). FFT complétée par des zéros jusqu’à 131 072 points : cela affine la grille d’interpolation, pas la résolution physique de la fenêtre.
3. Ajustement de la fondamentale par un peigne harmonique H1–H8, autour du Do₄. Pour chaque partiel H1–H16, mesure du maximum local autour de n × f₀ ; recherche dans ±max(9 Hz, 0,3 % × n × f₀).
4. Moyenne quadratique des amplitudes des fenêtres, puis normalisation du partiel le plus fort à 100 %. Les curseurs sont arrondis à 0,1 point de pourcentage. La fondamentale affichée est la médiane des estimations.

Ces valeurs sont des estimations sur fenêtres, dépendantes de la portion analysée. Elles ne représentent ni un spectre instantané ni une mesure acoustique absolue en pascals. Le bruit dans les bandes et les fluctuations du musicien contribuent à l’incertitude.

## Sources et autorisation

Collection **Musical Instrument Samples**, créée par **Lawrence Fritts**, University of Iowa Electronic Music Studios. La [page officielle de la collection](https://theremin.music.uiowa.edu/MIS.html) autorise le téléchargement et l’utilisation pour tout projet, sans restrictions. Les interprètes sont crédités ci-dessus. L’université et les musiciens ne sont pas présentés comme partenaires de cette application.

Sources AIFF ; plages en secondes mesurées depuis le début de la gamme :

- [Trumpet.novib.mf.C4B4.aiff](https://theremin.music.uiowa.edu/sound%20files/MIS/Brass/Bbtrumpet/Trumpet.novib.mf.C4B4.aiff) : 2.840 à 5.160 s. Début de fichier téléchargé : octets 0 à 474910.
- [Violin.arco.mf.sulG.B3B4.aiff](https://theremin.music.uiowa.edu/sound%20files/MIS/Strings/violin/Violin.arco.mf.sulG.B3B4.aiff) : 12.580 à 14.900 s. Début de fichier téléchargé : octets 0 à 2097151.
- [Flute.nonvib.mf.B3B4.aiff](https://theremin.music.uiowa.edu/sound%20files/MIS/Woodwinds/flute/Flute.nonvib.mf.B3B4.aiff) : 2.780 à 5.030 s. Début de fichier téléchargé : octets 0 à 2097151.
- [BbClar.mf.C4B4.aiff](https://theremin.music.uiowa.edu/sound%20files/MIS/Woodwinds/Bbclarinet/BbClar.mf.C4B4.aiff) : 2.130 à 4.310 s. Début de fichier téléchargé : octets 0 à 2097151.

Les empreintes SHA-256 des préfixes AIFF analysés et des WAV distribués figurent dans `harmonic-references.js`, avec les 16 amplitudes, les fréquences et les fenêtres utilisées. Pour reproduire : télécharger les plages d’octets indiquées avec un en-tête HTTP `Range`, nommer les fichiers `trumpet.aiff`, `violin.aiff`, `flute.aiff` et `clarinet.aiff`, fournir un `sources.json` contenant pour chacun `id` et `source`, puis exécuter :

```sh
python analyse-harmonic-references.py /chemin/vers/les/sources
```

Pour comprendre pourquoi le spectre seul ne reproduit pas tout le timbre : [Spectre sonore et timbre — UNSW](https://phys.unsw.edu.au/music/sound.spectrum.html).
