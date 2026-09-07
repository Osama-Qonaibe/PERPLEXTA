import { secureStorage } from "@/lib/storage";
import React, { useState, useEffect, useCallback } from "react";
import { useAppContext } from "../../context/AppContext";
import { useConfirm } from "../../context/ConfirmContext";
import { motion, AnimatePresence } from "motion/react";
import { getAuthHeaders, getTimeAgo } from "../../utils/adminUtils";
import { AdminService } from "../../services/adminService";
import {
  Settings2,
  FileText,
  ShieldCheck,
  Download,
  ArrowRight,
  ArrowLeft,
  Mail,
  Send,
  Save,
  RefreshCw,
  Search,
  CheckCircle,
  AlertTriangle,
  Info,
  Sliders,
  DollarSign,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock,
  Shield,
  Key,
  Database,
  Users,
  Settings,
  Plus,
  Zap,
  Server,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  Coins,
  Wrench,
  LayoutGrid,
  Scale,
  Megaphone,
  ImageIcon,
  Video,
  Mic,
  Volume2,
  GraduationCap,
  Code2,
  Music,
  Trash2,
  X,
} from "lucide-react";
import { SmartEmailHubViewProps } from "./adminTypes";

export 
const SmartEmailHubView = ({
  theme,
  t,
  dir,
  showToast,
}: {
  theme: string;
  t: (key: string, replacements?: any) => string;
  dir: string;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}) => {
  const [activeTab, setActiveTab] = useState<"settings" | "templates">(
    "settings",
  );
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const confirm = useConfirm();
  const { token, language, siteSettings, setIsOperationPending } = useAppContext();

  const [settings, setSettings] = useState<any>({
    mailer_type: "smtp",
    smtp_host: "",
    smtp_port: "",
    smtp_encryption: "tls",
    smtp_username: "",
    smtp_password: "",
    sender_name: "",
    sender_email: "",
    status: "active",
    last_verified_at: null,
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [isImportingDefaults, setIsImportingDefaults] = useState(false);

  useEffect(() => {
    setIsOperationPending(
      isSavingSettings ||
        isSavingTemplate ||
        isTestingConnection ||
        isImportingDefaults,
    );
  }, [
    isSavingSettings,
    isSavingTemplate,
    isTestingConnection,
    isImportingDefaults,
    setIsOperationPending,
  ]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/mail-services-v3/config", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        } else {
          console.error("Failed to fetch settings: ", res.status);
          const text = await res.text();
          if (text.includes("<html>")) {
            showToast(
              "WAF/Firewall blocked the request (403 HTML received)",
              "error",
            );
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to fetch email settings:", error);
        }
      }
    };
    if (token) fetchSettings();
  }, [token, showToast]);

  const fetchTemplates = useCallback(async () => {
    setIsLoadingTemplates(true);
    try {
      const res = await fetch("/api/mail-services-v3/templates", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to fetch email templates:", error);
      }
    } finally {
      setIsLoadingTemplates(false);
    }
  }, [token]);

  const handleImportDefaults = async () => {
    const isConfirmed = await confirm({
      title: dir === "rtl" ? "استيراد القوالب الافتراضية" : "Import Default Templates",
      description: dir === "rtl"
        ? "هل أنت متأكد من جلب القوالب الافتراضية؟ سيتم تحديث القوالب الموجودة."
        : "Are you sure you want to fetch default templates? Existing system templates will be updated.",
      variant: "warning"
    });
    if (!isConfirmed) return;

    setIsImportingDefaults(true);
    try {
      const res = await fetch("/api/mail-services-v3/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        showToast(
          dir === "rtl"
            ? "تم جلب القوالب بنجاح"
            : "Templates imported successfully",
          "success",
        );
        setTimeout(() => {
          fetchTemplates();
        }, 500);
      } else {
        const errorData = await res
          .json()
          .catch(() => ({ error: "Security Filter Intervention" }));
        showToast(
          (dir === "rtl" ? "فشل جلب القوالب: " : "Failed: ") +
            (errorData.error || "Unknown error"),
          "error",
        );
      }
    } catch (error: any) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to import templates:", error);
      }
      showToast(error.message || "Error", "error");
    } finally {
      setIsImportingDefaults(false);
    }
  };

  useEffect(() => {
    if (activeTab === "templates") {
      fetchTemplates();
    }
  }, [activeTab, fetchTemplates]);

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const res = await fetch("/api/mail-services-v3/config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        showToast(
          dir === "rtl"
            ? "تم حفظ الإعدادات بنجاح"
            : "Settings saved successfully!",
          "success",
        );
      } else {
        const text = await res.text();
        if (text.includes("<html>")) {
          showToast("Blocked by Firewall (403 HTML)", "error");
        } else {
          showToast(
            dir === "rtl" ? "فشل حفظ الإعدادات" : "Failed to save settings",
            "error"
          );
        }
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      showToast("Network/Security Error", "error");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    try {
      const token = secureStorage.getSync("app_token");
      const res = await fetch("/api/mail-services-v3/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        showToast("Security filter blocked the response body.", "error");
        setIsTestingConnection(false);
        return;
      }

      if (res.ok) {
        showToast(
          dir === "rtl"
            ? "تم التحقق من الاتصال بنجاح!"
            : "Connection verified successfully!",
          "success",
        );
        // Refresh settings
        const refreshRes = await fetch("/api/mail-services-v3/config", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (refreshRes.ok) {
          const freshData = await refreshRes.json();
          setSettings(freshData);
        }
      } else {
        showToast(data.error || "Connection Failed", "error");
      }
    } catch (error: any) {
      console.error("Failed to test connection:", error);
      showToast(error.message || "Error", "error");
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;

    // Client-side validation
    const missingFields = [];
    if (!selectedTemplate.name?.trim())
      missingFields.push(dir === "rtl" ? "اسم القالب" : "Template Name");
    if (!selectedTemplate.subject_en?.trim())
      missingFields.push(dir === "rtl" ? "الموضوع (EN)" : "Subject (EN)");
    if (!selectedTemplate.subject_ar?.trim())
      missingFields.push(dir === "rtl" ? "الموضوع (AR)" : "Subject (AR)");
    if (!selectedTemplate.body_en?.trim())
      missingFields.push(dir === "rtl" ? "المحتوى (EN)" : "Body (EN)");
    if (!selectedTemplate.body_ar?.trim())
      missingFields.push(dir === "rtl" ? "المحتوى (AR)" : "Body (AR)");

    if (missingFields.length > 0) {
      showToast(
        dir === "rtl"
          ? `يرجى ملء الحقول التالية: ${missingFields.join("، ")}`
          : `Required: ${missingFields.join(", ")}`,
        "error"
      );
      return;
    }

    setIsSavingTemplate(true);
    try {
      const token = secureStorage.getSync("app_token");
      const res = await fetch("/api/mail-services-v3/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(selectedTemplate),
      });
      if (res.ok) {
        await fetchTemplates();
        setSelectedTemplate(null);
        showToast(
          dir === "rtl" ? "تم حفظ القالب بنجاح" : "Template saved successfully",
          "success"
        );
      } else {
        const errorData = await res.json().catch(() => ({ error: "Blocked" }));
        showToast(errorData.error || "Failed to save", "error");
      }
    } catch (error) {
      showToast("Connection Error", "error");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    const isConfirmed = await confirm({ title: "Delete Template", description: "Are you sure you want to delete this template?", variant: "danger" as const });
    if (!isConfirmed) return;
    try {
      const token = secureStorage.getSync("app_token");
      const res = await fetch(`/api/mail-services-v3/templates/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast("Template deleted", "success");
        await fetchTemplates();
      }
    } catch (error) {
      showToast("Error", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-[var(--border-main)] dark:border-[var(--border-main)] pb-4">
        <button
          onClick={() => setActiveTab("settings")}
          className={`px-6 py-2.5 rounded-[var(--radius)] font-medium transition-theme flex items-center gap-2 ${
            activeTab === "settings"
              ? "bg-accent/10 text-accent "
              : "text-gray-500 hover:bg-[var(--bg-input)] dark:hover:bg-[var(--bg-secondary)]/50"
          }`}
        >
          <Settings2 size={18} />
          {t("emailSettings")}
        </button>
        <button
          onClick={() => {
            setActiveTab("templates");
            setSelectedTemplate(null);
          }}
          className={`px-6 py-2.5 rounded-[var(--radius)] font-medium transition-theme flex items-center gap-2 ${
            activeTab === "templates"
              ? "bg-accent/10 text-accent "
              : "text-gray-500 hover:bg-[var(--bg-input)] dark:hover:bg-[var(--bg-secondary)]/50"
          }`}
        >
          <FileText size={18} />
          {t("emailTemplates")}
        </button>
      </div>

      <div className="mt-6">
        {activeTab === "settings" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div
              className={`p-6 md:p-8 rounded-[var(--radius)] border ${theme === "dark" ? "bg-[#111111] border-[var(--border-main)]" : "bg-[var(--bg-secondary)] border-[var(--border-main)]"}`}
            >
              <div className="flex items-center justify-between gap-3 mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-[var(--radius)] bg-accent/10 text-accent">
                    <Server size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{t("smtpSettings")}</h2>
                    <p className="text-sm text-gray-500">{t("smtpDesc")}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span
                    className={`px-3 py-1 rounded-[var(--radius)] text-xs font-bold flex items-center gap-1.5 ${
                      settings.status === "active"
                        ? "bg-accent/10 text-accent border border-accent/30"
                        : "bg-amber-500/10 text-amber-500 border border-amber-500/30"
                    }`}
                  >
                    {settings.status === "active" ? (
                      <>
                        <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                        {dir === "rtl"
                          ? "نشط / تم التحقق"
                          : "Active / Verified"}
                      </>
                    ) : (
                      <>
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        {dir === "rtl" ? "يحتاج تحقق" : "Needs Verification"}
                      </>
                    )}
                  </span>
                  {settings.last_verified_at && (
                    <span className="text-[10px] text-gray-500 font-mono">
                      {dir === "rtl" ? "آخر تحقق: " : "Last verified: "}
                      {new Date(settings.last_verified_at).toLocaleString(
                        language === "ar" ? "ar-EG" : "en-US",
                      )}
                    </span>
                  )}
                </div>
              </div>

              <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {t("mailerType")}
                  </label>
                  <select
                    value={settings.mailer_type || "smtp"}
                    onChange={(e) =>
                      setSettings({ ...settings, mailer_type: e.target.value })
                    }
                    className={`w-full px-4 py-3 rounded-[var(--radius)] border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
                  >
                    <option value="smtp">{t("smtp")}</option>
                    <option value="php">{t("phpMail")}</option>
                  </select>
                </div>

                {settings.mailer_type === "smtp" && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          {t("smtpHost")}
                        </label>
                        <input
                          type="text"
                          value={settings.smtp_host || ""}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              smtp_host: e.target.value,
                            })
                          }
                          placeholder="smtp.sendgrid.net"
                          className={`w-full px-4 py-3 rounded-[var(--radius)] border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme text-left ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          {t("smtpPort")}
                        </label>
                        <input
                          type="text"
                          value={settings.smtp_port || ""}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              smtp_port: e.target.value,
                            })
                          }
                          placeholder="587"
                          className={`w-full px-4 py-3 rounded-[var(--radius)] border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme text-left ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
                          dir="ltr"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          {t("encryption")}
                        </label>
                        <select
                          value={settings.smtp_encryption || "tls"}
                          onChange={(e) =>
                            setSettings({
                               ...settings,
                               smtp_encryption: e.target.value,
                            })
                          }
                          className={`w-full px-4 py-3 rounded-[var(--radius)] border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
                        >
                          <option value="tls">{t("tls")}</option>
                          <option value="ssl">{t("ssl") || "SSL"}</option>
                          <option value="none">{t("none")}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          {t("smtpUsername") ||
                            (dir === "rtl"
                              ? "اسم مستخدم SMTP"
                              : "SMTP Username")}
                        </label>
                        <input
                          type="text"
                          value={settings.smtp_username || ""}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              smtp_username: e.target.value,
                            })
                          }
                          placeholder="apikey"
                          className={`w-full px-4 py-3 rounded-[var(--radius)] border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme text-left ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
                          dir="ltr"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        {t("smtpPassword") ||
                          (dir === "rtl" ? "كلمة سر SMTP" : "SMTP Password")}
                      </label>
                      <input
                        type="password"
                        value={settings.smtp_password || ""}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            smtp_password: e.target.value,
                          })
                        }
                        placeholder="••••••••••••••••"
                        className={`w-full px-4 py-3 rounded-[var(--radius)] border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme text-left ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
                        dir="ltr"
                      />
                    </div>
                  </>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[var(--border-main)] dark:border-[var(--border-main)]">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      {t("senderName")}
                    </label>
                    <input
                      type="text"
                      value={settings.sender_name || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          sender_name: e.target.value,
                        })
                      }
                      placeholder={
                        dir === "rtl" ? "اسم المنصة" : "Platform Name"
                      }
                      className={`w-full px-4 py-3 rounded-[var(--radius)] border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
                      dir={dir}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      {t("senderEmail")}
                    </label>
                    <input
                      type="email"
                      value={settings.sender_email || ""}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          sender_email: e.target.value,
                        })
                      }
                      placeholder="noreply@example.com"
                      className={`w-full px-4 py-3 rounded-[var(--radius)] border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme text-left ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-6">
                  <button
                    onClick={handleSaveSettings}
                    disabled={isSavingSettings}
                    className="flex-1 bg-accent hover:bg-accent text-white py-3.5 rounded-md font-bold transition-theme shadow-lg shadow-none disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSavingSettings ? (
                      <RefreshCw size={18} className="animate-spin" />
                    ) : (
                      <Save size={18} />
                    )}
                    {t("saveSettings")}
                  </button>
                  <button
                    onClick={handleTestConnection}
                    disabled={isTestingConnection}
                    className={`px-6 py-3.5 rounded-md font-bold transition-theme border flex items-center justify-center gap-2 disabled:opacity-50 ${theme === "dark" ? "border-[var(--border-main)] hover:bg-[var(--bg-secondary)] text-white" : "border-[var(--border-main)] hover:bg-[var(--bg-input)] text-gray-900"}`}
                  >
                    {isTestingConnection ? (
                      <RefreshCw size={18} className="animate-spin" />
                    ) : (
                      <RefreshCw size={18} />
                    )}
                    {t("testConnection")}
                  </button>
                </div>
              </form>
            </div>

            <div className="space-y-6">
              <div
                className={
                  theme === "dark"
                    ? "p-6 rounded-lg border bg-[#1a1a1c] border-[var(--border-main)]"
                    : "p-6 rounded-lg border bg-white border-[var(--border-main)]"
                }
              >
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <ShieldCheck className="text-accent" size={20} />
                  {t("securityProtocol")}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">
                  {t("securityProtocolDesc")}
                </p>
                <div className="p-4 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500 text-sm flex items-start gap-3">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <p>{t("spamWarning")}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "templates" && !selectedTemplate && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h2 className="text-xl font-bold">{t("emailTemplates")}</h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleImportDefaults}
                  disabled={isImportingDefaults}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md border transition-theme font-medium disabled:opacity-50 ${
                    theme === "dark"
                      ? "border-[var(--border-main)] text-gray-400 hover:text-white hover:bg-[var(--bg-secondary)]"
                      : "border-[var(--border-main)] text-gray-600 hover:bg-[var(--bg-input)]"
                  }`}
                >
                  <Download size={18} />
                  {dir === "rtl"
                    ? "جلب القوالب الافتراضية"
                    : "Fetch Default Templates"}
                </button>
                <button
                  onClick={() =>
                    setSelectedTemplate({
                      isNew: true,
                      type: "custom",
                      name: "",
                      subject_en: "",
                      subject_ar: "",
                      body_en: "",
                      body_ar: "",
                    })
                  }
                  className="flex items-center gap-2 bg-accent hover:bg-accent text-white px-4 py-2 rounded-md transition-theme font-medium shadow-[0_0_15px_rgba(156,163,175,0.4)]"
                >
                  <Plus size={18} />
                  {t("createNewTemplate")}
                </button>
              </div>
            </div>

            {isLoadingTemplates ? (
              <div className="flex justify-center py-12">
                <RefreshCw
                  className="animate-spin text-accent"
                  size={32}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((template, index) => (
                  <div
                    key={template.id || template.name || index}
                    className={`group p-6 rounded-lg border transition-theme hover:-translate-y-1 hover:shadow-xl cursor-pointer relative ${
                      theme === "dark"
                        ? "bg-[#111111] border-[var(--border-main)] hover:border-accent/30"
                        : "bg-white border-[var(--border-main)] hover:border-accent/30"
                    }`}
                    onClick={() => setSelectedTemplate(template)}
                  >
                    {template.type === "custom" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(template.id);
                        }}
                        className="absolute top-4 right-4 p-2 rounded-sm bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    <div className="flex justify-between items-start mb-4">
                      <div
                        className={`p-3 rounded-md ${template.type === "system" ? "bg-blue-500/10 text-blue-500" : "bg-purple-500/10 text-purple-500"}`}
                      >
                        <Mail size={24} />
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-sm text-xs font-medium ${template.type === "system" ? "bg-blue-500/10 text-blue-500" : "bg-purple-500/10 text-purple-500"}`}
                      >
                        {template.type === "system"
                          ? t("systemTemplates")
                          : t("customTemplates")}
                      </span>
                    </div>
                    <h3 className="font-bold text-lg mb-1">
                      {template.type === "system"
                        ? t(template.name)
                        : template.name}
                    </h3>
                    <p className="text-sm text-gray-500 mb-6 line-clamp-1">
                      {dir === "rtl"
                        ? template.subject_ar
                        : template.subject_en}
                    </p>

                    <div className="flex justify-between items-center pt-4 border-t border-[var(--border-main)] dark:border-[var(--border-main)]">
                      <span className="text-xs text-gray-400 flex items-center gap-1.5">
                        <Clock size={14} />
                        {new Date(template.updated_at).toLocaleDateString()}
                      </span>
                      <span className="text-sm font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        {t("editTemplate")}{" "}
                        <ArrowRight
                          size={16}
                          className={dir === "rtl" ? "rotate-180" : ""}
                        />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "templates" && selectedTemplate && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => setSelectedTemplate(null)}
                className={`p-2.5 rounded-md transition-theme flex items-center justify-center ${
                  theme === "dark"
                    ? "bg-[var(--bg-secondary)]/40 hover:bg-gray-700 text-gray-400 hover:text-white border border-[var(--border-main)]/50"
                    : "bg-white hover:bg-[var(--bg-secondary)] text-gray-500 hover:text-gray-900 border border-[var(--border-main)] shadow-sm"
                }`}
              >
                {dir === "rtl" ? (
                  <ArrowRight size={20} />
                ) : (
                  <ArrowLeft size={20} />
                )}
              </button>
              <h2 className="text-2xl font-bold">
                {selectedTemplate.isNew
                  ? t("createNewTemplate")
                  : selectedTemplate.type === "system"
                    ? t(selectedTemplate.name)
                    : selectedTemplate.name}
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div
                className={`lg:col-span-2 p-6 md:p-8 rounded-lg border ${theme === "dark" ? "bg-[#111111] border-[var(--border-main)]" : "bg-white border-[var(--border-main)]"}`}
              >
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      {t("templateName")}
                    </label>
                    <input
                      type="text"
                      value={selectedTemplate.name || ""}
                      onChange={(e) =>
                        setSelectedTemplate({
                          ...selectedTemplate,
                          name: e.target.value,
                        })
                      }
                      disabled={selectedTemplate.type === "system"}
                      className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white disabled:opacity-50" : "bg-[var(--bg-secondary)] border-[var(--border-main)] disabled:opacity-50"}`}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        {t("emailSubject")} (EN)
                      </label>
                      <input
                        type="text"
                        value={selectedTemplate.subject_en || ""}
                        onChange={(e) =>
                          setSelectedTemplate({
                            ...selectedTemplate,
                            subject_en: e.target.value,
                          })
                        }
                        className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        {t("emailSubject")} (AR)
                      </label>
                      <input
                        type="text"
                        value={selectedTemplate.subject_ar || ""}
                        onChange={(e) =>
                          setSelectedTemplate({
                            ...selectedTemplate,
                            subject_ar: e.target.value,
                          })
                        }
                        className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-white" : "bg-white border-[var(--border-main)]"}`}
                        dir="rtl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      {t("emailBody")} (EN - HTML/Text)
                    </label>
                    <textarea
                      rows={8}
                      value={selectedTemplate.body_en || ""}
                      onChange={(e) =>
                        setSelectedTemplate({
                          ...selectedTemplate,
                          body_en: e.target.value,
                        })
                      }
                      className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme font-mono text-sm ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-gray-300" : "bg-[var(--bg-secondary)] border-[var(--border-main)] text-gray-800"}`}
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      {t("emailBody")} (AR - HTML/Text)
                    </label>
                    <textarea
                      rows={8}
                      value={selectedTemplate.body_ar || ""}
                      onChange={(e) =>
                        setSelectedTemplate({
                          ...selectedTemplate,
                          body_ar: e.target.value,
                        })
                      }
                      className={`w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-accent-500/50 transition-theme font-mono text-sm ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)] text-gray-300" : "bg-[var(--bg-secondary)] border-[var(--border-main)] text-gray-800"}`}
                      dir="rtl"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleSaveTemplate}
                      disabled={isSavingTemplate}
                      className="flex-1 bg-accent hover:bg-accent text-white py-3.5 rounded-md font-bold transition-theme shadow-lg shadow-none disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSavingTemplate ? (
                        <RefreshCw size={18} className="animate-spin" />
                      ) : (
                        <Save size={18} />
                      )}
                      {t("saveChanges")}
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div
                  className={`p-6 rounded-lg border ${theme === "dark" ? "bg-[#1a1a1c] border-[var(--border-main)]" : "bg-[var(--bg-secondary)] border-[var(--border-main)]"}`}
                >
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Code2 className="text-accent" size={20} />
                    {t("variables")}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {t("clickToCopy")}
                  </p>

                  <div className="space-y-2">
                    {[
                      "{{userName}}",
                      "{{userEmail}}",
                      "{{actionUrl}}",
                      "{{planName}}",
                      "{{appName}}",
                    ].map((v) => (
                      <button
                        key={v}
                        onClick={() => navigator.clipboard.writeText(v)}
                        className={`w-full flex items-center justify-between p-3 rounded-md border transition-theme hover:border-accent/50 ${theme === "dark" ? "bg-[#111111] border-[var(--border-main)]" : "bg-white border-[var(--border-main)]"}`}
                      >
                        <span className="font-mono text-sm text-accent">
                          {v}
                        </span>
                        <Copy size={14} className="text-gray-400" />
                      </button>
                    ))}
                  </div>

                  <div className="mt-8 pt-6 border-t border-[var(--border-main)] dark:border-[var(--border-main)]">
                    <h4 className="font-bold mb-2 text-sm">
                      Professional Footer
                    </h4>
                    <p className="text-xs text-gray-500 mb-4">
                      The system automatically appends the{" "}
                      {(language === "ar"
                        ? siteSettings.siteNameAr
                        : siteSettings.siteName) || t("appName")}{" "}
                      signature, support email, and website link to all outgoing
                      emails.
                    </p>
                    <div
                      className={`p-4 rounded-md text-xs ${theme === "dark" ? "bg-[#111111] text-gray-400" : "bg-white text-gray-500"}`}
                    >
                      <p>--</p>
                      <p className="font-bold text-accent">
                        {(language === "ar"
                          ? siteSettings.siteNameAr
                          : siteSettings.siteName) || t("appName")}{" "}
                        Team
                      </p>
                      <p>Support: support@example.com</p>
                      <p>example.com</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
