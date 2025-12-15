# -*- mode: python ; coding: utf-8 -*-

import sys
import os
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

block_cipher = None

# Collect all necessary data files
added_files = [
    ('src', 'src'),
    ('alembic', 'alembic'),
    ('alembic.ini', '.'),
    ('.env', '.'),
]

# Collect SQLAlchemy models and other submodules
hiddenimports = [
    'src.models.user',
    'src.models.inventory',
    'src.models.employee',
    'src.models.payment',
    'src.models.setup_config',
    'src.controllers.auth_controller',
    'src.controllers.inventory_controller',
    'src.controllers.employee_controller',
    'src.controllers.payment_controller',
    'src.controllers.dashboard_controller',
    'src.controllers.microsoft_controller',
    'src.controllers.setup_controller',
    'src.controllers.server_controller',
    'src.services.offline_service',
    'src.services.inventory_service',
    'src.services.employee_service',
    'src.services.payment_service',
    'src.services.dashboard_service',
    'src.services.microsoft_service',
    'fastapi',
    'uvicorn',
    'sqlalchemy',
    'alembic',
    'pydantic',
    'jwt',
    'bcrypt',
    'msal',
    'azure.identity',
    'email_validator',
    'PIL',
    'openpyxl',
    'reportlab',
    'python_dotenv',
    'schedule',
    'requests',
    'httpx',
    'aiofiles',
    'asyncio_mqtt',
    'aiohttp',
    'pystray',
    'plyer',
    'psutil',
]

a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=[],
    datas=added_files,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='PlanningBordServer',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # Set to False for production (no console window)
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon='..\\frontend\\assets\\icon.ico' if os.path.exists('..\\frontend\\assets\\icon.ico') else None,
)