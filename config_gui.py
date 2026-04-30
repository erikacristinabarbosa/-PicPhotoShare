import wx
import json
import os
import subprocess
import sys

CONFIG_FILE = "config.json"

def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r') as f:
            return json.load(f)
    return {
        "general": {
            "download_path": os.path.join(os.path.expanduser("~"), "Downloads"),
            "language": "pt-br"
        },
        "ytdlp": {
            "cookies_from_browser": "chrome"
        }
    }

def save_config(config):
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f, indent=4)

class ConfigFrame(wx.Frame):
    def __init__(self):
        super().__init__(parent=None, title='Configurações - Video Downloader', size=(500, 450))
        self.config = load_config()
        self.panel = wx.Panel(self)
        self.sizer = wx.BoxSizer(wx.VERTICAL)

        # Header
        header = wx.StaticText(self.panel, label="Configurações do Sistema")
        header.SetFont(wx.Font(18, wx.FONTFAMILY_DEFAULT, wx.FONTSTYLE_NORMAL, wx.FONTWEIGHT_BOLD))
        self.sizer.Add(header, 0, wx.ALL | wx.CENTER, 20)

        # Download Path
        path_label = wx.StaticText(self.panel, label="Diretório de Downloads:")
        self.sizer.Add(path_label, 0, wx.LEFT | wx.RIGHT | wx.TOP, 10)
        
        self.path_ctrl = wx.TextCtrl(self.panel, value=self.config["general"]["download_path"])
        path_btn = wx.Button(self.panel, label="Alterar Pasta")
        path_btn.Bind(wx.EVT_BUTTON, self.on_change_path)
        
        path_sizer = wx.BoxSizer(wx.HORIZONTAL)
        path_sizer.Add(self.path_ctrl, 1, wx.EXPAND | wx.RIGHT, 5)
        path_sizer.Add(path_btn, 0)
        self.sizer.Add(path_sizer, 0, wx.EXPAND | wx.ALL, 10)

        # Browser Cookies
        browser_label = wx.StaticText(self.panel, label="Importar Cookies do Navegador:")
        self.sizer.Add(browser_label, 0, wx.LEFT | wx.RIGHT | wx.TOP, 10)
        
        self.browser_choice = wx.Choice(self.panel, choices=["chrome", "firefox", "edge", "safari", "opera"])
        self.browser_choice.SetStringSelection(self.config["ytdlp"]["cookies_from_browser"])
        self.sizer.Add(self.browser_choice, 0, wx.EXPAND | wx.ALL, 10)

        # Dependencies Status
        self.status_text = wx.StaticText(self.panel, label="Verificando dependências...")
        self.sizer.Add(self.status_text, 0, wx.ALL | wx.CENTER, 10)
        self.check_dependencies()

        # Action Buttons
        btn_sizer = wx.BoxSizer(wx.HORIZONTAL)
        
        save_btn = wx.Button(self.panel, label="Salvar e Iniciar Web UI")
        save_btn.SetBackgroundColour(wx.Colour(0, 150, 0))
        save_btn.SetForegroundColour(wx.WHITE)
        save_btn.Bind(wx.EVT_BUTTON, self.on_save)
        
        btn_sizer.Add(save_btn, 1, wx.EXPAND | wx.ALL, 5)
        self.sizer.Add(btn_sizer, 0, wx.EXPAND | wx.ALL, 20)

        self.panel.SetSizer(self.sizer)

    def on_change_path(self, event):
        with wx.DirDialog(self, "Selecione a pasta de downloads", self.path_ctrl.GetValue(), wx.DD_DEFAULT_STYLE | wx.DD_DIR_MUST_EXIST) as dirDialog:
            if dirDialog.ShowModal() == wx.ID_OK:
                self.path_ctrl.SetValue(dirDialog.GetPath())

    def check_dependencies(self):
        try:
            subprocess.run(["ffmpeg", "-version"], capture_output=True)
            ffmpeg_ok = True
        except:
            ffmpeg_ok = False
        
        if ffmpeg_ok:
            self.status_text.SetLabelText("FFmpeg: Instalado ✓")
            self.status_text.SetForegroundColour(wx.Colour(0, 128, 0))
        else:
            self.status_text.SetLabelText("AVISO: FFmpeg não encontrado! Algumas conversões podem falhar.")
            self.status_text.SetForegroundColour(wx.RED)

    def on_save(self, event):
        self.config["general"]["download_path"] = self.path_ctrl.GetValue()
        self.config["ytdlp"]["cookies_from_browser"] = self.browser_choice.GetStringSelection()
        save_config(self.config)
        
        wx.MessageBox("Configurações salvas! Iniciando o servidor...", "Sucesso")
        
        import webbrowser
        webbrowser.open("http://localhost:3000")
        self.Close()

if __name__ == "__main__":
    app = wx.App()
    frame = ConfigFrame()
    frame.Show()
    app.MainLoop()
