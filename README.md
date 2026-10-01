# STENDINO

PWA essenziale per tenere traccia dei due stendini di casa. Non usa framework, servizi esterni o compilazione.

## File

- `index.html`: schermata principale e impostazioni.
- `styles.css`: layout responsive e colori di stato.
- `app.js`: operazioni, conteggio dei giorni e persistenza in `localStorage`.
- `manifest.webmanifest`: configurazione di installazione PWA.
- `service-worker.js`: cache offline delle risorse locali e aggiornamento della cache.
- `icons/icon.svg`: icona vettoriale dell'app.

## Avvio locale

Aprire un terminale nella cartella del progetto ed eseguire:

```sh
python -m http.server 8000
```

Visitare `http://localhost:8000`. Il service worker richiede HTTPS oppure `localhost`; non funziona aprendo `index.html` direttamente come file.

## Pubblicazione su GitHub Pages

Caricare i file nella repository e in **Settings → Pages** selezionare il branch e la cartella che li contiene (ad esempio `/ (root)`). Manifest, script e fogli di stile usano percorsi relativi per funzionare anche se il sito è pubblicato in una sottocartella. GitHub Pages fornisce HTTPS, necessario per il service worker.

## Verifica offline

Aprire il sito online una prima volta e attendere che il service worker termini l'installazione. Poi attivare la modalità aereo (o bloccare la rete) e ricaricare la pagina: la schermata e le operazioni locali devono restare disponibili. I dati rimangono nel `localStorage` dello stesso browser/dispositivo; gli aggiornamenti dell'app non lo cancellano.

## Controlli funzionali

Verificare da browser: avvio con entrambi liberi; occupazione e ritiro indipendenti; persistenza dopo ricaricamento; soglia minima a un giorno e aggiornamento immediato del colore; conteggio ogni 24 ore complete. Per il controllo dei confini esatti (24/48 ore), impostare `takenAt` nel `localStorage` agli istanti desiderati tramite gli strumenti di sviluppo. Su iPhone controllare manualmente aggiunta alla schermata Home, safe area, uso offline e aggiornamento dell'app.
