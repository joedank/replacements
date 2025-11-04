# GitHub Actions Workflows

This directory contains CI/CD workflows for automating builds and releases.

## Workflows

### `release.yml` - Multi-Platform Release Builder

Automatically builds and publishes installers for Windows, macOS, and Linux.

**Triggers:**
- **Git tags**: Push a version tag (e.g., `v0.1.0`, `v1.2.3`)
- **Manual**: Run from GitHub Actions tab

**Platforms Built:**
- ✅ Windows x64 (NSIS installer)
- ✅ macOS ARM64 (Apple Silicon DMG)
- ✅ macOS x64 (Intel DMG)
- ✅ Linux x64 (DEB + AppImage)

---

## How to Create a Release

### Method 1: Using Git Tags (Recommended)

```bash
# 1. Update version in Cargo.toml and package.json
# 2. Commit your changes
git add .
git commit -m "chore: bump version to 0.2.0"

# 3. Create and push a version tag
git tag v0.2.0
git push origin v0.2.0

# 4. GitHub Actions will automatically:
#    - Build for all platforms
#    - Create a draft release
#    - Upload installers as release assets
```

### Method 2: Manual Trigger

1. Go to GitHub → Actions tab
2. Select "Release" workflow
3. Click "Run workflow"
4. Choose branch and click "Run workflow"

---

## Release Process

1. **Automatic Build**: Workflow runs on all platforms simultaneously
2. **Draft Release**: Creates a draft release with all installers
3. **Review**: Check the draft release in GitHub
4. **Publish**: Edit release notes and publish when ready

---

## Code Signing (Optional but Recommended)

Code signing removes "Unknown Publisher" warnings and is required for distribution.

### Windows Code Signing

1. **Obtain Certificate**: Purchase from DigiCert, Sectigo, or similar
2. **Add to GitHub Secrets**:
   ```
   WINDOWS_CERTIFICATE: <base64-encoded .pfx file>
   WINDOWS_CERTIFICATE_PASSWORD: <password>
   ```

3. **Uncomment in workflow**:
   ```yaml
   env:
     TAURI_PRIVATE_KEY: ${{ secrets.TAURI_PRIVATE_KEY }}
     TAURI_KEY_PASSWORD: ${{ secrets.TAURI_KEY_PASSWORD }}
   ```

### macOS Code Signing

1. **Requirements**:
   - Apple Developer account ($99/year)
   - Developer ID Application certificate
   - App-specific password

2. **Add to GitHub Secrets**:
   ```
   APPLE_CERTIFICATE: <base64-encoded .p12 file>
   APPLE_CERTIFICATE_PASSWORD: <password>
   APPLE_SIGNING_IDENTITY: <Developer ID Application: Your Name (TEAM_ID)>
   APPLE_ID: <your-apple-id@email.com>
   APPLE_PASSWORD: <app-specific-password>
   APPLE_TEAM_ID: <your-team-id>
   ```

3. **Uncomment in workflow**:
   ```yaml
   env:
     APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
     APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
     # ... other Apple secrets
   ```

### Linux Signing

Linux doesn't require code signing, but you can sign packages:
- DEB packages: Use `debsigs`
- AppImages: Use `appimagetool --sign`

---

## Secrets Setup

### How to Add Secrets to GitHub

1. Go to GitHub repo → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each secret with exact names from the workflow

### Required Secrets (for signing)

**For Windows:**
- `TAURI_PRIVATE_KEY`: Tauri updater private key
- `TAURI_KEY_PASSWORD`: Password for updater key

**For macOS:**
- `APPLE_CERTIFICATE`: Base64-encoded .p12 certificate
- `APPLE_CERTIFICATE_PASSWORD`: Certificate password
- `APPLE_SIGNING_IDENTITY`: Full signing identity string
- `APPLE_ID`: Apple ID email
- `APPLE_PASSWORD`: App-specific password
- `APPLE_TEAM_ID`: Apple Developer Team ID

---

## Troubleshooting

### Build Fails on Windows

**Issue**: Windows build fails with signing errors
**Solution**: Either add Windows signing secrets or remove signing configuration

### Build Fails on macOS

**Issue**: macOS notarization fails
**Solution**:
1. Ensure all Apple secrets are correctly set
2. Check Apple ID has 2FA enabled
3. Verify app-specific password is valid

### Build Fails on Linux

**Issue**: Missing dependencies
**Solution**: Dependencies are installed in workflow, but if errors occur, check Ubuntu version compatibility

### Release Not Created

**Issue**: Tag pushed but no release created
**Solution**:
1. Check Actions tab for errors
2. Ensure tag format matches `v*` (e.g., `v1.0.0`)
3. Verify workflow file is on the branch where tag was pushed

### Slow Builds

**Issue**: Builds take a long time
**Solution**:
- First build: 10-15 minutes (downloads dependencies)
- Subsequent builds: 5-8 minutes (uses cache)
- Rust cache helps significantly

---

## Workflow Customization

### Change Release Name Format

Edit `releaseName` in workflow:
```yaml
releaseName: 'My App v__VERSION__'
```

### Modify Release Notes

Edit `releaseBody` in workflow to customize the release description.

### Add More Platforms

To add ARM Linux or other platforms:
```yaml
- platform: 'ubuntu-22.04'
  args: '--target aarch64-unknown-linux-gnu'
  name: 'Linux-ARM64'
```

### Change Draft Behavior

To auto-publish releases:
```yaml
releaseDraft: false
prerelease: false
```

---

## Local Testing

Before pushing a tag, test locally:

```bash
# macOS
npm run tauri build

# Windows (from macOS)
npm run tauri build -- --runner cargo-xwin --target x86_64-pc-windows-msvc

# Linux (use Docker or VM)
docker run --rm -v $(pwd):/app -w /app node:20 npm run tauri build
```

---

## Cost Considerations

**GitHub Actions:**
- Public repos: Free unlimited minutes
- Private repos: 2,000 free minutes/month, then $0.008/minute

**Typical build times:**
- Windows: ~8 minutes
- macOS: ~10 minutes (per architecture)
- Linux: ~8 minutes
- **Total per release**: ~36 minutes

**Storage:**
- Artifacts stored for 90 days
- Release assets stored indefinitely
- ~100-200 MB per release (all platforms)

---

## Best Practices

1. **Test locally first**: Always test builds before creating releases
2. **Use semantic versioning**: Follow `vMAJOR.MINOR.PATCH` format
3. **Write changelogs**: Update CHANGELOG.md before each release
4. **Review draft releases**: Don't auto-publish until you've reviewed
5. **Sign your releases**: Code signing builds user trust
6. **Keep secrets secure**: Never commit secrets or certificates

---

## Resources

- [Tauri GitHub Actions Guide](https://tauri.app/v1/guides/building/github-actions)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Apple Developer Code Signing](https://developer.apple.com/support/code-signing/)
- [Microsoft Code Signing](https://learn.microsoft.com/en-us/windows/win32/seccrypto/cryptography-tools)

---

## Support

For issues with the workflow:
1. Check the Actions tab for detailed logs
2. Review this README for common issues
3. Consult Tauri documentation
4. Open an issue in the repository
