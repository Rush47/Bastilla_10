import os
import sys
import json

# Ensure local package resolution works regardless of working directory
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from kernel.svl_kernel_core import SVLStudioKernel

def main():
    print("Inicjalizacja Nowego Systemu...")
    kernel = SVLStudioKernel(sciezka_pliku=os.path.join(current_dir, "kernel", "svl_kernel_core.py"))
    print(f"System operacyjny: {kernel.sys_version}")
    print(f"Tryb pracy: {kernel.mode}")
    print("Gotowy do pracy.")

if __name__ == "__main__":
    main()
