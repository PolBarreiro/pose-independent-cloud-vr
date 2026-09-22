# Realitat virtual al núvol independent de la posició del cap (versió en català)

**Autor:** Pol Barreiro Font · **Data:** 22 de setembre de 2026 · **Llicència:** CC BY-NC-ND 4.0

> Aquest és un resum en català de la proposta tècnica. El document de referència és la versió anglesa: [TECHNICAL_PROPOSAL.md](TECHNICAL_PROPOSAL.md).

## El problema

GeForce NOW funciona en ulleres de realitat virtual (Vision Pro, Quest, Pico), però només com una **pantalla gegant virtual per a jocs plans**. Des del 19 de març de 2026 aquesta pantalla va a 90 fps. No ofereix jocs de RV nadius.

El motiu és que, en RV, qualsevol retard entre moure el cap i veure la imatge corresponent **mareja**. Per estar còmode, aquest retard (*motion-to-photon*) ha de ser d'uns 20 ms. Un viatge d'anada i tornada a un centre de dades, més renderitzar, codificar i descodificar, sol sumar entre 26 i més de 100 ms, i a més varia (*jitter*).

La causa és d'arquitectura: **avui la imatge que envia el servidor depèn de la posició del cap**. Cada moviment del cap ha de fer un viatge d'anada i tornada per la xarxa. La predicció i la reprojecció (*timewarp*) només ho amaguen quan la xarxa és molt propera.

## La solució

**Treure la posició del cap del bucle de xarxa.** Per a cada fotograma, el servidor genera una representació lleugera de **tot l'entorn en 360°**. Les ulleres fan de "projector": renderitzen localment la vista de cada ull a la freqüència nativa (90–120 Hz), amb la posició del cap més recent. És el mateix que ja fan quan reprodueixen un vídeo 360° o una escena de Gaussian splats, que no marejen.

- **Moviment del cap → imatge:** 100 % local, per sota de 20 ms, sigui quina sigui la latència de xarxa.
- **La latència de xarxa només afecta la interacció** (prémer un botó i que el món reaccioni). Aquest retard ja s'accepta avui al cloud gaming pla.
- **Mans, comandaments i interfície es dibuixen localment**, perquè el propi cos no tingui retard.

### Solució A: flux de Gaussian splats (l'opció final)

- La millor opció per a **molts fotogrames per segon, qualitat alta i pocs Mbps**. És 3D, amb 6 graus de llibertat complets renderitzats a les ulleres.
- **A-nativa** (integrada al motor del joc): el món estàtic es converteix en Gaussians per endavant i es desa a la memòria cau de les ulleres. A cada fotograma només s'envien els canvis: transformacions d'objectes i esquelets, efectes i canvis de llum. Això són ≈ 10–40 Mbps.
- **A-genèrica** (per a jocs sense modificar): el servidor renderitza vistes RGB-D en 360° al voltant del jugador. Una xarxa neuronal *feed-forward* (tipus pixelSplat o MVSplat) les converteix en Gaussians a cada fotograma i només s'envien les diferències. Això són ≈ 50–200 Mbps.
- Les ulleres renderitzen els splats a 90–120 Hz i interpolen el moviment dels objectes. L'escenari llunyà es pot mostrar com un panorama de vídeo 360° per estalviar potència de càlcul.
- Reptes: reflexos i efectes que depenen del punt de vista, il·luminació dinàmica, límit de potència de la GPU de les ulleres, cost d'integració al motor i protecció dels recursos gràfics del joc.

### Solució B: vídeo 360° (implementable ja)

- El servidor renderitza cada fotograma com un **panorama 360° estèreo** (cub o equirectangular, estèreo ODS; opcionalment amb profunditat), a **30 fps estables i en alta resolució**. S'envia com a vídeo AV1/HEVC (NVENC, per *tiles*), igual que un vídeo 360° de YouTube.
- Les ulleres el projecten sobre una esfera, com qualsevol reproductor 360°. El gir del cap és instantani i el món s'actualitza a 30 fps, amb extrapolació per vectors de moviment perquè els objectes en moviment es vegin fluids.
- Cost: molt de processament al servidor (render 360° a 30 fps, unes 3–6 vegades una vista estèreo normal, reduïble amb DLSS i menys qualitat a l'esquena de l'usuari). També cal molta connexió: ≈ 200 Mbps – **1 Gbps**.
- Ideal per a jocs asseguts o de cabina (curses, simuladors de vol), que són justament els títols que ja mostra CloudXR (iRacing, X-Plane 12).

## Comparativa ràpida

| | Streaming actual | B: vídeo 360° | A: Gaussians |
|---|---|---|---|
| Latència del cap | Xarxa + reprojecció | **Local** | **Local** |
| Graus de llibertat | 6DoF amb defectes | 3DoF (3DoF+ amb profunditat) | **6DoF complet** |
| Ample de banda | ~100–200+ Mbps | ~200 Mbps – 1 Gbps | ~10–200 Mbps |
| Maduresa | En producció | **Tot existeix ja** | Recerca → producte |

## Full de ruta proposat

1. Mode vídeo 360° per a simuladors asseguts.
2. Afegir profunditat (3DoF+) i 60 fps.
3. Flux de Gaussians amb connectors per a Unreal i Unity, més un camí genèric, i un mode híbrid: Gaussians a prop i vídeo 360° lluny.

NVIDIA té tot el que cal: centres de dades de GeForce NOW, NVENC AV1, el client CloudXR per a Quest, Pico i Vision Pro, recerca en Gaussians (3DGRT, 3DGUT), DLSS i Reflex.

---

© 2026 Pol Barreiro Font, sota llicència [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/deed.ca).
