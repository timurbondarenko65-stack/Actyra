from flask import Flask, render_template, request, jsonify
import os
import smtplib
import ssl
from email.message import EmailMessage

app = Flask(__name__)

# Configurazione invio email. Nessuna credenziale sta nel codice: si impostano
# come variabili d'ambiente su Railway (Variables). Se mancano, il form non
# finge di aver inviato: mostra un errore onesto e registra il messaggio nei log.
MAIL_TO = os.environ.get("MAIL_TO", "info@actyra.it")
SMTP_HOST = os.environ.get("SMTP_HOST")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER")
SMTP_PASS = os.environ.get("SMTP_PASS")


def _intestazione_sicura(valore):
    """Toglie gli a capo: impedisce l'iniezione di intestazioni nell'email."""
    return " ".join(str(valore).split())


def invia_messaggio_contatto(nome, email, azienda, messaggio):
    if not (SMTP_HOST and SMTP_USER and SMTP_PASS):
        raise RuntimeError("SMTP non configurato (mancano SMTP_HOST/SMTP_USER/SMTP_PASS)")

    msg = EmailMessage()
    msg["Subject"] = _intestazione_sicura(f"Sito Actyra — messaggio da {nome}")
    msg["From"] = SMTP_USER
    msg["To"] = MAIL_TO
    if email:
        # Cosi' basta premere "Rispondi" per scrivere direttamente al cliente.
        msg["Reply-To"] = _intestazione_sicura(email)

    msg.set_content(
        f"Nome:     {nome}\n"
        f"Email:    {email}\n"
        f"Azienda:  {azienda or '—'}\n"
        f"\n{messaggio}\n"
    )

    contesto = ssl.create_default_context()
    if SMTP_PORT == 465:
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=contesto, timeout=20) as s:
            s.login(SMTP_USER, SMTP_PASS)
            s.send_message(msg)
    else:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as s:
            s.starttls(context=contesto)
            s.login(SMTP_USER, SMTP_PASS)
            s.send_message(msg)


@app.route("/")
def index():
    return render_template("index.html", active="home")


@app.route("/playground")
def playground():
    return render_template("playground.html", active="playground")


@app.route("/portfolio")
def portfolio():
    return render_template("portfolio.html", active="portfolio")


@app.route("/sfida")
def sfida():
    return render_template("sfida.html", active="sfida")


@app.route("/about")
def about():
    return render_template("about.html", active="about")


@app.route("/contact", methods=["GET", "POST"])
def contact():
    sent = False
    errore = False
    if request.method == "POST":
        nome = request.form.get("nome", "").strip()
        email = request.form.get("email", "").strip()
        azienda = request.form.get("azienda", "").strip()
        messaggio = request.form.get("messaggio", "").strip()
        try:
            invia_messaggio_contatto(nome, email, azienda, messaggio)
            sent = True
        except Exception:
            # Il messaggio non va perso: resta nei log di Railway anche se
            # l'invio fallisce, cosi' si puo' recuperare e rispondere a mano.
            app.logger.exception(
                "INVIO CONTATTO FALLITO — nome=%r email=%r azienda=%r messaggio=%r",
                nome, email, azienda, messaggio,
            )
            errore = True
    return render_template("contact.html", active="contact", sent=sent, errore=errore)


@app.errorhandler(404)
def not_found(e):
    return render_template("404.html", active=None), 404


@app.after_request
def no_html_cache(response):
    """Le pagine HTML non vanno mai messe in cache dal browser: dopo un deploy
    si continuerebbe a vedere la versione vecchia. I file in /static restano
    cacheabili perche' sono versionati con ?v= nel template."""
    if response.mimetype == "text/html":
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
