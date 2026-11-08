import sqlite3

import config


def connexion():
    return sqlite3.connect(config.DB_PATH)
