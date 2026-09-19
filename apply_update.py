"""Apply the Preri model-card and activation fix to an existing VAELO source tree."""
import json
import shutil
import sys
from datetime import datetime
from pathlib import Path


def main():
    root = Path(sys.argv[1] if len(sys.argv) > 1 else '.').expanduser().resolve()
    extension = root / 'extensions' / 'vaelo-assistant'
    manifest = extension / 'package.json'
    if not manifest.is_file() or not (root / 'scripts' / 'vaelo.cjs').is_file():
        raise SystemExit('Run this from your vaelo-vscode folder, or pass that folder as the argument.')
    package = json.loads(manifest.read_text(encoding='utf-8'))
    if package.get('name') != 'vaelo-assistant' or package.get('version') not in ('0.6.0', '0.6.1'):
        raise SystemExit('This update supports Preri 0.6.0 / 0.6.1 only. No files changed.')
    payload = Path(__file__).resolve().parent / 'payload'
    files = ['local-models.js', 'extension.js', 'media/chat.js']
    for name in files:
        if not (payload / name).is_file() or not (extension / name).is_file():
            raise SystemExit('Missing required file: ' + name + '. Extract the entire update ZIP first.')
    backup = root / 'vaelo' / ('preri-backup-' + datetime.now().strftime('%Y%m%d-%H%M%S-%f'))
    backup.mkdir(parents=True, exist_ok=False)
    for name in files + ['package.json']:
        destination = backup / name
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(extension / name, destination)
    try:
        for name in files:
            shutil.copy2(payload / name, extension / name)
        # Preserve the user's existing icon path and other manifest settings.
        package['version'] = '0.6.1'
        manifest.write_text(json.dumps(package, indent='\t', ensure_ascii=False) + '\n', encoding='utf-8')
    except Exception:
        for name in files + ['package.json']:
            shutil.copy2(backup / name, extension / name)
        raise
    print('Preri updated: preset download cards removed; deleted-model activation fixed.')
    print('Existing icons, marketplace settings, AI connections and model weights are preserved.')
    print('Backup:', backup)
    print('Quit VAELO completely, then run:')
    print('fnm exec --using=24.18.0 node scripts/vaelo.cjs run')


if __name__ == '__main__':
    main()
