# Copyright 2024 Therp BV <https://therp.nl>.
# License LGPL-3.0 or later (http://www.gnu.org/licenses/lgpl).

{
    "name": "Web No datepicker",
    "version": "16.0.1.0.0",
    "author": "Therp BV, " "Odoo Community Association (OCA)",
    "website": "https://github.com/OCA/web",
    "license": "AGPL-3",
    "category": "Web",
    "summary": "Remove the datepicker from date and datetime fields",
    "depends": ["web"],
    "installable": True,
    "application": False,
    "assets": {
        "web.assets_backend": [
            "web_no_datepicker/static/src/css/web_no_datepicker.scss"
        ],
        "web.assets_frontend": [
            "web_no_datepicker/static/src/css/web_no_datepicker.scss"
        ],
    },
}
