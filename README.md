# STENDINO

STENDINO è una piccola Progressive Web App per gestire due stendini, **VECCHIO** e **NUOVO**. Registra quando vengono messi all’aperto e segnala quando hanno raggiunto la soglia di ritiro impostata. Stato e preferenze sono salvati localmente nel browser; non sono richiesti account o servizi esterni.

## Struttura

- `index.html`: schermata principale e impostazioni.
- `styles.css`: stile e layout responsive.
- `app.js`: interazioni, conteggio del tempo e salvataggio locale.
- `manifest.webmanifest`: nome, icona e modalità di installazione.
- `service-worker.js`: aggiornamento e cache delle risorse per l’uso offline.
- `icons/`: icona dell’app.

## Esecuzione in locale

È necessario servirla tramite HTTP: aprire `index.html` direttamente dal file system non attiva il Service Worker.

Con Python installato, dalla cartella del progetto eseguire:

```sh
python -m http.server 8000
```

Aprire quindi <http://localhost:8000> nel browser.

## Pubblicazione su GitHub Pages

Caricare i file nella repository. In **Settings → Pages**, scegliere la sorgente di pubblicazione (branch e cartella, ad esempio `main` e `/ (root)`) e salvare. GitHub Pages pubblica il sito tramite HTTPS, necessario per il Service Worker. I percorsi relativi consentono di pubblicare l’app anche da una sottocartella.

## Installazione e uso offline

Aprire l’app pubblicata almeno una volta con una connessione attiva per caricare e memorizzare le risorse. In seguito sarà disponibile anche offline. Per verificarlo, scollegare temporaneamente il dispositivo dalla rete e ricaricare la pagina. Su iPhone, aprire il sito in Safari e usare **Condividi → Aggiungi alla schermata Home** per installarlo.

I dati restano nel browser e nel dispositivo in cui vengono inseriti; non sono sincronizzati tra dispositivi. La soglia predefinita è di due giorni e può essere modificata nelle impostazioni.
