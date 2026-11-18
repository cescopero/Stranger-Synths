# Stranger Synths

Sistema per l'esecuzione musicale con i gesti della mano. La camera (Mac o telefono) è letta da **MediaPipe** in una pagina web; i dati arrivano a **Max/MSP** via **OSC/UDP** e controllano la sintesi concatenativa con **MuBu** (`mc.mubu.concat~`) e la spazializzazione con **Spat5**.

```
camera → MediaPipe (browser) → HTTPS POST /osc-forward → https-server.js (Node) → UDP 7400 → [udpreceive 7400] → mapping → MuBu → audio
```

Questa cartella è un progetto Max (`Stranger_Synths.maxproj`).

## Struttura

| Cartella | Contenuto |
|---|---|
| `patchers/` | `Stranger_Synths.maxpat` (patch principale), `SS_mapping.maxpat` (ricezione OSC, mapping, soglia e hold dei gesti) |
| `code/` | `https-server.js` (server HTTPS e inoltro OSC/UDP), `mediapipe-osc.html` (pagina con MediaPipe), versione di riserva con classificatore geometrico |
| `data/` | `Stranger_Synths.json` (preset `pattrstorage`) |
| `media/` | `chiesa.WAV` (audio del corpus), icone dei sei gesti (Twemoji, CC-BY 4.0, vedi `LICENZA_emoji.txt`) |
| `docs/` | Schemi dei landmark MediaPipe, esempi di gesti ripresi dalla camera, logo |


## Requisiti
- Max 9.1.5 (versione con cui sono salvate le patch)
- Package IRCAM **MuBu for Max** (`mubu`, `mubu.track`, `mc.mubu.concat~`, `camu.*`) e **Spat5** (`spat5.*`)
- Node.js (nessun pacchetto npm: il server usa solo moduli standard)
- mkcert, per i certificati HTTPS locali
- Internet alla prima accensione: MediaPipe (WASM e modello) è caricato da CDN

## Avvio
1. Genera i certificati (una volta sola) dentro `code/`:
   ```bash
   brew install mkcert
   mkcert -install
   ipconfig getifaddr en0                 # IP del Mac, es. 192.168.1.42
   cd code
   mkcert -key-file key.pem -cert-file cert.pem localhost 127.0.0.1 192.168.1.42
   ```
   `key.pem` e `cert.pem` non vanno pubblicati (sono nel `.gitignore`). Se l'IP del Mac cambia, rigenerali.
2. Avvia il server: `cd code && node https-server.js`
3. Apri `https://localhost:5500/` sul Mac, oppure `https://<IP_DEL_MAC>:5500/` dal telefono (stessa rete Wi-Fi, con **https**). Se il telefono mostra un avviso sul certificato, procedi comunque.
4. In Max apri `patchers/Stranger_Synths.maxpat`. La ricezione è `[udpreceive 7400]`.
5. Per fermare il server: Ctrl+C.

Il server serve i file della cartella in cui si trova: `mediapipe-osc.html` deve stare accanto a `https-server.js`.

## Messaggi OSC (float)
| Indirizzo | Valore |
|---|---|
| `/hand/<landmark>/x` e `/y` | coordinate normalizzate 0–1; landmark: wrist, thumb_tip, index_tip, middle_tip, ring_tip, pinky_tip |
| `/gesture/<nome>` | 1.0 a ogni frame in cui il gesto è riconosciuto; 0.0 quando finisce |
| `/gesture/<nome>/score` | confidenza 0–1, inviata subito prima del gesto |

Gesti (MediaPipe GestureRecognizer): Thumb_Up, Thumb_Down, Closed_Fist, Open_Palm, Pointing_Up, Victory. I landmark arrivano dalla mano con etichetta "Left", i gesti dalla "Right". Nella pagina si attivano e disattivano separatamente (CAMERA, MANO SX, MANO DX).

La descrizione completa del codice della pagina è nel commento all'inizio dello script di `code/mediapipe-osc.html`.

## Licenza
Da definire.
