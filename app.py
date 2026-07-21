from flask import Flask, render_template, request, jsonify
import os

app = Flask(__name__)


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
    if request.method == "POST":
        # Placeholder: qui va integrato un servizio email (es. Resend, Postmark, o SMTP).
        # Per ora il form conferma solo la ricezione lato client.
        sent = True
    return render_template("contact.html", active="contact", sent=sent)


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
