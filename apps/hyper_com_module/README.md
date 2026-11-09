# HyperCom

HyperCom is a local transmission console with an SQLite-backed message log.
Open the app preview in Studio to view messages, add a test inbound message,
reply to an inbound message, or queue a global broadcast.

This workspace has no Astra_1 connection or global transmission gateway.
Inbound messages added in the panel are explicitly test messages; replies and
broadcasts are saved as queued records and are not sent outside this app.

The same message log can be managed from the command line:

```sh
python3 apps/hyper_com_module/transmitter.py list
python3 apps/hyper_com_module/transmitter.py receive --sender Astra_1 --content "Testowa wiadomość"
python3 apps/hyper_com_module/transmitter.py reply --reply-to 1 --content "Odpowiedź lokalna"
python3 apps/hyper_com_module/transmitter.py broadcast --content "Wiadomość do kolejki lokalnej"
```

By default, the database is `data/databases/hyper_com_db.sqlite`. Set
`HYPER_COM_DB_PATH` to use a different SQLite file for isolated testing.
