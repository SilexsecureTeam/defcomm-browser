# Defcomm Browser

**Version:** 0.1.1  
**Release Date:** January 13, 2026  
**Release Notes:** Release v0.1.1

Defcomm Browser is a cross-platform desktop application built with the **Tauri** framework. This repository provides signed release artifacts and update metadata used by the Tauri auto-updater across supported operating systems.

---

## Supported Platforms

Defcomm Browser v0.1.1 is available on the following platforms:

### macOS

- **Apple Silicon (arm64)**  
  <https://github.com/SilexsecureTeam/defcomm-browser/releases/download/v0.1.1/defcomm-browser_aarch64.app.tar.gz>

- **Intel (x86_64)**  
  <https://github.com/SilexsecureTeam/defcomm-browser/releases/download/v0.1.1/defcomm-browser_x64.app.tar.gz>

---

### Linux

- **x86_64 AppImage**  
  <https://github.com/SilexsecureTeam/defcomm-browser/releases/download/v0.1.1/defcomm-browser_0.1.1_amd64.AppImage>

- **x86_64 Debian (.deb)**  
  <https://github.com/SilexsecureTeam/defcomm-browser/releases/download/v0.1.1/defcomm-browser_0.1.1_amd64.deb>

- **x86_64 RPM (.rpm)**  
  <https://github.com/SilexsecureTeam/defcomm-browser/releases/download/v0.1.1/defcomm-browser-0.1.1-1.x86_64.rpm>

---

### Windows

- **x86_64 MSI Installer**  
  <https://github.com/SilexsecureTeam/defcomm-browser/releases/download/v0.1.1/defcomm-browser_0.1.1_x64_en-US.msi>

- **x86_64 NSIS Installer (.exe)**  
  <https://github.com/SilexsecureTeam/defcomm-browser/releases/download/v0.1.1/defcomm-browser_0.1.1_x64-setup.exe>

---

All binaries are cryptographically signed and validated during installation or update.

---

## Auto-Update Compatibility

This release is fully compatible with the **Tauri v2 auto-updater**.

The update manifest contains:

- Version information
- Publication timestamp
- Platform-specific download URLs
- Tauri-generated cryptographic signatures

During an update, the application will:

1. Fetch the update manifest
2. Verify the signature
3. Download the correct binary for the platform
4. Apply the update securely

---

## Security & Integrity

- All release artifacts are signed using the official Tauri signing key
- Signature verification is mandatory and enforced before installation
- Tampered or unsigned binaries will be rejected automatically

---

## Release Page

Full release details and checksums are available here:  
<https://github.com/SilexsecureTeam/defcomm-browser/releases/tag/v0.1.1>
