# Daemony i widoczność systemu
Każdy agent ma osobny proces systemd, asynchroniczną obserwację 360 stopni i zapis rzeczywistych zdarzeń JSONL. Obecne źródła: widoczne procesy (/proc), pamięć (/proc/meminfo), modele Ollama (/api/tags). Inne wymiary raportują not_connected.
Docelowo wszystkie autoryzowane źródła telemetryczne: journal, procesy, sieć, dyski, kontenery, repozytoria, modele, agenci i zadania. Brak automatycznego dostępu do prywatnych danych i sekretów. Dla rozszerzonej obserwacji potrzebny osobny broker tylko-do-odczytu.
Po instalacji projektu i venv w /opt/ubuntu-ai uruchom: sudo bash ubuntu/install-daemons.sh; następnie włącz usługi zgodnie z komunikatem.
Status: kod zapisany, jeszcze nieprzetestowany na Ubuntu. Pełne role polimorficzne, asymetryczne limity, dynamiczne workery i pozostałe źródła do wdrożenia.
