# Input file structure

- Cipher: Blowfish, ECB mode, PKCS5 padding
- Key: the userId from the header (UTF-8 bytes)
- Process: base64-decode the file → parse JSON → base64-decode payload → Blowfish-decrypt with userId as key → resulting string is JSON
