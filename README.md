# Actyra — sito

Sito ufficiale di Actyra, studio di automazione su misura per PMI del Nordest.
Flask + JavaScript vanilla. Nessuna build step, nessun bundler, nessun framework front-end.

## Struttura

```
mysite/
├── app.py                    Flask app (5 rotte + 404)
├── Procfile                  gunicorn per Railway
├── requirements.txt          Flask + gunicorn
├── static/
│   ├── style.css             Design system completo
│   ├── main.js               Nav mobile + reveal on scroll
│   └── inspector.js          Demo ispezione qualità con rete neurale
└── templates/
    ├── base.html             Layout con header/footer/font
    ├── index.html            Home: hero, stats mercato, tre livelli, perché Actyra, CTA
    ├── playground.html       Tecnologie: script, reti neurali (con demo), agenti LLM
    ├── portfolio.html        Progetti costruiti
    ├── about.html            Il progetto (mercato, differenziazione, come lavoriamo)
    ├── contact.html          Form contatto
    └── 404.html
```

## Deploy su Railway

1. Sostituisci i file nella cartella del progetto in locale.
2. Commit + push su GitHub (Railway pesca da lì).
3. Railway rileva `Procfile` da solo. Assicurati che nelle variabili d'ambiente ci sia `PORT` (Railway lo mette in automatico).

## Test in locale

```bash
pip install -r requirements.txt
python app.py
# Poi apri http://localhost:5000
```

## Note tecniche importanti

### La demo di ispezione qualità (`inspector.js`)

Una linea di controllo qualità simulata: componenti di occhialeria (lenti, aste,
frontali, disegnati in SVG) scorrono su un nastro animato via requestAnimationFrame;
uno "scanner" li classifica uno a uno. Tre livelli di addestramento selezionabili
(100 / 10.000 / 1.000.000 esempi) con accuratezza crescente (62% / 90% / 99,5%):
la dimostrazione visiva del principio "più esempi vede, meno sbaglia".

I contatori (ispezionati, difetti rilevati, errori, precisione) sono conteggi reali
della sessione. Il loop si mette in pausa quando il tab non è visibile, e con
`prefers-reduced-motion` mostra un singolo pezzo statico già classificato.

### Cosa manca ancora

1. **Backend email del form contatto**: `app.py` accetta il POST ma non invia niente.
   Da collegare con Resend, Postmark, o SMTP di un provider (es. Zoho, Fastmail).
2. **Dominio actyra.it**: non verificato disponibile. Se occupato, sostituire l'indirizzo
   email in `base.html` (footer) e `contact.html`.
3. **Favicon e Open Graph image**: aggiungere quando ci sarà un logo definitivo.
4. **Analytics**: nessuno per ora. Se serve, Plausible o Umami — privacy-friendly,
   niente cookie banner.

### Accessibilità

- Colori con contrasto AA su tutti i testi principali.
- `aria-label` sulla nav; la demo è decorativa (`aria-hidden` sugli SVG).
- Focus states nativi mantenuti.
- `prefers-reduced-motion` rispettato — animazioni disattivate per chi le vuole spente.
