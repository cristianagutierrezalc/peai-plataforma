#!/usr/bin/env python3
"""Genera una SECRET_KEY segura para JWT."""
import secrets
import sys

def generate_secret(length=32):
    """Genera una clave hexadecimal segura."""
    return secrets.token_hex(length)

if __name__ == "__main__":
    length = int(sys.argv[1]) if len(sys.argv) > 1 else 32
    key = generate_secret(length)
    print(f"SECRET_KEY={key}")
    print(f"\n# Copia esta línea a tu .env o variables de entorno en Render:")
    print(f"SECRET_KEY={key}")