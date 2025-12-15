!include "MUI2.nsh"

; Installer Information
Name "The Planning Bord Business Management Software"
OutFile "The Planning Bord Setup.exe"
InstallDir "$PROGRAMFILES\The Planning Bord"
InstallDirRegKey HKLM "Software\The Planning Bord" "Install_Dir"
RequestExecutionLevel admin

; Interface Settings
!define MUI_ABORTWARNING
!define MUI_ICON "assets\icon.ico"
!define MUI_UNICON "assets\icon.ico"
!define MUI_WELCOMEFINISHPAGE_BITMAP "assets\installer.bmp"

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_WELCOME
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

; Languages
!insertmacro MUI_LANGUAGE "English"

; Installer Sections
Section "Main Application" SecMain
    SetOutPath "$INSTDIR"
    
    ; Create directories
    CreateDirectory "$INSTDIR\logs"
    CreateDirectory "$INSTDIR\data"
    CreateDirectory "$INSTDIR\backups"
    
    ; Copy files
    File /r "win-unpacked\*.*"
    
    ; Create uninstaller
    WriteUninstaller "$INSTDIR\Uninstall.exe"
    
    ; Registry entries
    WriteRegStr HKLM "Software\The Planning Bord" "Install_Dir" "$INSTDIR"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\The Planning Bord" "DisplayName" "The Planning Bord Business Management Software"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\The Planning Bord" "UninstallString" "$INSTDIR\Uninstall.exe"
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\The Planning Bord" "NoModify" 1
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\The Planning Bord" "NoRepair" 1
    
    ; Create shortcuts
    CreateDirectory "$SMPROGRAMS\The Planning Bord"
    CreateShortcut "$SMPROGRAMS\The Planning Bord\The Planning Bord.lnk" "$INSTDIR\The Planning Bord.exe" "" "" "" "" "" "Business Management Software"
    CreateShortcut "$SMPROGRAMS\The Planning Bord\Uninstall.lnk" "$INSTDIR\Uninstall.exe" "" "" "" "" "" "Uninstall The Planning Bord"
    CreateShortcut "$DESKTOP\The Planning Bord.lnk" "$INSTDIR\The Planning Bord.exe" "" "" "" "" "" "Business Management Software"
    
SectionEnd

; Uninstaller Section
Section "Uninstall"
    ; Remove registry entries
    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\The Planning Bord"
    DeleteRegKey HKLM "Software\The Planning Bord"
    
    ; Remove shortcuts
    Delete "$SMPROGRAMS\The Planning Bord\Uninstall.lnk"
    Delete "$SMPROGRAMS\The Planning Bord\The Planning Bord.lnk"
    RMDir "$SMPROGRAMS\The Planning Bord"
    Delete "$DESKTOP\The Planning Bord.lnk"
    
    ; Remove files and directories
    RMDir /r "$INSTDIR"
    
SectionEnd

; Functions
Function .onInit
    ; Check if application is already running
    System::Call 'kernel32::CreateMutexA(i 0, i 0, t "ThePlanningBordMutex") i .r1 ?e'
    Pop $R0
    StrCmp $R0 0 +3
    MessageBox MB_OK|MB_ICONEXCLAMATION "The installer is already running."
    Abort
    
    ; Check Windows version
    ${If} ${AtLeastWin7}
    ${Else}
        MessageBox MB_OK|MB_ICONEXCLAMATION "This application requires Windows 7 or later."
        Abort
    ${EndIf}
    
FunctionEnd

Function un.onInit
    MessageBox MB_ICONQUESTION|MB_YESNO|MB_DEFBUTTON2 "Are you sure you want to completely remove $(^Name) and all of its components?" IDYES +2
    Abort
FunctionEnd