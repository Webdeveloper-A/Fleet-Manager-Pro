import { usePreferences, type Language } from "@/lib/preferences";

const translations = {
  uz: {
    appName: "Fleet Docs",
    appSubtitle: "Operatsion boshqaruv",

    dashboard: "Boshqaruv paneli",
    vehicles: "Transportlar",
    documents: "Hujjatlar",
    companies: "Kompaniyalar",
    callBot: "Call Bot",

    adminConsole: "Admin panel",
    platformAdministrator: "Platforma administratori",
    vehicleDocumentManagement: "Transport va hujjat boshqaruvi",

    notifications: "Bildirishnomalar",
    notificationsDescription: "Transport hujjatlari muddati bo‘yicha ogohlantirishlar",
    noNotifications: "Hozircha bildirishnoma yo‘q",
    expired: "Muddati o‘tgan",
    expiring: "Muddati yaqin",

    profile: "Profil",
    language: "Til",
    theme: "Rejim",
    light: "Light",
    dark: "Dark",
    system: "System",
    signOut: "Chiqish",
    signedInAs: "Kirish qilingan",

    profileSettings: "Profil sozlamalari",
    profileSettingsHint: "Profil nomi, email va parolni tahrirlash keyingi bosqichda qo‘shiladi.",
    openCallBot: "Call Botni ochish",

    callBotTitle: "Call Center Bot",
    callBotDescription: "Platformadan foydalanish bo‘yicha tezkor yordamchi.",
    callBotIntro:
      "Bu bo‘lim hozir frontend yordamchi sifatida ishlaydi. Keyingi bosqichda operator bilan chat, support history va Telegram bilan bog‘lash qo‘shiladi.",
    quickHelp: "Tezkor yordam",
    helpDocuments: "Hujjat qo‘shish",
    helpDocumentsText: "Documents sahifasiga kiring, Add document tugmasini bosing va kerakli ma’lumotlarni kiriting.",
    helpUpload: "Fayl yuklash",
    helpUploadText: "PDF, JPG, PNG yoki WEBP faylni hujjat formasida tanlang.",
    helpTelegram: "Telegram xabar",
    helpTelegramText: "Dashboard sahifasida Telegram Test yoki Send Expiry Alerts tugmasini bosing.",
    helpReports: "Excel hisobot",
    helpReportsText: "Documents sahifasida Expiring Excel yoki Expired Excel tugmasidan foydalaning.",
  },

  ru: {
    appName: "Fleet Docs",
    appSubtitle: "Операционная панель",

    dashboard: "Панель",
    vehicles: "Транспорт",
    documents: "Документы",
    companies: "Компании",
    callBot: "Call Bot",

    adminConsole: "Админ-панель",
    platformAdministrator: "Администратор платформы",
    vehicleDocumentManagement: "Управление транспортом и документами",

    notifications: "Уведомления",
    notificationsDescription: "Оповещения о сроках документов транспорта",
    noNotifications: "Пока нет уведомлений",
    expired: "Истекло",
    expiring: "Скоро истекает",

    profile: "Профиль",
    language: "Язык",
    theme: "Тема",
    light: "Светлая",
    dark: "Темная",
    system: "Системная",
    signOut: "Выйти",
    signedInAs: "Вы вошли как",

    profileSettings: "Настройки профиля",
    profileSettingsHint: "Редактирование имени, email и пароля будет добавлено на следующем этапе.",
    openCallBot: "Открыть Call Bot",

    callBotTitle: "Call Center Bot",
    callBotDescription: "Быстрый помощник по работе с платформой.",
    callBotIntro:
      "Сейчас этот раздел работает как frontend-помощник. Позже добавим чат с оператором, историю обращений и Telegram-интеграцию.",
    quickHelp: "Быстрая помощь",
    helpDocuments: "Добавить документ",
    helpDocumentsText: "Откройте Documents, нажмите Add document и заполните данные.",
    helpUpload: "Загрузить файл",
    helpUploadText: "Выберите PDF, JPG, PNG или WEBP файл в форме документа.",
    helpTelegram: "Telegram-уведомление",
    helpTelegramText: "На Dashboard нажмите Telegram Test или Send Expiry Alerts.",
    helpReports: "Excel-отчет",
    helpReportsText: "На странице Documents используйте Expiring Excel или Expired Excel.",
  },

  en: {
    appName: "Fleet Docs",
    appSubtitle: "Operations cockpit",

    dashboard: "Dashboard",
    vehicles: "Vehicles",
    documents: "Documents",
    companies: "Companies",
    callBot: "Call Bot",

    adminConsole: "Admin Console",
    platformAdministrator: "Platform administrator",
    vehicleDocumentManagement: "Vehicle & document management",

    notifications: "Notifications",
    notificationsDescription: "Document expiry alerts for your fleet",
    noNotifications: "No notifications yet",
    expired: "Expired",
    expiring: "Expiring",

    profile: "Profile",
    language: "Language",
    theme: "Theme",
    light: "Light",
    dark: "Dark",
    system: "System",
    signOut: "Sign out",
    signedInAs: "Signed in as",

    profileSettings: "Profile settings",
    profileSettingsHint: "Editing profile name, email and password will be added in the next stage.",
    openCallBot: "Open Call Bot",

    callBotTitle: "Call Center Bot",
    callBotDescription: "Quick assistant for using the platform.",
    callBotIntro:
      "This section currently works as a frontend helper. Operator chat, support history and Telegram integration will be added later.",
    quickHelp: "Quick help",
    helpDocuments: "Add document",
    helpDocumentsText: "Go to Documents, click Add document and fill in the required fields.",
    helpUpload: "Upload file",
    helpUploadText: "Choose a PDF, JPG, PNG or WEBP file in the document form.",
    helpTelegram: "Telegram alert",
    helpTelegramText: "On Dashboard, click Telegram Test or Send Expiry Alerts.",
    helpReports: "Excel report",
    helpReportsText: "On the Documents page, use Expiring Excel or Expired Excel.",
  },
} satisfies Record<Language, Record<string, string>>;

export type TranslationKey = keyof typeof translations.uz;

export function translate(language: Language, key: TranslationKey) {
  return translations[language][key] ?? translations.en[key] ?? key;
}

export function useT() {
  const language = usePreferences((s) => s.language);

  return (key: TranslationKey) => translate(language, key);
}